import type { OmniLogic } from "@/client/omnilogic";
import { HEATER_PRIORITY, HEATER_STATE } from "@/constants/labels";
import { HEATER_TEMP_UNAVAILABLE } from "@/constants/sentinels";
import { Device } from "@/equipment/device";
import type { HeaterEquipment } from "@/types/config";
import { OmniValidationError } from "@/utils/errors";

// the priority that puts a solar loop ahead of every other source
const SOLAR_FIRST = 254;

// one heat source under a body's thermostat
export class HeaterAppliance extends Device {
  constructor(omni: OmniLogic, poolId: number, config: HeaterEquipment) {
    super(omni, poolId, config.systemId, config.name);
  }

  get #config() {
    return this.configured(
      this.bodyConfig?.heater?.operations
        .flatMap((o) => o.heaterEquipment ?? [])
        .find((e) => e.systemId === this.equipmentId),
    );
  }

  // HTR_GAS, HTR_SOLAR, HTR_HEAT_PUMP…
  get type() {
    return this.#config.heaterType;
  }

  // the other body's record for the same unit, -1 when it is not shared
  get sharedWith() {
    return this.#config.sharedEquipmentSystemId;
  }

  get state() {
    return this.telemetry(this.omni.telemetry.heaters);
  }

  get #reported() {
    return this.reportedIn(this.omni.telemetry.heaters);
  }

  get #runningState() {
    this.requireRunning();
    return this.state;
  }

  get status() {
    return this.#reported
      ? (HEATER_STATE[this.state.heaterState] ?? "Unknown")
      : "Off";
  }

  get isOn() {
    return this.#reported && this.state.heaterState === 1;
  }

  get temp() {
    if (!this.#reported) {
      return undefined;
    }
    const temp = this.state.temp;
    return temp === HEATER_TEMP_UNAVAILABLE ? undefined : temp;
  }

  get supportsCooling() {
    return this.#config.supportsCooling;
  }

  // the slowest the filter pump may run while this one heats
  get lowSpeed() {
    return this.#config.minSpeedForOperation;
  }

  setLowSpeed(value: number) {
    const filter = this.bodyConfig?.filter;
    if (filter === undefined) {
      throw new OmniValidationError(
        `"${this.name}" has no filter pump to take a low speed from`,
      );
    }
    const { minPumpSpeed: min, maxPumpSpeed: max } = filter;
    if (value < min || value > max) {
      throw new OmniValidationError(
        `Low speed ${value} is not between ${min} and ${max}`,
      );
    }
    return this.omni.command("SetHeaterLowSpeed", {
      poolId: this.poolId,
      equipmentId: this.equipmentId,
      data: value,
    });
  }

  // whether the filter pump may run slow while this one heats
  get allowLowSpeed() {
    return this.#config.allowLowSpeedOperation;
  }

  setAllowLowSpeed(on: boolean) {
    return this.omni.command("SetHeaterAllowedLowSpeed", {
      poolId: this.poolId,
      equipmentId: this.equipmentId,
      data: Number(on),
    });
  }

  get enabled() {
    return this.#runningState.enable !== 0;
  }

  setEnabled(on: boolean) {
    return this.omni.command("SetHeaterEnable", {
      poolId: this.poolId,
      equipmentId: this.equipmentId,
      data: Number(on),
    });
  }

  // its rank against the body's other heat sources
  get priority() {
    return HEATER_PRIORITY[this.#runningState.priority] ?? "Unknown";
  }

  setPriority(rank: number) {
    if (HEATER_PRIORITY[rank] === undefined) {
      throw new OmniValidationError(
        `Heater priority ${rank} is not one of ${Object.keys(HEATER_PRIORITY).join(", ")}`,
      );
    }
    if (rank === SOLAR_FIRST && this.type !== "HTR_SOLAR") {
      throw new OmniValidationError(
        `Only a solar loop takes priority ${SOLAR_FIRST}; "${this.name}" is ${this.type}`,
      );
    }
    return this.omni.command("SetUIHeaterPriorityCmd", {
      poolId: this.poolId,
      equipmentId: this.equipmentId,
      data: rank,
    });
  }

  // hours this source keeps priority, 0 shares it, 24 keeps it while it can run
  get maintainFor() {
    return this.#runningState.maintainFor;
  }
}
