import type { OmniLogic } from "@/client/omnilogic";
import { isRunning } from "@/constants/labels";
import { WATER_TEMP_UNAVAILABLE } from "@/constants/sentinels";
import { Chlorinator } from "@/equipment/chlorinator";
import { CSAD } from "@/equipment/csad";
import { Filter } from "@/equipment/filter";
import { Heater } from "@/equipment/heater";
import { Light } from "@/equipment/light";
import { Pump } from "@/equipment/pump";
import { Relay } from "@/equipment/relay";
import type { BodyOfWater as BodyOfWaterConfig } from "@/types/config";
import { OmniLogicError } from "@/utils/errors";
import { hasSystemId } from "@/utils/inventory";

export class BodyOfWater {
  #systemId: number;
  #name: string;
  #type: string;
  #filter?: Filter;
  #pumps: Pump[];
  #heater?: Heater;
  #chlorinator?: Chlorinator;
  #csad?: CSAD;
  #lights: Light[];
  #relays: Relay[];
  #omni: OmniLogic;

  get systemId() {
    return this.#systemId;
  }

  get name() {
    return this.#name;
  }

  get type() {
    return this.#type;
  }

  get #config() {
    const found = this.#omni.config.backyard.bodiesOfWater.find(
      (b) => b.systemId === this.systemId,
    );
    if (found === undefined) {
      throw new OmniLogicError(`No configuration for "${this.name}"`);
    }
    return found;
  }

  get spilloverEnabled() {
    return this.#config.supportsSpillover;
  }

  get filter() {
    return this.#filter;
  }

  // every pump on the body, the filter pump first when there is one
  get pumps() {
    return [...this.#pumps];
  }

  get heater() {
    return this.#heater;
  }

  get chlorinator() {
    return this.#chlorinator;
  }

  get csad() {
    return this.#csad;
  }

  get lights() {
    return [...this.#lights];
  }

  get relays() {
    return [...this.#relays];
  }

  constructor(omni: OmniLogic, config: BodyOfWaterConfig) {
    const poolId = config.systemId;
    this.#omni = omni;
    this.#systemId = poolId;
    this.#name = config.name;
    this.#type = config.type;

    this.#filter = hasSystemId(config.filter)
      ? new Filter(omni, poolId, config.filter)
      : undefined;
    this.#pumps = [
      ...(this.#filter === undefined ? [] : [this.#filter]),
      ...config.pumps.map((p) => new Pump(omni, poolId, p)),
    ];
    this.#heater = hasSystemId(config.heater)
      ? new Heater(
          omni,
          poolId,
          config.heater.systemId,
          `${config.name} Heater`,
        )
      : undefined;
    this.#chlorinator = hasSystemId(config.chlorinator)
      ? new Chlorinator(
          omni,
          poolId,
          config.chlorinator.systemId,
          config.chlorinator.name,
        )
      : undefined;
    this.#csad = hasSystemId(config.csad)
      ? new CSAD(omni, poolId, config.csad)
      : undefined;
    this.#lights = config.colorLogicLights.map(
      (l) => new Light(omni, poolId, l.systemId, l.name),
    );
    this.#relays = config.relays.map((r) => new Relay(omni, poolId, r));
  }

  get state() {
    const row = this.#omni.telemetry.bodiesOfWater.find(
      (b) => b.systemId === this.systemId,
    );
    if (row === undefined) {
      throw new OmniLogicError(`No telemetry for "${this.name}"`);
    }
    return row;
  }

  get #reportedFilter() {
    const filter = this.filter;
    return filter !== undefined &&
      this.#omni.telemetry.filters.some(
        (r) => r.systemId === filter.equipmentId,
      )
      ? filter
      : undefined;
  }

  get waterTemp() {
    if (!isRunning(this.#omni.telemetry.backyard.state)) {
      return undefined;
    }
    const temp = this.state.waterTemp;
    return temp === WATER_TEMP_UNAVAILABLE ? undefined : temp;
  }

  get spilloverOn() {
    const filter = this.#reportedFilter;
    return (
      filter !== undefined && filter.running && filter.state.valvePosition === 3 // Spillover
    );
  }

  get spilloverOnCountdown() {
    const filter = this.#reportedFilter;
    return (
      filter !== undefined &&
      filter.running &&
      filter.state.whyFilterIsOn === 17 // Spillover Countdown Timer
    );
  }

  setSpilloverEnabled(on: boolean) {
    return this.#omni.command("SetSpaSpilloverEnable", {
      poolId: this.systemId,
      data: Number(on),
    });
  }
}
