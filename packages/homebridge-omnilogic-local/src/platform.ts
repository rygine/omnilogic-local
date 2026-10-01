import { join } from "node:path";

import {
  OmniLogic,
  ReadingUnavailableError,
} from "@rygine/omnilogic-local-sdk";
import type {
  API,
  DynamicPlatformPlugin,
  Logging,
  PlatformAccessory,
  PlatformConfig,
  Service,
  WithUUID,
} from "homebridge";

import { deviceOf, type Attach, type Handle } from "@/accessories/attach";
import { attachChlorinator } from "@/accessories/chlorinator";
import {
  attachHeaterSwitch,
  attachHeaterThermostat,
} from "@/accessories/heater";
import {
  attachLight,
  attachLightDimmer,
  attachLightSwitch,
} from "@/accessories/light";
import {
  attachFilter,
  attachPump,
  attachSpilloverFan,
  attachSpilloverSwitch,
} from "@/accessories/pump";
import { attachAirSensor, attachWaterSensor } from "@/accessories/sensor";
import { attachRelaySwitch, attachThemeSwitch } from "@/accessories/switch";
import { CATALOG } from "@/catalog";
import {
  controllerConfig,
  dropped,
  equipmentFor,
  fitProblem,
  type Accessory,
  type ControllerConfig,
} from "@/config";
import { discover, type Exposable } from "@/discovery";
import { numberOf, stringOf } from "@/helpers";
import { OffTimers, Readings, type AutoOff } from "@/persist";
import { ControllerSession } from "@/session";

export const PLATFORM_NAME = "OmniLogicLocal";
export const PLUGIN_NAME = "@rygine/homebridge-omnilogic-local";

// kept by homebridge across a restart
export type Context = { id: string };
type ServiceKind = WithUUID<typeof Service> & (new () => Service);
type Wired = {
  accessory: PlatformAccessory;
  entry: Accessory;
  handle?: Handle;
};
// one controller's accessories
type Wiring = { wired: Wired[] };
type SessionFactory = (
  config: ControllerConfig,
  log: Logging,
) => ControllerSession;

const defaultSession: SessionFactory = (c, log) =>
  // a cache TTL of 0 reads telemetry on every poll
  new ControllerSession(
    new OmniLogic({ host: c.host, port: c.port, cacheTTL: 0 }),
    {
      pollInterval: c.pollInterval,
      log,
    },
  );

export class OmniLogicPlatform implements DynamicPlatformPlugin {
  #log: Logging;
  #api: API;
  #controllers: ControllerConfig[];
  #dropped = false;
  #accessories = new Map<string, PlatformAccessory>();
  #sessions: ControllerSession[] = [];
  #makeSession: SessionFactory;
  #timers: OffTimers;
  #readings: Readings;

  constructor(
    log: Logging,
    config: PlatformConfig,
    api: API,
    makeSession: SessionFactory = defaultSession,
  ) {
    this.#log = log;
    this.#api = api;
    this.#makeSession = makeSession;
    this.#timers = new OffTimers(
      join(api.user.storagePath(), "omnilogic-local-timers.json"),
      log,
    );
    this.#readings = new Readings(
      join(api.user.storagePath(), "omnilogic-local-readings.json"),
    );
    const raw = Array.isArray(config.controllers) ? config.controllers : [];
    this.#controllers = raw.flatMap((c: unknown) => {
      const block = controllerConfig(c, (m) => {
        this.#dropped = true;
        this.#log.warn(m);
      });
      if (typeof block === "string") {
        this.#dropped = true;
        this.#log.warn(`a controller block: dropped, ${block}`);
        return [];
      }
      return [block];
    });
    if (raw.length === 0) {
      this.#log.info("no controller configured; add one on the settings page");
    }
    api.on("didFinishLaunching", () =>
      this.#launch().catch((error: unknown) => {
        this.#log.error(`startup failed: ${String(error)}`);
      }),
    );
    api.on("shutdown", () => {
      for (const session of this.#sessions) {
        session.stop();
      }
      this.#timers.stop();
    });
  }

  configureAccessory(accessory: PlatformAccessory): void {
    this.#accessories.set(accessory.UUID, accessory);
  }

  #uuid(entry: Context): string {
    return this.#api.hap.uuid.generate(entry.id);
  }

  async #launch(): Promise<void> {
    const keep = new Set<string>();
    for (const c of this.#controllers) {
      const session = this.#makeSession(c, this.#log);
      this.#sessions.push(session);
      const wiring: Wiring = { wired: [] };
      let wired =
        (await session.refresh()) && this.#tryExpose(c, session, wiring, keep);
      if (!wired) {
        for (const entry of c.accessories) {
          const uuid = this.#uuid(entry);
          keep.add(uuid);
          const cached = this.#accessories.get(uuid);
          if (cached !== undefined) {
            wiring.wired.push({ accessory: cached, entry });
          }
        }
      }
      session.on("refreshed", () => {
        if (!wired) {
          wired = this.#tryExpose(c, session, wiring, keep);
        }
        this.#pruneDeletedThemes(session, wiring);
        this.#update(wiring);
      });
      session.on("fault", (faulted) => this.#fault(wiring, faulted));
      if (session.faulted) {
        this.#fault(wiring, true);
      }
      session.start();
    }
    if (this.#dropped) {
      this.#log.warn(
        "something in the config was dropped, so no cached accessory is removed; fix it on the settings page",
      );
      return;
    }
    this.#remove(
      [...this.#accessories.values()].filter((a) => !keep.has(a.UUID)),
      "no longer configured or reported, removed from HomeKit",
    );
  }

  #tryExpose(
    c: ControllerConfig,
    session: ControllerSession,
    wiring: Wiring,
    keep: Set<string>,
  ): boolean {
    try {
      this.#expose(c, session, wiring, keep);
      return true;
    } catch (error) {
      this.#log.warn(
        `could not set up the accessories, trying again at the next poll: ${String(error)}`,
      );
      return false;
    }
  }

  #remove(accessories: PlatformAccessory[], why: string): void {
    if (accessories.length === 0) {
      return;
    }
    for (const accessory of accessories) {
      this.#log.warn(`${accessory.displayName}: ${why}`);
      this.#accessories.delete(accessory.UUID);
    }
    this.#api.unregisterPlatformAccessories(
      PLUGIN_NAME,
      PLATFORM_NAME,
      accessories,
    );
  }

  #expose(
    c: ControllerConfig,
    session: ControllerSession,
    wiring: Wiring,
    keep: Set<string>,
  ): void {
    const config = session.omni.config;
    const found = discover(config);
    this.#log.info(
      `${c.host}: connected, ${found.length} pieces of equipment found`,
    );
    const wired: Wired[] = [];
    const taken = new Set<string>();
    for (const entry of c.accessories) {
      const exposable = equipmentFor(entry, found);
      const why = fitProblem(entry, found);
      if (exposable === undefined || why !== undefined) {
        this.#log.warn(
          dropped(entry.name, `${why ?? "not on the controller"} at ${c.host}`),
        );
        continue;
      }
      const uuid = this.#uuid(entry);
      if (taken.has(uuid)) {
        this.#log.warn(
          dropped(entry.name, `another accessory already uses id ${entry.id}`),
        );
        continue;
      }
      taken.add(uuid);
      keep.add(uuid);
      const cached = this.#accessories.get(uuid);
      const accessory =
        cached ?? this.#register(uuid, entry.name, { id: entry.id });
      if (cached !== undefined && cached.displayName !== entry.name) {
        this.#rename(cached, entry.name);
      }
      this.#log.info(
        `${entry.name}: ${cached === undefined ? "added" : "restored from cache"}`,
      );
      this.#describe(accessory);
      wired.push({
        accessory,
        entry,
        handle: this.#attach(c, accessory, session, entry, exposable),
      });
    }
    this.#remove(
      wiring.wired
        .filter((w) => !taken.has(w.accessory.UUID))
        .map((w) => w.accessory),
      "no longer on the controller, removed from HomeKit",
    );
    wiring.wired = wired;
    this.#timers.prune();
    this.#update(wiring);
  }

  #pruneDeletedThemes(session: ControllerSession, wiring: Wiring): void {
    const themes = new Set(session.omni.config.themes.map((t) => t.systemId));
    const gone = (w: Wired): boolean =>
      w.entry.type === "themeSwitch" && !themes.has(w.entry.equipment);
    const removed = wiring.wired.filter(gone);
    if (removed.length === 0) {
      return;
    }
    wiring.wired = wiring.wired.filter((w) => !gone(w));
    this.#remove(
      removed.map((w) => w.accessory),
      "no longer on the controller, removed from HomeKit",
    );
  }

  #register(
    uuid: string,
    name: string,
    context: Context,
  ): PlatformAccessory<Context> {
    const accessory = new this.#api.platformAccessory<Context>(name, uuid);
    accessory.context = context;
    this.#api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [
      accessory,
    ]);
    this.#accessories.set(uuid, accessory);
    return accessory;
  }

  // the accessory's settings sheet in the Home app
  #describe(accessory: PlatformAccessory): void {
    const { Service, Characteristic } = this.#api.hap;
    accessory
      .getService(Service.AccessoryInformation)
      ?.setCharacteristic(Characteristic.Manufacturer, "Unknown")
      .setCharacteristic(Characteristic.Model, "Unknown");
  }

  #rename(accessory: PlatformAccessory, name: string): void {
    const { Characteristic } = this.#api.hap;
    accessory.updateDisplayName(name);
    for (const service of accessory.services) {
      service.updateCharacteristic(Characteristic.Name, name);
    }
    this.#api.updatePlatformAccessories([accessory]);
  }

  // the accessory's service for the entry's type, removing any other
  #service(accessory: PlatformAccessory, kind: ServiceKind): Service {
    const { AccessoryInformation } = this.#api.hap.Service;
    const stale = accessory.services.filter(
      (s) => s.UUID !== AccessoryInformation.UUID && s.UUID !== kind.UUID,
    );
    for (const service of stale) {
      accessory.removeService(service);
    }
    const { Name, StatusFault } = this.#api.hap.Characteristic;
    const service =
      accessory.getService(kind) ??
      accessory.addService(kind).setCharacteristic(Name, accessory.displayName);
    if (
      !service.optionalCharacteristics.some((c) => c.UUID === StatusFault.UUID)
    ) {
      service.addOptionalCharacteristic(StatusFault);
    }
    return service;
  }

  // turns the heater off when the plugin's timer runs out
  #autoOff(
    att: Attach,
    accessory: PlatformAccessory,
    entry: Accessory,
    bodyId: number,
  ): AutoOff | undefined {
    const offAfter = numberOf(entry.offAfter);
    if (offAfter === undefined) {
      return undefined;
    }
    return this.#timers.for(
      `heater:${entry.equipment}`,
      offAfter,
      async () => {
        // the controller acks an off it may then drop
        await att.session.write(() =>
          att.session.omni.command(
            "SetHeaterEnable",
            { poolId: bodyId, equipmentId: entry.equipment, data: 0 },
            {
              verify: () => !deviceOf(att, bodyId, "heater").enabled,
              timeoutMs: 30_000,
              failure: "Unable to turn the heater off",
            },
          ),
        );
        this.#log.info(`${accessory.displayName}: turned off by its timer`);
      },
      accessory.displayName,
    );
  }

  #attach(
    c: ControllerConfig,
    accessory: PlatformAccessory,
    session: ControllerSession,
    entry: Accessory,
    exposable: Exposable,
  ): Handle {
    const a = (service: Service): Attach => ({
      hap: this.#api.hap,
      service,
      session,
      log: this.#log,
      readings: {
        keep: (key, value) => this.#readings.keep(`${c.host}:${key}`, value),
      },
    });
    const service = this.#service(
      accessory,
      this.#api.hap.Service[CATALOG[entry.type].service],
    );
    const att = a(service);
    const bodyId = exposable.bodyId ?? 0;
    const id = entry.equipment;
    switch (entry.type) {
      case "filterFan":
        return attachFilter(att, {
          bodyId,
          speedMode: entry.fanSpeed === "percent" ? "percent" : "presets",
        });
      case "filterSwitch":
        return attachFilter(att, {
          bodyId,
          speedMode: "switch",
          onSpeed: stringOf(entry.onSpeed),
          onPercent: numberOf(entry.onPercent),
        });
      case "pumpSwitch":
        return attachPump(att, { pumpId: id });
      case "heaterThermostat":
        return attachHeaterThermostat(att, {
          bodyId,
          autoOff: this.#autoOff(att, accessory, entry, bodyId),
          offAfter: numberOf(entry.offAfter),
        });
      case "heaterSwitch":
        return attachHeaterSwitch(att, {
          bodyId,
          setPoint: numberOf(entry.setPoint),
          autoOff: this.#autoOff(att, accessory, entry, bodyId),
          offAfter: numberOf(entry.offAfter),
        });
      case "chlorinatorFan":
        return attachChlorinator(att, { bodyId, asSwitch: false });
      case "chlorinatorSwitch":
        return attachChlorinator(att, {
          bodyId,
          asSwitch: true,
          onPercent: numberOf(entry.onPercent),
        });
      case "spilloverFan":
        return attachSpilloverFan(att, {
          bodyId,
          speedMode: entry.fanSpeed === "percent" ? "percent" : "presets",
          offAfter: numberOf(entry.offAfter),
        });
      case "spilloverSwitch":
        return attachSpilloverSwitch(att, {
          bodyId,
          onSpeed: stringOf(entry.onSpeed),
          onPercent: numberOf(entry.onPercent),
          offAfter: numberOf(entry.offAfter),
        });
      case "light":
        return attachLight(att, {
          lightId: id,
          offAfter: numberOf(entry.offAfter),
        });
      case "lightSwitch":
        return attachLightSwitch(att, {
          lightId: id,
          show: numberOf(entry.show) ?? 0,
          speed: stringOf(entry.speed),
          brightness: numberOf(entry.brightness),
          offAfter: numberOf(entry.offAfter),
        });
      case "lightDimmer":
        return attachLightDimmer(att, {
          lightId: id,
          show: numberOf(entry.show) ?? 0,
          speed: stringOf(entry.speed),
          offAfter: numberOf(entry.offAfter),
        });
      case "relaySwitch":
        return attachRelaySwitch(att, {
          relayId: id,
          offAfter: numberOf(entry.offAfter),
        });
      case "themeSwitch":
        return attachThemeSwitch(att, {
          themeId: id,
          offAfter: numberOf(entry.offAfter),
        });
      case "waterTemp":
        return attachWaterSensor(att, { bodyId: id });
      case "airTemp":
        return attachAirSensor(att);
      default:
        throw new Error(`no accessory for ${String(entry.type)}`);
    }
  }

  #update(wiring: Wiring): void {
    for (const { handle } of wiring.wired) {
      try {
        handle?.update();
      } catch (error) {
        // the controller is in service or config mode
        if (error instanceof ReadingUnavailableError) {
          this.#log.debug(`update skipped: ${error.message}`);
          continue;
        }
        this.#log.warn(`update failed: ${String(error)}`);
      }
    }
  }

  #fault(wiring: Wiring, faulted: boolean): void {
    const { Characteristic, Service } = this.#api.hap;
    for (const { accessory } of wiring.wired) {
      for (const service of accessory.services) {
        if (service.UUID === Service.AccessoryInformation.UUID) {
          continue;
        }
        service
          .getCharacteristic(Characteristic.StatusFault)
          .updateValue(faulted ? 1 : 0);
      }
    }
  }
}
