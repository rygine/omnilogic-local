import { setTimeout } from "node:timers/promises";

import type { CommandOptions } from "@/client/omnilogic";
import { LIGHT_BRIGHTNESS, LIGHT_SPEED } from "@/constants/labels";
import {
  ColorLogicPowerState,
  getAvailableShows,
  isLightLit,
  powerStateName,
} from "@/constants/lightShows";
import { Device } from "@/equipment/device";
import { timerParams } from "@/utils/command";
import {
  OmniLogicError,
  OmniTimeoutError,
  OmniValidationError,
  ReadingUnavailableError,
} from "@/utils/errors";
import { findBySystemId, stringOf } from "@/utils/helpers";
import { createLogger } from "@/utils/logger";

const equipmentLog = createLogger("equipment");

export type LightWriteOptions = Pick<
  CommandOptions,
  "attempts" | "force" | "pollMs" | "timeoutMs"
> & {
  // "1/16x" to "16x", default the current speed
  speed?: string;
  // 20 to 100 in steps of 20, default the current brightness
  brightness?: number;
  // default true, false throws on a light mid-transition instead of waiting
  wait?: boolean;
};

const encodeShow = (show: number, speed: string, brightness: number) => {
  const speedCode = Object.entries(LIGHT_SPEED).find(
    ([, label]) => label === speed,
  )?.[0];
  if (speedCode === undefined) {
    throw new OmniValidationError(
      `light speed "${speed}" is not one of ${Object.values(LIGHT_SPEED).join(", ")}`,
    );
  }
  const brightnessCode = Object.entries(LIGHT_BRIGHTNESS).find(
    ([, percent]) => percent === brightness,
  )?.[0];
  if (brightnessCode === undefined) {
    throw new OmniValidationError(
      `light brightness ${brightness} is not one of ${Object.values(LIGHT_BRIGHTNESS).join(", ")}`,
    );
  }
  return {
    data: show,
    field19: Number(speedCode),
    field1a: Number(brightnessCode),
    field1b: 0,
  };
};

// the wait between telemetry reads
const DEFAULT_POLL_MS = 4000;
// the longest wait for a show change to register after the send
const DEFAULT_VERIFY_MS = 30000;
// the longest wait for a light to reach OFF or ACTIVE
const SETTLE_MS = 60000;

const verifyOptions = (
  options: LightWriteOptions,
  verify: () => boolean,
  failure: string,
) => ({
  verify,
  timeoutMs: options.timeoutMs ?? DEFAULT_VERIFY_MS,
  pollMs: options.pollMs ?? DEFAULT_POLL_MS,
  attempts: options.attempts,
  force: options.force,
  failure,
});

export class Light extends Device {
  // undefined when telemetry has no row for this light
  get state() {
    return this.omni.telemetry.colorLogicLights.find(
      (l) => l.systemId === this.equipmentId,
    );
  }

  get #reported() {
    return this.running ? this.state : undefined;
  }

  get #config() {
    const light = findBySystemId(this.omni.config, this.equipmentId);
    return {
      type: stringOf(light?.type) ?? "",
      v2Active: light?.v2Active === true,
    };
  }

  get omniDirect() {
    return this.#config.v2Active;
  }

  get shows() {
    const { type, v2Active } = this.#config;
    return getAvailableShows(type, v2Active);
  }

  #readOr<T>(read: () => T | undefined, fallback: T) {
    try {
      const value = read();
      return value === undefined || value === "Unknown" ? fallback : value;
    } catch (error) {
      if (error instanceof ReadingUnavailableError) {
        return fallback;
      }
      throw error;
    }
  }

  get powerState() {
    const row = this.#reported;
    return row === undefined ? "OFF" : powerStateName(row.lightState);
  }

  get show() {
    this.requireRunning();
    const current = this.state?.currentShow;
    return this.shows.find((s) => s.value === current)?.name ?? "Unknown";
  }

  get speed() {
    this.requireRunning();
    const row = this.state;
    return row === undefined
      ? "Unknown"
      : (LIGHT_SPEED[row.speed] ?? "Unknown");
  }

  get brightness() {
    this.requireRunning();
    const row = this.state;
    return row === undefined ? undefined : LIGHT_BRIGHTNESS[row.brightness];
  }

  get isOn() {
    const row = this.#reported;
    return row !== undefined && isLightLit(row.lightState);
  }

  #requireOmniDirect(options: Pick<LightWriteOptions, "speed" | "brightness">) {
    if (
      (options.speed !== undefined || options.brightness !== undefined) &&
      !this.omniDirect
    ) {
      throw new OmniValidationError(
        `"${this.name}" is not in OmniDirect mode, so it does not support speed or brightness`,
      );
    }
  }

  showParams(
    show: number,
    options: Pick<LightWriteOptions, "speed" | "brightness"> = {},
  ) {
    this.#requireOmniDirect(options);
    if (!this.omniDirect) {
      return { data: show, field19: 0, field1a: 0, field1b: 0 };
    }
    return encodeShow(
      show,
      options.speed ?? this.#readOr(() => this.speed, "1x"),
      options.brightness ?? this.#readOr(() => this.brightness, 100),
    );
  }

  async setShow(show: number, options: LightWriteOptions = {}) {
    this.#requireOmniDirect(options);
    await this.#waitUntilStable(`show ${show}`, options);
    if (!options.force && !this.shows.some((s) => s.value === show)) {
      throw new OmniValidationError(
        `"${this.name}" has no show ${show}; its shows are 0 to ${Math.max(...this.shows.map((s) => s.value))}`,
      );
    }
    await this.omni.command(
      "SetStandAloneLightShow",
      {
        poolId: this.poolId,
        equipmentId: this.equipmentId,
        ...this.showParams(show, options),
        ...timerParams(),
      },
      verifyOptions(
        options,
        () =>
          this.state?.currentShow === show &&
          (options.speed === undefined ||
            this.#readOr(() => this.speed, "") === options.speed) &&
          (options.brightness === undefined ||
            this.#readOr(() => this.brightness, -1) === options.brightness),
        `Unable to set "${this.name}" to show ${show}`,
      ),
    );
  }

  on(options: LightWriteOptions = {}) {
    return this.#setPower(true, options);
  }

  off(options: LightWriteOptions = {}) {
    return this.#setPower(false, options);
  }

  async #setPower(on: boolean, options: LightWriteOptions) {
    await this.#waitUntilStable(on ? "power on" : "power off", options);
    await this.omni.command(
      "SetUIEquipmentCmd",
      {
        poolId: this.poolId,
        equipmentId: this.equipmentId,
        isOn: Number(on),
        ...timerParams(),
      },
      verifyOptions(
        options,
        // any move away from the old state counts
        () => {
          const row = this.state;
          return (
            row !== undefined &&
            row.lightState !==
              (on ? ColorLogicPowerState.OFF : ColorLogicPowerState.ACTIVE)
          );
        },
        `Unable to turn "${this.name}" ${on ? "on" : "off"}`,
      ),
    );
  }

  async #waitUntilStable(action: string, options: LightWriteOptions) {
    const { wait = true, pollMs = DEFAULT_POLL_MS } = options;
    await this.omni.refresh({ refetch: true, force: options.force });
    if (this.state === undefined) {
      if (options.force) {
        return;
      }
      throw new OmniLogicError(
        `The controller reports no telemetry for "${this.name}"; pass { force: true } to send anyway`,
      );
    }
    if (this.#isStable()) {
      equipmentLog.trace("light is stable", {
        light: this.name,
        state: powerStateName(this.state?.lightState),
      });
      return;
    }
    if (!wait) {
      throw new OmniValidationError(
        `"${this.name}" is transitioning ` +
          `(${powerStateName(this.state?.lightState)}); ${action} would be silently ignored`,
      );
    }
    equipmentLog.debug("light is transitioning; waiting for a stable state", {
      light: this.name,
      state: powerStateName(this.state?.lightState),
      action,
      pollMs,
      settleTimeoutMs: SETTLE_MS,
    });
    const started = Date.now();
    const deadline = started + SETTLE_MS;
    while (Date.now() < deadline) {
      await setTimeout(pollMs);
      await this.omni
        .refresh({ refetch: true, force: options.force })
        .catch((error: unknown) => {
          equipmentLog.trace("refresh failed while waiting for the light", {
            light: this.name,
            error,
          });
        });
      if (this.#isStable()) {
        equipmentLog.debug("light settled", {
          light: this.name,
          state: powerStateName(this.state?.lightState),
          ms: Date.now() - started,
        });
        return;
      }
      equipmentLog.trace("light still transitioning", {
        light: this.name,
        state: powerStateName(this.state?.lightState),
        ms: Date.now() - started,
      });
    }
    throw new OmniTimeoutError(
      `Timed out waiting for "${this.name}" to settle`,
    );
  }

  #isStable() {
    const s = this.state?.lightState;
    return s === ColorLogicPowerState.OFF || s === ColorLogicPowerState.ACTIVE;
  }
}
