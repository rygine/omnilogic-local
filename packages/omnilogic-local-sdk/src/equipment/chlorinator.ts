import type { ReadOptions } from "@/client/omnilogic";
import {
  bitmaskNames,
  CHLORINATOR_ALERTS,
  CHLORINATOR_ERRORS,
  CHLORINATOR_OP_MODE,
  CHLORINATOR_OPERATING_STATE,
  CHLORINATOR_STATUS,
  packedNames,
} from "@/constants/labels";
import { Device } from "@/equipment/device";
import { cellAmps, cellVolts, thermistorF, word } from "@/utils/decode";
import { OmniValidationError } from "@/utils/errors";
import { installedAt } from "@/utils/inventory";

export type CellStatus = {
  // a label, or the code with { raw: true }
  opState: number | string;
  scState: number;
  alertStatus: number;
  // ppm
  instantSalt: number;
  averageSalt: number;
  // only a liquid or tablet feeder dispenses
  activelyDispensing?: boolean;
};

export type CellMeasurement = {
  // volts, or the ADC count with { raw: true }
  voltage: number;
  // amps, or the ADC count with { raw: true }
  current: number;
  // °F, or the thermistor count with { raw: true }
  cellTemp: number;
  boardTemp: number;
  // ppm
  instantSalt: number;
  averageSalt: number;
};

export class Chlorinator extends Device {
  get state() {
    return this.telemetry(this.omni.telemetry.chlorinators);
  }

  get #reported() {
    return this.reportedIn(this.omni.telemetry.chlorinators);
  }

  get #runningState() {
    this.requireRunning();
    return this.state;
  }

  get #config() {
    return this.configured(this.bodyConfig?.chlorinator);
  }

  get enabled() {
    return this.#runningState.enable !== 0;
  }

  setEnabled(on: boolean) {
    return this.omni.command("SetCHLOREnable", {
      poolId: this.poolId,
      data: Number(on),
    });
  }

  get timedPercent() {
    return this.#config.timedPercent;
  }

  setTimedPercent(percent: number) {
    if (!Number.isInteger(percent) || percent < 0 || percent > 100) {
      throw new OmniValidationError(
        `Timed percent ${percent} is not a whole number from 0 to 100`,
      );
    }
    return this.omni.command("SetCHLORTimePercent", {
      poolId: this.poolId,
      equipmentId: this.equipmentId,
      data: percent,
    });
  }

  get operatingState() {
    return this.#reported
      ? (CHLORINATOR_OPERATING_STATE[this.state.operatingState] ?? "Unknown")
      : "Off";
  }

  // whether a probe or the clock decides the output
  get operatingMode() {
    return this.#reported
      ? (CHLORINATOR_OP_MODE[this.state.operatingMode] ?? "Unknown")
      : "Not Config";
  }

  // every condition the cell reports at once, such as "Generating, K1 Active"
  get conditions() {
    return this.#reported
      ? bitmaskNames(this.state.status, CHLORINATOR_STATUS)
      : "None";
  }

  // what the cell is warning about, such as "Low Salt, Clean Cell"
  get alert() {
    return packedNames(this.#runningState.chlrAlert, CHLORINATOR_ALERTS);
  }

  // the faults the cell reports, such as "Relay K1 Open"
  get error() {
    return packedNames(this.#runningState.chlrError, CHLORINATOR_ERRORS);
  }

  // ppm
  get averageSalt() {
    return this.#runningState.avgSaltLevel;
  }

  // ppm
  get instantSalt() {
    return this.#runningState.instantSaltLevel;
  }

  get isSuperchlorinating() {
    return this.#reported && this.state.scMode !== 0;
  }

  superchlorinate(on = true) {
    return this.omni.command("SetUISuperCHLORCmd", {
      poolId: this.poolId,
      equipmentId: this.equipmentId,
      data: Number(on),
    });
  }

  get superchlorinateHours() {
    return this.#config.superChlorTimeout;
  }

  setSuperchlorinateHours(hours: number) {
    return this.omni.command("SetUISuperCHLORTimeoutCmd", {
      poolId: this.poolId,
      equipmentId: this.equipmentId,
      data: hours,
    });
  }

  async superchlorinateMinutesRemaining() {
    const r = await this.omni.command("GetUISuperCHLORTimeRemaining", {
      poolId: this.poolId,
      equipmentId: this.equipmentId,
    });
    return r.superChlorTimeRemaining;
  }

  async relayPolarity() {
    const r = await this.omni.command("GetCHLORRelayPolarity", {
      poolId: this.poolId,
      equipmentId: this.idAt("chlorinator.cell"),
    });
    return r.relaySetting;
  }

  async cellStatus(options: ReadOptions = {}): Promise<CellStatus> {
    const r = await this.omni.command("GetCHLORStatus", {
      poolId: this.poolId,
      equipmentId: this.idAt("chlorinator.cell"),
    });
    const opState = r.opState;
    const reading: CellStatus = {
      opState: options.raw
        ? opState
        : (CHLORINATOR_OPERATING_STATE[opState] ?? "Unknown"),
      scState: r.scState,
      alertStatus: r.alertStatus,
      instantSalt: word(r.instantSaltHigh, r.instantSaltLow),
      averageSalt: word(r.averageSaltHigh, r.averageSaltLow),
    };
    if (installedAt(this.inventoryBody, "chlorinator.feeder")) {
      reading.activelyDispensing = r.activelyDispensing === 1;
    }
    return reading;
  }

  async cellMeasurement(options: ReadOptions = {}): Promise<CellMeasurement> {
    const r = await this.omni.command("GetCHLORMeasurement", {
      poolId: this.poolId,
      equipmentId: this.idAt("chlorinator.cell"),
    });
    const voltage = word(r.voltageHighByte, r.voltageLowByte);
    const current = word(r.currentHighByte, r.currentLowByte);
    const cellTemp = word(r.cellTempHighByte, r.cellTempLowByte);
    const boardTemp = word(r.boardTempHighByte, r.boardTempLowByte);
    const salt = {
      instantSalt: word(r.instantSaltLevelHighByte, r.instantSaltLevelLowByte),
      averageSalt: word(r.averageSaltLevelHighByte, r.averageSaltLevelLowByte),
    };
    if (options.raw) {
      return { voltage, current, cellTemp, boardTemp, ...salt };
    }
    return {
      voltage: cellVolts(voltage),
      current: cellAmps(current),
      cellTemp: thermistorF(cellTemp),
      boardTemp: thermistorF(boardTemp),
      ...salt,
    };
  }
}
