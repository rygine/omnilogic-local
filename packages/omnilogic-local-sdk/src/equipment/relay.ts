import type { OmniLogic } from "@/client/omnilogic";
import { RELAY_STATE, RELAY_WHY_ON } from "@/constants/labels";
import { Device } from "@/equipment/device";
import type { Relay as RelayConfig } from "@/types/config";
import { countdownParams, timerParams } from "@/utils/command";

export class Relay extends Device {
  #type: string;
  #function: string;

  constructor(omni: OmniLogic, poolId: number, config: RelayConfig) {
    super(omni, poolId, config.systemId, config.name);
    this.#type = config.type;
    this.#function = config.function;
  }

  get type() {
    return this.#type;
  }

  get function() {
    return this.#function;
  }

  // the filter pump speed set when this feature turns on, held until the next schedule
  get valveDefaultSpeed() {
    return this.bodyConfig?.relays.find((r) => r.systemId === this.equipmentId)
      ?.valveDefaultSpeed;
  }

  get #rows() {
    const t = this.omni.telemetry;
    return [...t.relays, ...t.valveActuators, ...t.smartValveActuators];
  }

  get state() {
    return this.telemetry(this.#rows);
  }

  get #reported() {
    return this.reportedIn(this.#rows);
  }

  get #position() {
    const row = this.state;
    return "relayState" in row ? row.relayState : row.valveActuatorState;
  }

  get status() {
    return this.#reported ? (RELAY_STATE[this.#position] ?? "Unknown") : "Off";
  }

  get isOn() {
    return this.#reported && this.#position !== 0;
  }

  // where a smart valve actuator is driving to, and undefined for the rest
  get smartValveTarget() {
    return this.omni.telemetry.smartValveActuators.find(
      (r) => r.systemId === this.equipmentId,
    )?.smartValveTarget;
  }

  get whyOn() {
    return this.#reported
      ? (RELAY_WHY_ON[this.state.whyOn] ?? "Unknown")
      : "No Message";
  }

  get onCountdown() {
    return this.#reported && this.state.whyOn === 6; // Countdown Timer
  }

  #setState(on: boolean) {
    return this.omni.command("SetUIEquipmentCmd", {
      poolId: this.poolId,
      equipmentId: this.equipmentId,
      isOn: Number(on),
      ...timerParams(),
    });
  }

  on() {
    return this.#setState(true);
  }

  off() {
    return this.#setState(false);
  }

  async remainingCountdownTime() {
    const r = await this.omni.command("GetRemainingCountdownTime", {
      poolId: this.poolId,
      equipmentId: this.equipmentId,
    });
    return r.hour * 60 + r.minute;
  }

  setCountdownTime(minutes: number) {
    return this.omni.command("SetUIEquipmentCmd", {
      poolId: this.poolId,
      equipmentId: this.equipmentId,
      isOn: 1,
      ...countdownParams(minutes),
    });
  }
}
