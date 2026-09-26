import type { OmniLogic } from "@/client/omnilogic";
import { isRunning, SYSTEM_STATE } from "@/constants/labels";
import { AIR_TEMP_UNAVAILABLE } from "@/constants/sentinels";
import { BodyOfWater } from "@/equipment/bodyOfWater";
import { Favorites } from "@/equipment/favorites";
import { Light } from "@/equipment/light";
import { Panel } from "@/equipment/panel";
import { Relay } from "@/equipment/relay";
import { Schedules } from "@/equipment/schedules";
import { Themes } from "@/equipment/themes";
import { OmniLogicError } from "@/utils/errors";

export class Backyard {
  #omni: OmniLogic;

  constructor(omni: OmniLogic) {
    this.#omni = omni;
  }

  get schedules() {
    return new Schedules(this.#omni);
  }

  get favorites() {
    return new Favorites(this.#omni);
  }

  get themes() {
    return new Themes(this.#omni);
  }

  get panel() {
    return new Panel(this.#omni);
  }

  get state() {
    return this.#omni.telemetry.backyard;
  }

  get running() {
    return isRunning(this.state.state);
  }

  get systemState() {
    return SYSTEM_STATE[this.state.state] ?? "Unknown";
  }

  get airTemp() {
    const temp = this.state.airTemp;
    return !this.running || temp === AIR_TEMP_UNAVAILABLE ? undefined : temp;
  }

  get bodies() {
    return this.#omni.config.backyard.bodiesOfWater.map(
      (raw) => new BodyOfWater(this.#omni, raw),
    );
  }

  get lights() {
    const backyard = this.#omni.config.backyard;
    return backyard.colorLogicLights.map(
      (l) => new Light(this.#omni, backyard.systemId, l.systemId, l.name),
    );
  }

  get relays() {
    const backyard = this.#omni.config.backyard;
    return backyard.relays.map(
      (r) => new Relay(this.#omni, backyard.systemId, r),
    );
  }

  body(nameOrId: string | number) {
    return this.bodies.find((b) =>
      typeof nameOrId === "number"
        ? b.systemId === nameOrId
        : b.name.toLowerCase() === nameOrId.toLowerCase(),
    );
  }

  get pool() {
    return this.#ofType("BOW_POOL");
  }

  get spa() {
    return this.#ofType("BOW_SPA");
  }

  #ofType(type: string) {
    const matches = this.bodies.filter((b) => b.type === type);
    if (matches.length > 1) {
      throw new OmniLogicError(
        `This system has more than one body of water of type ${type}; use body(nameOrId) or bodies`,
      );
    }
    return matches[0];
  }
}
