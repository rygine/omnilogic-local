import type { OmniLogic, ReadOptions } from "@/client/omnilogic";
import {
  FILTER_STATE,
  FILTER_VALVE_POSITION,
  FILTER_WHY_ON,
} from "@/constants/labels";
import { Pump } from "@/equipment/pump";
import type { Filter as FilterConfig } from "@/types/config";
import { bcdWatts, displayRevision, driveRevision, word } from "@/utils/decode";

const ascii = (bytes: number[]) =>
  String.fromCharCode(...bytes).replace(/[\0 ]+$/, "");

export type FilterDiagnostics = {
  // watts, or the BCD word with { raw: true }
  power: number;
  errorStatus: number;
  // as the panel shows it, or the six bytes as text with { raw: true }
  displayRevision: string;
  driveRevision: string;
};

// the pump that drives the filter
export class Filter extends Pump {
  constructor(omni: OmniLogic, poolId: number, config: FilterConfig) {
    super(omni, poolId, {
      systemId: config.systemId,
      name: config.name,
      type: config.filterType,
    });
  }

  get #config() {
    return this.configured(this.bodyConfig?.filter);
  }

  get states() {
    return FILTER_STATE;
  }

  get reasons() {
    return FILTER_WHY_ON;
  }

  get countdownReason() {
    return 10;
  }

  get state() {
    return this.telemetry(this.omni.telemetry.filters);
  }

  // which way the valves are set, e.g. "Pool Only", "Spillover"
  get valvePosition() {
    const position = this.reported ? this.state.valvePosition : -1;
    return FILTER_VALVE_POSITION[position] ?? "Unknown";
  }

  // the speed the pump reports back, lagging the speed it was told
  get reportedSpeed() {
    return this.reported ? this.state.reportedFilterSpeed : 0;
  }

  get isPriming() {
    const state = this.reported ? this.state.filterState : 0;
    return state === 2 || state === 10; // Priming or Force Priming
  }

  // watts
  get power() {
    return this.reported ? this.state.power : 0;
  }

  async diagnostics(options: ReadOptions = {}): Promise<FilterDiagnostics> {
    const r = await this.omni.command("GetUIFilterDiagnosticInfo", {
      poolId: this.poolId,
      equipmentId: this.equipmentId,
    });
    const display = [
      r.displayFwRevisionB1,
      r.displayFwRevisionB2,
      r.displayFwRevisionB3,
      r.displayFwRevisionB4,
      r.displayFwRevisionB5,
      r.displayFwRevisionB6,
    ];
    const drive = [
      r.driveFwRevisionB1,
      r.driveFwRevisionB2,
      r.driveFwRevisionB3,
      r.driveFwRevisionB4,
      r.driveFwRevisionB5,
      r.driveFwRevisionB6,
    ];
    const errorStatus = r.errorStatus;
    if (options.raw) {
      return {
        power: word(r.powerMsb, r.powerLsb),
        errorStatus,
        displayRevision: ascii(display),
        driveRevision: ascii(drive),
      };
    }
    return {
      power: bcdWatts(r.powerMsb, r.powerLsb),
      errorStatus,
      displayRevision: displayRevision(display),
      driveRevision: driveRevision(drive),
    };
  }

  get minSpeed() {
    return this.#config.minPumpSpeed;
  }

  setMinSpeed(value: number) {
    return this.omni.command("SetFilterLowSpeed", {
      poolId: this.poolId,
      equipmentId: this.equipmentId,
      data: value,
    });
  }

  get maxSpeed() {
    return this.#config.maxPumpSpeed;
  }

  setMaxSpeed(value: number) {
    return this.omni.command("SetFilterHighSpeed", {
      poolId: this.poolId,
      equipmentId: this.equipmentId,
      data: value,
    });
  }

  // the speed the Low preset runs
  get lowSpeed() {
    return this.#config.vspLowPumpSpeed;
  }

  // the speed the Medium preset runs
  get mediumSpeed() {
    return this.#config.vspMediumPumpSpeed;
  }

  // the speed the High preset runs
  get highSpeed() {
    return this.#config.vspHighPumpSpeed;
  }

  get primingDuration() {
    return this.#config.primingDuration;
  }

  setPrimingDuration(seconds: number) {
    return this.omni.command("SetPrimingDuration", {
      poolId: this.poolId,
      equipmentId: this.equipmentId,
      data: seconds,
    });
  }

  get cooldownDuration() {
    return this.#config.cooldownDuration;
  }

  setCooldownDuration(seconds: number) {
    return this.omni.command("SetCooldownDuration", {
      poolId: this.poolId,
      equipmentId: this.equipmentId,
      data: seconds,
    });
  }

  get sharedFilterTimeout() {
    return this.#config.sharedFilterTimeout;
  }

  setSharedFilterTimeout(seconds: number) {
    return this.omni.command("SetSharedFilterTimeout", {
      poolId: this.poolId,
      equipmentId: this.equipmentId,
      data: seconds,
    });
  }

  get freezeProtectOverrideInterval() {
    return this.#config.freezeProtectOverrideInterval;
  }

  setFreezeProtectOverrideInterval(seconds: number) {
    return this.omni.command("SetUIFreezeProtectOverrideInterval", {
      poolId: this.poolId,
      equipmentId: this.equipmentId,
      data: seconds,
    });
  }

  get freezeProtect() {
    return this.#config.freezeProtectEnable;
  }

  setFreezeProtect(on: boolean) {
    return this.omni.command("SetFreezeProtect", {
      poolId: this.poolId,
      data: Number(on),
    });
  }

  get freezeProtectTemp() {
    return this.#config.freezeProtectTemp;
  }

  setFreezeProtectTemp(degrees: number) {
    return this.omni.command("SetFreezeProtectTemp", {
      poolId: this.poolId,
      data: degrees,
    });
  }

  get freezeProtectSpeed() {
    return this.#config.freezeProtectSpeed;
  }

  setFreezeProtectSpeed(value: number) {
    return this.omni.command("SetFreezeProtectSpeed", {
      poolId: this.poolId,
      data: value,
    });
  }

  get offDuringValveChange() {
    return this.#config.valveChangeOffEnable;
  }

  setOffDuringValveChange(on: boolean) {
    return this.omni.command("SetFilterOffValveChg", {
      poolId: this.poolId,
      data: Number(on),
    });
  }

  get flowMonitor() {
    return this.#config.noWaterFlowTimeoutEnable;
  }

  setFlowMonitor(on: boolean) {
    return this.omni.command("SetFlowMonitor", {
      poolId: this.poolId,
      data: Number(on),
    });
  }
}
