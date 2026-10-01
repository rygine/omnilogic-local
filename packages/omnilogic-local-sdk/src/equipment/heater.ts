import { HEATER_MODE } from "@/constants/labels";
import { Device } from "@/equipment/device";
import { HeaterAppliance } from "@/equipment/heaterAppliance";
import { OmniLogicError, OmniValidationError } from "@/utils/errors";

// Heat, Cool, and Auto
const VALID_MODES = [0, 1, 2];

// the body's thermostat
export class Heater extends Device {
  get state() {
    return this.telemetry(this.omni.telemetry.virtualHeaters);
  }

  get #runningState() {
    this.requireRunning();
    return this.state;
  }

  get #config() {
    return this.configured(this.bodyConfig?.heater);
  }

  // every heat source this body can call on, in the controller's order
  get appliances() {
    return this.#config.operations
      .flatMap((o) => o.heaterEquipment ?? [])
      .map((e) => new HeaterAppliance(this.omni, this.poolId, e));
  }

  // what the first heat source is doing
  get applianceState() {
    return this.appliances[0]?.status ?? "Off";
  }

  get setPoint() {
    return this.#runningState.currentSetPoint;
  }

  // every controller reports one, fitted with solar or not
  get solarSetPoint() {
    return this.#runningState.solarSetPoint;
  }

  // the lowest set point the controller accepts
  get minSetPoint() {
    return this.#config.minSettableWaterTemp;
  }

  // the highest set point the controller accepts
  get maxSetPoint() {
    return this.#config.maxSettableWaterTemp;
  }

  setSetPoint(degrees: number) {
    const { minSetPoint: min, maxSetPoint: max } = this;
    if (degrees < min || degrees > max) {
      throw new OmniValidationError(
        `Set point ${degrees} is not between ${min} and ${max}`,
      );
    }
    return this.omni.command("SetUIHeaterCmd", {
      poolId: this.poolId,
      equipmentId: this.equipmentId,
      data: degrees,
    });
  }

  setSolarSetPoint(degrees: number) {
    const { minSetPoint: min, maxSetPoint: max } = this;
    if (degrees < min || degrees > max) {
      throw new OmniValidationError(
        `Solar set point ${degrees} is not between ${min} and ${max}`,
      );
    }
    return this.omni.command("SetUISolarSetPointCmd", {
      poolId: this.poolId,
      equipmentId: this.equipmentId,
      data: degrees,
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

  get mode() {
    return HEATER_MODE[this.#runningState.mode] ?? "Unknown";
  }

  setMode(mode: number) {
    if (!VALID_MODES.includes(mode)) {
      throw new OmniValidationError(
        `Heater mode ${mode} is not one of ${VALID_MODES.map((code) => `${code} (${HEATER_MODE[code]})`).join(", ")}`,
      );
    }
    return this.omni.command("SetUIHeaterModeCmd", {
      poolId: this.poolId,
      equipmentId: this.equipmentId,
      data: mode,
    });
  }

  get silentMode() {
    return this.#runningState.silentMode !== 0;
  }

  setSilentMode(on: boolean) {
    return this.omni.command("SetHeaterSilentMode", {
      poolId: this.poolId,
      equipmentId: this.equipmentId,
      data: Number(on),
    });
  }

  get cooldown() {
    return this.#config.cooldownEnabled;
  }

  setCooldown(on: boolean) {
    return this.omni.command("SetHeaterCoolDown", {
      poolId: this.poolId,
      equipmentId: this.equipmentId,
      data: Number(on),
    });
  }

  get extend() {
    return this.#config.extendEnabled;
  }

  setExtend(on: boolean) {
    return this.omni.command("SetHeaterExtend", {
      poolId: this.poolId,
      equipmentId: this.equipmentId,
      data: Number(on),
    });
  }

  async autoDifferential() {
    const r = await this.omni.command("GetHeaterAutoDifferential", {
      poolId: this.poolId,
      equipmentId: this.equipmentId,
    });
    return r.data;
  }

  setAutoDifferential(degrees: number) {
    if (degrees < 2 || degrees > 10) {
      throw new OmniValidationError(
        `Auto-differential ${degrees} is not between 2 and 10`,
      );
    }
    return this.omni.command("SetHeaterAutoDifferential", {
      poolId: this.poolId,
      equipmentId: this.equipmentId,
      data: degrees,
    });
  }

  #first() {
    const first = this.appliances[0];
    if (first === undefined) {
      throw new OmniLogicError(`No heat source configured for "${this.name}"`);
    }
    return first;
  }

  get allowLowSpeed() {
    return this.#first().allowLowSpeed;
  }

  setAllowLowSpeed(on: boolean) {
    return this.#first().setAllowLowSpeed(on);
  }

  get lowSpeed() {
    return this.#first().lowSpeed;
  }

  setLowSpeed(value: number) {
    return this.#first().setLowSpeed(value);
  }
}
