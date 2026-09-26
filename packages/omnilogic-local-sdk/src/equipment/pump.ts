import type { OmniLogic } from "@/client/omnilogic";
import { PUMP_STATE, PUMP_WHY_ON } from "@/constants/labels";
import { Device } from "@/equipment/device";
import { timerParams } from "@/utils/command";

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

  // what it drives, absent on the filter pump
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
