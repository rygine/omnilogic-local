import type { OmniLogic } from "@rygine/omnilogic-local-sdk";
import type { MqttClient } from "mqtt";

import { notify } from "@/api";
import { saveDiagnostics } from "@/diagnostics";
import { backyardEntities } from "@/entities/backyard";
import { body } from "@/entities/body";
import { chlorinator } from "@/entities/chlorinator";
import { csad } from "@/entities/csad";
import {
  type DeviceSpec,
  type Entity,
  entityIdOf,
  type Platform,
  tryRead,
} from "@/entities/entity";
import { filter } from "@/entities/filter";
import { heater } from "@/entities/heater";
import { light } from "@/entities/light";
import { pump } from "@/entities/pump";
import { relay } from "@/entities/relay";
import { schedules } from "@/entities/schedules";
import { ScheduleImport } from "@/import";
import type { Settings } from "@/settings";
import { logger, isRecord, type Log, messageOf } from "@/utils";

import pkg from "../package.json" with { type: "json" };

const shared = <T>(run: () => Promise<T>) => {
  let inFlight: Promise<T> | null = null;
  return () =>
    (inFlight ??= run().finally(() => {
      inFlight = null;
    }));
};

// platforms whose discovery names every topic itself
const COMPOSITE = new Set<Platform>(["climate", "light"]);

export const BRIDGE_TOPIC = "omnilogic/bridge";

const CONTROLLER_TOPIC = "omnilogic/controller";

// the delays after a write before each re-read
const SETTLE_MS = [2000, 10000, 30000, 60000];

export type BridgeOptions = Omit<Settings, "mqttUrl" | "logLevel"> & {
  log?: Log;
};

// every device the controller's configuration holds
export const devicesOf = (
  omni: OmniLogic,
  speedUnit: Settings["speedUnit"],
): DeviceSpec[] => {
  const backyard = omni.backyard;
  const controller: DeviceSpec = {
    id: "controller",
    name: "OmniLogic",
    model: "OmniLogic",
    entities: [],
  };
  const all: DeviceSpec[] = [controller];
  for (const r of backyard.relays) {
    all.push(relay(r));
  }
  for (const l of backyard.lights) {
    all.push(light(l));
  }
  const rpm = speedUnit === "rpm";

  for (const b of backyard.bodies) {
    all.push(body(omni, b));
    if (b.filter !== undefined) {
      all.push(filter(b.filter, b.name, rpm));
    }
    for (const p of b.pumps) {
      if (p !== b.filter) {
        all.push(pump(p, b.name, rpm));
      }
    }
    for (const r of b.relays) {
      all.push(relay(r, b.name));
    }
    if (b.heater !== undefined) {
      all.push(heater(b.heater, b));
    }
    if (b.chlorinator !== undefined) {
      all.push(chlorinator(b.chlorinator, b.name));
    }
    if (b.csad !== undefined) {
      all.push(csad(b.csad, b.name, b.chlorinator));
    }
    for (const l of b.lights) {
      all.push(light(l, b.name));
    }
  }
  controller.entities.push(...backyardEntities(omni), ...schedules(omni, all));
  return all;
};

// a value as Home Assistant reads it from state
const encode = (value: unknown) =>
  typeof value === "boolean" ? (value ? "ON" : "OFF") : (value ?? null);

export class Bridge {
  #omni: OmniLogic;
  #client: MqttClient;
  #options: BridgeOptions;
  #log: Log;
  #scheduleImport: ScheduleImport;
  #devices?: DeviceSpec[];
  // the configuration checksum the devices were built from
  #checksum?: number;
  #lastPayloads = new Map<string, string>();
  // each device's published components and their platforms
  #components = new Map<string, Map<string, string>>();
  // command reads, by device id and key
  #commandReads = new Map<string, unknown>();
  #settleTimers: ReturnType<typeof setTimeout>[] = [];
  #stopped = false;
  // command reads to re-read after a write, by device id and key
  #pendingReads = new Map<string, { device: DeviceSpec; e: Entity }>();
  // resolves when the last write has ended
  #lastWrite: Promise<void> = Promise.resolve();
  #online?: boolean;
  #retainedTopics = new Set<string>();
  #timers: ReturnType<typeof setInterval>[] = [];

  constructor(omni: OmniLogic, client: MqttClient, options: BridgeOptions) {
    this.#omni = omni;
    this.#client = client;
    this.#options = options;
    this.#log = options.log ?? logger;
    this.#scheduleImport = new ScheduleImport(omni, {
      ...options,
      devices: () => this.#devices ?? [],
      log: this.#log,
    });
  }

  #stateTopic(id: string) {
    return `omnilogic/${id}/state`;
  }

  #discoveryTopic(id: string) {
    return `homeassistant/device/omnilogic_${id}/config`;
  }

  get #availability() {
    return [{ topic: BRIDGE_TOPIC }, { topic: CONTROLLER_TOPIC }];
  }

  #diagnosticsEntity(): Entity {
    return {
      platform: "button",
      key: "save_diagnostics",
      name: "Save diagnostics",
      config: { entity_category: "diagnostic" },
      command: async () => {
        const { log, api, ...settings } = this.#options;
        const path = await saveDiagnostics(
          this.#omni,
          { ...settings, apiAccess: api !== undefined },
          settings.diagnosticsDir,
        );
        this.#log.info(`diagnostics saved to ${path}`);
        if (api !== undefined) {
          await notify(
            api,
            "omnilogic_diagnostics",
            "OmniLogic diagnostics",
            `Saved to \`${path}\`.`,
          );
        }
      },
    };
  }

  #connectedEntity(): Entity {
    return {
      platform: "binary_sensor",
      key: "connected",
      name: "Controller connected",
      config: {
        device_class: "connectivity",
        entity_category: "diagnostic",
        state_topic: CONTROLLER_TOPIC,
        payload_on: "online",
        payload_off: "offline",
        availability: [{ topic: BRIDGE_TOPIC }],
      },
    };
  }

  #component(device: DeviceSpec, e: Entity) {
    const t = {
      state: this.#stateTopic(device.id),
      command: (field?: string) =>
        `omnilogic/${device.id}/${e.key}${field === undefined ? "" : `/${field}`}/set`,
      availability: this.#availability,
    };
    return {
      p: e.platform,
      unique_id: `omnilogic_${device.id}_${e.key}`,
      default_entity_id: entityIdOf(device, e),
      name: e.name,
      ...(COMPOSITE.has(e.platform)
        ? {}
        : {
            state_topic: e.value === undefined ? undefined : t.state,
            value_template:
              e.value === undefined ? undefined : `{{ value_json.${e.key} }}`,
            command_topic: e.command === undefined ? undefined : t.command(),
          }),
      ...e.config,
      ...e.topics?.(t),
    };
  }

  #discovery(device: DeviceSpec, removed: [string, string][]) {
    return {
      dev: {
        identifiers: [`omnilogic_${device.id}`],
        name: device.name,
        manufacturer: "Hayward",
        model: device.model,
        suggested_area: device.area,
        ...(device.id === "controller"
          ? { sw_version: this.#omni.mspVersion }
          : { via_device: "omnilogic_controller" }),
      },
      o: {
        name: "OmniLogicLocal",
        sw: pkg.version,
        url: "https://rygine.github.io/omnilogic-local/guide/home-assistant",
      },
      availability: this.#availability,
      availability_mode: "all",
      cmps: {
        ...Object.fromEntries(removed.map(([key, p]) => [key, { p }])),
        ...Object.fromEntries(
          device.entities.map((e) => [e.key, this.#component(device, e)]),
        ),
      },
    };
  }

  #publishDiscovery() {
    if (this.#devices === undefined) {
      return;
    }
    const current = new Set<string>();
    const components = new Map<string, Map<string, string>>();
    for (const device of this.#devices) {
      const topic = this.#discoveryTopic(device.id);
      current.add(topic);
      const keys = new Map(device.entities.map((e) => [e.key, e.platform]));
      // components gone since the last publish
      const removed = [...(this.#components.get(device.id) ?? [])].filter(
        ([key]) => !keys.has(key),
      );
      components.set(device.id, keys);
      this.#client.publish(
        topic,
        JSON.stringify(this.#discovery(device, removed)),
        { retain: true },
      );
    }
    this.#components = components;
    for (const topic of this.#retainedTopics) {
      if (!current.has(topic)) {
        this.#clear(topic);
      }
    }
  }

  // true when an earlier run published a component this one does not
  #rememberComponents(topic: string, payload: string) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(payload);
    } catch {
      return false;
    }
    const cmps = isRecord(parsed) ? parsed.cmps : undefined;
    if (!isRecord(cmps)) {
      return false;
    }

    const id = this.#deviceIdOf(topic);
    const published = this.#devices
      ?.find((d) => d.id === id)
      ?.entities.map((e) => e.key);
    const known = this.#components.get(id) ?? new Map<string, string>();
    let stale = false;
    for (const [key, component] of Object.entries(cmps)) {
      // a component without a unique id is a removal the bridge sent
      if (
        isRecord(component) &&
        typeof component.p === "string" &&
        "unique_id" in component &&
        !published?.includes(key) &&
        !known.has(key)
      ) {
        known.set(key, component.p);
        stale = true;
      }
    }
    this.#components.set(id, known);
    return stale;
  }

  // the device id in a discovery topic
  #deviceIdOf(topic: string) {
    return topic.slice(
      "homeassistant/device/omnilogic_".length,
      -"/config".length,
    );
  }

  #clear(topic: string) {
    this.#retainedTopics.delete(topic);
    this.#client.publish(topic, "", { retain: true });
    const state = this.#stateTopic(this.#deviceIdOf(topic));
    this.#lastPayloads.delete(state);
    this.#client.publish(state, "", { retain: true });
  }

  #stateOf(device: DeviceSpec) {
    const out: Record<string, unknown> = {};
    for (const e of device.entities) {
      if (e.value !== undefined) {
        out[e.key] =
          e.commandRead === true
            ? (this.#commandReads.get(`${device.id}/${e.key}`) ?? null)
            : encode(tryRead(e.value));
      }
    }
    return JSON.stringify(out);
  }

  #publishState(device: DeviceSpec, force = false) {
    const topic = this.#stateTopic(device.id);
    const payload = this.#stateOf(device);
    if (!force && this.#lastPayloads.get(topic) === payload) {
      return;
    }
    this.#lastPayloads.set(topic, payload);
    this.#client.publish(topic, payload, { retain: true });
  }

  #rebuild() {
    const devices = devicesOf(this.#omni, this.#options.speedUnit);
    devices[0]!.entities.push(
      this.#connectedEntity(),
      this.#diagnosticsEntity(),
      ...this.#scheduleImport.entities(),
    );
    this.#devices = devices;
    this.#checksum = this.#omni.configChecksum;
    const entities = devices.reduce((n, d) => n + d.entities.length, 0);
    this.#log.info(
      `published ${devices.length} devices with ${entities} entities`,
    );
    this.#publishDiscovery();
  }

  poll = shared(() => this.#pollNow());

  async #pollNow() {
    try {
      await this.#omni.refresh();
    } catch (error) {
      this.#setOnline(false, error);
      return false;
    }
    this.#setOnline(true);
    if (this.#omni.configChecksum !== this.#checksum) {
      this.#rebuild();
    }
    for (const device of this.#devices ?? []) {
      this.#publishState(device);
    }
    await this.#scheduleImport.notifySchedules().catch((error: unknown) => {
      this.#log.warn(`schedule notification: ${messageOf(error)}`);
    });
    return true;
  }

  async #updateCommandRead(device: DeviceSpec, e: Entity) {
    try {
      this.#commandReads.set(`${device.id}/${e.key}`, encode(await e.value!()));
    } catch (error) {
      this.#log.debug(`${device.name} ${e.name ?? e.key}: ${messageOf(error)}`);
    }
  }

  pollCommandReads = shared(async () => {
    if (this.#online !== true) {
      return;
    }
    for (const device of this.#devices ?? []) {
      for (const e of device.entities) {
        if (e.commandRead === true) {
          await this.#updateCommandRead(device, e);
        }
      }
      this.#publishState(device);
    }
  });

  async handle(topic: string, payload: string) {
    if (topic === "homeassistant/status") {
      if (payload === "online") {
        this.#timers.push(
          setTimeout(() => {
            if (!this.#stopped) {
              this.#publishStates();
            }
          }, Math.random() * 5000),
        );
      }
      return;
    }
    if (topic.startsWith("homeassistant/device/omnilogic_")) {
      if (payload === "") {
        return;
      }
      this.#retainedTopics.add(topic);
      const current = this.#devices?.some(
        (d) => this.#discoveryTopic(d.id) === topic,
      );
      if (this.#devices !== undefined && current !== true) {
        this.#clear(topic);
        return;
      }
      const stale = this.#rememberComponents(topic, payload);
      if (stale && current === true) {
        this.#publishDiscovery();
      }
      return;
    }
    const parts = topic.split("/");
    if (parts[0] !== "omnilogic") {
      return;
    }
    if (parts.at(-1) === "set" && (parts.length === 4 || parts.length === 5)) {
      this.#lastWrite = this.#lastWrite
        .then(() =>
          this.#set(
            parts[1]!,
            parts[2]!,
            parts.length === 5 ? parts[3] : undefined,
            payload,
          ),
        )
        .catch(this.#warnUnexpected);
      return this.#lastWrite;
    }
  }

  async #set(
    id: string,
    key: string,
    field: string | undefined,
    payload: string,
  ) {
    const device = this.#devices?.find((d) => d.id === id);
    const e = device?.entities.find((x) => x.key === key);
    if (device === undefined || e?.command === undefined) {
      this.#log.warn(`nothing listens on ${id}/${key}`);
      return;
    }
    try {
      await e.command(payload, field);
    } catch (error) {
      this.#log.warn(`${device.name} ${e.name ?? key}: ${messageOf(error)}`);
      this.#publishState(device, true);
    }
    this.#settle(device, e);
  }

  #settle(device: DeviceSpec, e: Entity) {
    if (e.commandRead === true) {
      this.#pendingReads.set(`${device.id}/${e.key}`, { device, e });
    }
    for (const timer of this.#settleTimers) {
      clearTimeout(timer);
    }
    const reread = async (last: boolean) => {
      for (const pending of this.#pendingReads.values()) {
        await this.#updateCommandRead(pending.device, pending.e);
      }
      await this.poll().catch(() => false);
      this.#publishState(device);
      for (const pending of this.#pendingReads.values()) {
        this.#publishState(pending.device);
      }
      if (last) {
        this.#pendingReads.clear();
      }
    };
    reread(false).catch(this.#warnUnexpected);
    this.#settleTimers = this.#stopped
      ? []
      : SETTLE_MS.map((ms, i) =>
          setTimeout(() => {
            reread(i === SETTLE_MS.length - 1).catch(this.#warnUnexpected);
          }, ms),
        );
  }

  #warnUnexpected = (error: unknown) => {
    this.#log.warn(`unexpected error: ${messageOf(error)}`);
  };

  #setOnline(on: boolean, error?: unknown) {
    if (this.#online === on) {
      return;
    }
    if (on && this.#online === false) {
      this.#log.info("controller answering again");
    }
    if (!on) {
      this.#log.warn(`controller not answering: ${messageOf(error)}`);
    }
    this.#online = on;
    this.#client.publish(CONTROLLER_TOPIC, on ? "online" : "offline", {
      retain: true,
    });
  }

  #onConnect = () => {
    this.#log.info("connected to the MQTT broker");
    this.#client.subscribe([
      "homeassistant/status",
      "homeassistant/device/+/config",
      "omnilogic/+/+/set",
      "omnilogic/+/+/+/set",
    ]);
    this.#client.publish(BRIDGE_TOPIC, "online", { retain: true });
    this.#client.publish(
      CONTROLLER_TOPIC,
      this.#online ? "online" : "offline",
      { retain: true },
    );
    this.#publishDiscovery();
    this.#publishStates();
  };

  #publishStates() {
    for (const device of this.#devices ?? []) {
      this.#publishState(device, true);
    }
  }

  start() {
    this.#stopped = false;
    this.#client.on("connect", this.#onConnect);
    this.#client.on("message", (topic, payload, packet) => {
      if (packet.retain && !topic.startsWith("homeassistant/")) {
        return;
      }
      this.handle(topic, payload.toString()).catch((error: unknown) => {
        this.#log.warn(`${topic}: ${messageOf(error)}`);
      });
    });
    if (this.#client.connected) {
      this.#onConnect();
    }
    const { pollInterval, diagnosticsInterval } = this.#options;
    this.poll()
      .then((polled) =>
        polled && diagnosticsInterval > 0 ? this.pollCommandReads() : undefined,
      )
      .catch(this.#warnUnexpected);
    this.#timers.push(
      setInterval(() => {
        this.poll().catch(this.#warnUnexpected);
      }, pollInterval * 1000),
    );
    if (diagnosticsInterval > 0) {
      this.#timers.push(
        setInterval(() => {
          this.pollCommandReads().catch(this.#warnUnexpected);
        }, diagnosticsInterval * 1000),
      );
    }
  }

  stop() {
    this.#stopped = true;
    for (const timer of [...this.#timers, ...this.#settleTimers]) {
      clearTimeout(timer);
    }
    this.#timers = [];
    this.#settleTimers = [];
    this.#pendingReads.clear();
    this.#client.publish(BRIDGE_TOPIC, "offline", { retain: true });
  }
}
