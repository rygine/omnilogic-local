import type { OmniLogic } from "@/client/omnilogic";
import type { UnitSystem } from "@/types/config";
import { OmniValidationError } from "@/utils/errors";

export type SpeedFormat = "RPM" | "Percent";
export type ChlorinatorDisplay = "Salt" | "Minerals";

export class Panel {
  #omni: OmniLogic;

  constructor(omni: OmniLogic) {
    this.#omni = omni;
  }

  get omni() {
    return this.#omni;
  }

  get #system() {
    return this.omni.config.system;
  }

  async beeper() {
    const r = await this.omni.command("GetBeeper");
    return r.enabled;
  }

  setBeeper(on: boolean) {
    return this.omni.command("SetBeeper", { data: Number(on) });
  }

  async backLight() {
    const r = await this.omni.command("GetBackLight");
    return r.state;
  }

  setBackLight(on: boolean) {
    return this.omni.command("SetBackLight", { data: Number(on) });
  }

  async backLightBrightness() {
    const r = await this.omni.command("GetBackLightBrightness");
    return r.brightness;
  }

  setBackLightBrightness(percent: number) {
    return this.omni.command("SetBackLightBrightness", { data: percent });
  }

  async backLightTimeout() {
    const r = await this.omni.command("GetBackLightTimeout");
    return r.timeout;
  }

  setBackLightTimeout(seconds: number) {
    return this.omni.command("SetBackLightTimeout", { data: seconds });
  }

  get vspSpeedFormat(): SpeedFormat {
    return this.#system.mspVspSpeedFormat === "RPM" ? "RPM" : "Percent";
  }

  setVspSpeedFormat(format: SpeedFormat) {
    return this.omni.command("SetVSPSpeedFormat", {
      data: format === "RPM" ? 1 : 0,
    });
  }

  get chlorinatorDisplay(): ChlorinatorDisplay {
    return this.#system.mspChlorDisplay === "Salt" ? "Salt" : "Minerals";
  }

  setChlorinatorDisplay(display: ChlorinatorDisplay) {
    return this.omni.command("SetCHLORDisplay", {
      data: display === "Salt" ? 1 : 0,
    });
  }

  // the controller words it "12 Hour Format"
  get timeFormat() {
    return parseInt(this.#system.mspTimeFormat, 10);
  }

  setTimeFormat(hours: number) {
    if (hours !== 12 && hours !== 24) {
      throw new OmniValidationError(`Time format ${hours} is not 12 or 24`);
    }
    return this.omni.command("SetTimeFormat", { data: hours });
  }

  async units() {
    const r = await this.omni.command("GetUnits");
    return r.unitFormat ? "Metric" : "Standard";
  }

  setUnits(units: UnitSystem) {
    return this.omni.command("SetUnits", {
      data: units === "Metric" ? 1 : 0,
    });
  }

  async coordinates() {
    const r = await this.omni.command("GetCoordinates");
    return {
      latitude: r.latitude,
      longitude: r.longitude,
    };
  }

  setCoordinates(latitude: number, longitude: number) {
    return this.omni.command("SetCoordinates", { latitude, longitude });
  }
}
