import type { OmniLogic } from "@/client/omnilogic";
import { CSAD_MODE } from "@/constants/labels";
import { ORP_UNAVAILABLE, PH_UNAVAILABLE } from "@/constants/sentinels";
import { Device } from "@/equipment/device";
import type { CSAD as CSADConfig } from "@/types/config";
import { OmniValidationError } from "@/utils/errors";

type Scale = { min: number; max: number; step: number };

// the scales the controller accepts
const PH_SCALE: Scale = { min: 7, max: 8, step: 0.1 };
const ORP_SCALE: Scale = { min: 400, max: 900, step: 5 };

const onScale = (value: number, { min, max, step }: Scale, what: string) => {
  const steps = Math.round((value - min) / step);
  if (value < min || value > max || min + steps * step !== value) {
    throw new OmniValidationError(
      `${what} ${value} is not between ${min} and ${max} in steps of ${step}`,
    );
  }
  return value;
};

// chemistry sense and dispense
export class CSAD extends Device {
  constructor(omni: OmniLogic, poolId: number, config: CSADConfig) {
    super(omni, poolId, config.systemId, config.name);
  }

  get #config() {
    return this.configured(this.bodyConfig?.csad);
  }

  // what reduces the pH: ACID or CO2
  get type() {
    return this.#config.type;
  }

  get enabled() {
    return this.#config.enabled;
  }

  get phTarget() {
    return Number(this.#config.targetValue);
  }

  // the offset between the tested and the displayed reading
  get phCalibration() {
    return Number(this.#config.calibrationValue);
  }

  get phLowAlarm() {
    return Number(this.#config.phLowAlarmLevel);
  }

  get phHighAlarm() {
    return Number(this.#config.phHighAlarmLevel);
  }

  get orpTarget() {
    return this.#config.orpTargetLevel;
  }

  get orpLowAlarm() {
    return this.#config.orpLowAlarmLevel;
  }

  get orpHighAlarm() {
    return this.#config.orpHighAlarmLevel;
  }

  get state() {
    return this.telemetry(this.omni.telemetry.csads);
  }

  get #reported() {
    return this.reportedIn(this.omni.telemetry.csads);
  }

  // without the calibration offset applied
  get ph() {
    if (!this.#reported) {
      return undefined;
    }
    const ph = Number(this.state.ph);
    return ph === PH_UNAVAILABLE ? undefined : ph;
  }

  get orp() {
    if (!this.#reported) {
      return undefined;
    }
    const orp = this.state.orp;
    return orp === ORP_UNAVAILABLE ? undefined : orp;
  }

  get mode() {
    return this.#reported ? (CSAD_MODE[this.state.mode] ?? "Unknown") : "Off";
  }

  get isDispensing() {
    return this.#reported && this.state.status === 1;
  }

  setPhTarget(ph: number) {
    return this.omni.command("UISetCSADTargetValue", {
      poolId: this.poolId,
      equipmentId: this.equipmentId,
      targetValue: onScale(ph, PH_SCALE, "pH"),
    });
  }

  setOrpTarget(millivolts: number) {
    return this.omni.command("SetUICSADORPTargetLevel", {
      poolId: this.poolId,
      equipmentId: this.equipmentId,
      data: onScale(millivolts, ORP_SCALE, "ORP"),
    });
  }
}
