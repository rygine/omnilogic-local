import type { OmniLogic } from "@/client/omnilogic";
import { PUMP_STATE, PUMP_WHY_ON } from "@/constants/labels";
import { Device } from "@/equipment/device";
import { timerParams } from "@/utils/command";
import { OmniLogicError } from "@/utils/errors";
import { pumpSpeedType } from "@/utils/inventory";

type PumpConfig = {
  systemId: number;
  name: string;
  type: string;
  function?: string;
};

export class Pump extends Device {
  #type: string;
  #function: string | undefined;

  constructor(omni: OmniLogic, poolId: number, config: PumpConfig) {
    super(omni, poolId, config.systemId, config.name);
    this.#type = config.type;
    this.#function = config.function;
  }

  // the speeds it can run, e.g. PMP_VARIABLE_SPEED_PUMP
  get type() {
    return this.#type;
  }

  get function() {
    return this.#function;
  }

  get #rows() {
    const t = this.omni.telemetry;
    return [...t.pumps, ...t.filters];
  }

  get state() {
    return this.telemetry(this.#rows);
  }

  get reported() {
    return this.reportedIn(this.#rows);
  }

  get states() {
    return PUMP_STATE;
  }

  get reasons() {
    return PUMP_WHY_ON;
  }

  get countdownReason() {
    return 9;
  }

  get #reading() {
    const row = this.state;
    return "pumpState" in row
      ? { speed: row.pumpSpeed, position: row.pumpState, whyOn: row.whyOn }
      : {
          speed: row.filterSpeed,
          position: row.filterState,
          whyOn: row.whyFilterIsOn,
        };
  }

  get speed() {
    return this.reported ? this.#reading.speed : 0;
  }

  get isOn() {
    return this.reported && this.#reading.position !== 0;
  }

  get isRunning() {
    return this.speed > 0;
  }

  get lastSpeed() {
    return (
      this.#rows.find((r) => r.systemId === this.equipmentId)?.lastSpeed ?? 0
    );
  }

  get status() {
    const position = this.reported ? this.#reading.position : 0;
    return this.states[position] ?? "Unknown";
  }

  get whyOn() {
    const code = this.reported ? this.#reading.whyOn : 0;
    return this.reasons[code] ?? "Unknown";
  }

  get onCountdown() {
    return this.reported && this.#reading.whyOn === this.countdownReason;
  }

  get #configRow() {
    const body = this.bodyConfig;
    return [body?.filter, ...(body?.pumps ?? [])].find(
      (r) => r?.systemId === this.equipmentId,
    );
  }

  get minSpeed() {
    return this.configured(this.#configRow).minPumpSpeed;
  }

  get maxSpeed() {
    return this.configured(this.#configRow).maxPumpSpeed;
  }

  get speedType() {
    return pumpSpeedType(this.type);
  }

  // the speeds of the Low, Medium, and High presets
  get presets() {
    if (this.speedType !== "variable") {
      return undefined;
    }
    const row = this.configured(this.#configRow);
    return {
      low: row.vspLowPumpSpeed,
      medium: row.vspMediumPumpSpeed,
      high: row.vspHighPumpSpeed,
    };
  }

  get maxRpm() {
    const max = this.#configRow?.maxPumpRpm ?? 0;
    return max > 0 ? max : undefined;
  }

  get rpm() {
    return this.toRpm(this.speed);
  }

  toRpm(percent: number) {
    const max = this.maxRpm;
    return max === undefined
      ? undefined
      : Math.round((percent * max) / 1000) * 10;
  }

  fromRpm(rpm: number) {
    const max = this.maxRpm;
    if (max === undefined) {
      throw new OmniLogicError(`"${this.name}" has no top speed in RPM`);
    }
    return Math.min(100, Math.max(0, Math.round((rpm * 100) / max)));
  }

  // set the pump speed, 0 for off
  setSpeed(value: number) {
    return this.omni.command("SetUIEquipmentCmd", {
      poolId: this.poolId,
      equipmentId: this.equipmentId,
      isOn: value,
      ...timerParams(),
    });
  }
}
