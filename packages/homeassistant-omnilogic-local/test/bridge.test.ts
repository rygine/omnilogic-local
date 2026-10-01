import { mkdtemp, readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { Telemetry } from "@rygine/omnilogic-local-sdk";

import { Bridge, type BridgeOptions } from "@/bridge";
import { logger } from "@/utils";

import { fakeClient } from "./mqtt";
import { configXml, reply, silent, telemetryFixture, testOmni } from "./omni";

const CONTROLLER = "homeassistant/device/omnilogic_controller/config";

const setup = (
  opts: Parameters<typeof testOmni>[0] = {},
  overrides: Partial<BridgeOptions> = {},
) => {
  const t = testOmni(opts);
  const mqtt = fakeClient();
  const bridge = new Bridge(t.omni, mqtt.client, {
    pollInterval: 10,
    diagnosticsInterval: 600,
    stateDir: "/nonexistent",
    api: undefined,
    disableImportedSchedules: false,
    speedUnit: "rpm",
    host: "192.168.1.100",
    diagnosticsDir: "/nonexistent",
    log: silent,
    ...overrides,
  });
  return { ...t, ...mqtt, bridge };
};

// the controller device's discovery components
const cmps = (t: ReturnType<typeof setup>) =>
  t.json(CONTROLLER)!.cmps as Record<string, Record<string, unknown>>;

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("polling", () => {
  it("publishes retained discovery and state, sharing a poll between overlapping callers and republishing only a changed state", async () => {
    const t = setup();
    const refresh = vi.spyOn(t.omni, "refresh");

    await Promise.all([t.bridge.poll(), t.bridge.poll()]);
    expect(refresh).toHaveBeenCalledTimes(1);

    const config = t.json(CONTROLLER)!;
    expect(t.published.find((p) => p.topic === CONTROLLER)?.retain).toBe(true);
    expect(config.dev).toMatchObject({
      identifiers: ["omnilogic_controller"],
      name: "OmniLogic",
      manufacturer: "Hayward",
    });
    expect(config.o).toMatchObject({ name: "OmniLogicLocal" });
    expect(config.availability_mode).toBe("all");
    expect(cmps(t).air_temperature).toEqual({
      p: "sensor",
      unique_id: "omnilogic_controller_air_temperature",
      default_entity_id: "sensor.omnilogic_air_temperature",
      name: "Air temperature",
      state_topic: "omnilogic/controller/state",
      value_template: "{{ value_json.air_temperature }}",
      device_class: "temperature",
      unit_of_measurement: "°F",
      state_class: "measurement",
    });
    // availability follows the bridge alone
    expect(cmps(t).connected).toMatchObject({
      p: "binary_sensor",
      device_class: "connectivity",
      state_topic: "omnilogic/controller",
      payload_on: "online",
      payload_off: "offline",
      availability: [{ topic: "omnilogic/bridge" }],
    });

    expect(t.json("omnilogic/controller/state")).toMatchObject({
      air_temperature: 78,
      system_state: "On",
    });

    const count = t.published.length;
    await t.bridge.poll();
    expect(t.published.length).toBe(count);
  });

  it("reads null while the controller is off or in service mode, and the poll still succeeds", async () => {
    for (const [state, label] of [
      [0, "Off"],
      [2, "Service Mode"],
    ] as const) {
      const telemetry = telemetryFixture();
      telemetry.backyard.state = state;
      const { bridge, json } = setup({ telemetry });

      const polled = await bridge.poll();
      expect([label, polled, json("omnilogic/controller/state")]).toMatchObject(
        [label, true, { air_temperature: null, system_state: label }],
      );
    }
  });

  it("reads command reads into state in one pass shared between overlapping callers", async () => {
    const { bridge, json, sent } = setup({
      replies: {
        GetHeaterAutoDifferential: reply(
          "UIGetHeaterAutoDifferentialRsp",
          1,
          4,
          2,
        ),
        GetUIFilterDiagnosticInfo: reply(
          "GetUIFilterDiagnosticInfoRsp",
          // every parameter zero
          ...Array.from({ length: 17 }, () => 0),
        ),
      },
    });
    await bridge.poll();

    await Promise.all([bridge.pollCommandReads(), bridge.pollCommandReads()]);
    // one read per heater
    expect(
      sent.filter((s) => s.name === "GetHeaterAutoDifferential"),
    ).toHaveLength(2);

    expect(json("omnilogic/4/state")?.auto_differential).toBe(2);
    expect(json("omnilogic/3/state")?.drive_diagnostics).toMatchObject({
      errorStatus: 0,
    });
  });

  it("skips command reads while the controller is not answering", async () => {
    const { bridge, omni, sent } = setup();
    await bridge.poll();
    vi.spyOn(omni, "refresh").mockRejectedValueOnce(new Error("timeout"));
    await bridge.poll();

    await bridge.pollCommandReads();
    expect(sent.filter((s) => s.name === "GetHeaterAutoDifferential")).toEqual(
      [],
    );
  });
});

describe("writes", () => {
  it("routes a set topic and a named field to the entity and re-reads, and ignores a set topic nothing listens on", async () => {
    const { bridge, omni, sent } = setup();
    await bridge.poll();
    const refresh = vi.spyOn(omni, "refresh");

    await bridge.handle("omnilogic/3/speed/set", "0");
    expect(sent.at(-1)).toMatchObject({
      name: "SetUIEquipmentCmd",
      params: { poolId: 1, equipmentId: 3, isOn: 0 },
    });
    expect(refresh).toHaveBeenCalled();

    await bridge.handle("omnilogic/4/thermostat/target/set", "80.0");
    expect(sent.at(-1)).toMatchObject({
      name: "SetUIHeaterCmd",
      params: { data: 80 },
    });

    const count = sent.length;
    await bridge.handle("omnilogic/999/speed/set", "1");
    expect(sent.length).toBe(count);
    bridge.stop();
  });

  it("sends one write at a time, so each starts from what the one before it left", async () => {
    const { bridge, omni } = setup();
    await bridge.poll();
    const order: string[] = [];
    let release = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const command = omni.command.bind(omni);
    vi.spyOn(omni, "command").mockImplementation(async (...args) => {
      const name = args[0];
      order.push(`start ${name}`);
      if (name === "SetHeaterAutoDifferential") {
        await held;
      }
      const result = await command(...args);
      order.push(`end ${name}`);
      return result;
    });

    const first = bridge.handle("omnilogic/4/auto_differential/set", "3");
    const second = bridge.handle("omnilogic/3/speed/set", "70");
    await vi.waitFor(() =>
      expect(order).toContain("start SetHeaterAutoDifferential"),
    );
    expect(order).not.toContain("start SetUIEquipmentCmd");

    release();
    await Promise.all([first, second]);
    expect(order.filter((o) => o.includes(" Set"))).toEqual([
      "start SetHeaterAutoDifferential",
      "end SetHeaterAutoDifferential",
      "start SetUIEquipmentCmd",
      "end SetUIEquipmentCmd",
    ]);
    bridge.stop();
  });

  it("re-reads again at 2, 10, 30, and 60 s, keeping an earlier write's command read pending through a later write", async () => {
    vi.useFakeTimers();
    const { bridge, omni, sent } = setup({
      replies: {
        GetHeaterAutoDifferential: reply(
          "UIGetHeaterAutoDifferentialRsp",
          1,
          4,
          2,
        ),
      },
    });
    const differentialReads = () =>
      sent.filter((s) => s.name === "GetHeaterAutoDifferential").length;
    await bridge.poll();
    const refresh = vi.spyOn(omni, "refresh");

    await bridge.handle("omnilogic/4/auto_differential/set", "3");
    await bridge.handle("omnilogic/3/speed/set", "70");
    // the immediate re-reads finish before the first delay
    await vi.advanceTimersByTimeAsync(1000);
    const reads = differentialReads();
    const polls = refresh.mock.calls.length;

    await vi.advanceTimersByTimeAsync(1000);
    expect(differentialReads()).toBeGreaterThan(reads);

    for (const ms of [8000, 20000, 30000]) {
      await vi.advanceTimersByTimeAsync(ms);
    }
    expect(refresh.mock.calls.length).toBe(polls + 4);
    bridge.stop();
  });

  it("warns on a rejected value and snaps it back without throwing", async () => {
    const warn = vi.fn();
    const t = setup({}, { log: { ...silent, warn } });
    await t.bridge.poll();
    const before = t.published.length;

    await t.bridge.handle("omnilogic/3/speed/set", "fast");
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('"fast" is not a number'),
    );
    expect(
      t.published.slice(before).some((p) => p.topic === "omnilogic/3/state"),
    ).toBe(true);
    t.bridge.stop();
  });

  it("ignores a retained command, and clears a retained device the configuration no longer has, with its state", async () => {
    const t = setup();
    t.bridge.start();
    await t.bridge.poll();

    t.message("omnilogic/3/speed/set", "70", true);
    t.message("homeassistant/device/omnilogic_77/config", "{}", true);
    t.message("omnilogic/3/speed/set", "60");
    await vi.waitFor(() => {
      expect(t.sent.some((s) => s.name === "SetUIEquipmentCmd")).toBe(true);
    });

    expect(
      t.sent
        .filter((s) => s.name === "SetUIEquipmentCmd")
        .map((s) => s.params.isOn),
    ).toEqual([60]);
    expect(t.last("homeassistant/device/omnilogic_77/config")).toBe("");
    expect(t.last("omnilogic/77/state")).toBe("");
    t.bridge.stop();
  });
});

describe("availability", () => {
  it("says the bridge is online on connect, republishes discovery and state when the broker comes back, and says offline on stop", async () => {
    const t = setup();

    t.bridge.start();
    expect(t.published.find((p) => p.topic === "omnilogic/bridge")).toEqual({
      topic: "omnilogic/bridge",
      payload: "online",
      retain: true,
    });
    expect(t.published.find((p) => p.topic === "omnilogic/controller")).toEqual(
      { topic: "omnilogic/controller", payload: "offline", retain: true },
    );

    await t.bridge.poll();
    const before = t.published.length;
    t.connect();
    expect(t.published.slice(before).map((p) => p.topic)).toEqual(
      expect.arrayContaining([
        "omnilogic/bridge",
        "omnilogic/controller",
        CONTROLLER,
        "omnilogic/controller/state",
      ]),
    );

    t.bridge.stop();
    expect(t.last("omnilogic/bridge")).toBe("offline");
  });

  it("says when it connects to the broker and how many devices it publishes", async () => {
    const info = vi.fn();
    const t = setup({}, { log: { ...silent, info } });

    t.bridge.start();
    expect(info).toHaveBeenCalledWith("connected to the MQTT broker");
    await t.bridge.poll();
    expect(info).toHaveBeenCalledWith(
      expect.stringMatching(/^published \d+ devices with \d+ entities$/),
    );
    t.bridge.stop();
  });

  it("follows the controller, warning once when it stops answering and saying once when it answers again", async () => {
    const warn = vi.fn();
    const info = vi.fn();
    const t = setup(
      {},
      { diagnosticsInterval: 0, log: { ...silent, warn, info } },
    );

    expect(await t.bridge.poll()).toBe(true);
    expect(t.last("omnilogic/controller")).toBe("online");

    vi.spyOn(t.omni, "refresh")
      .mockRejectedValueOnce(new Error("timeout"))
      .mockRejectedValueOnce(new Error("timeout"));
    expect(await t.bridge.poll()).toBe(false);
    expect(await t.bridge.poll()).toBe(false);
    expect(t.last("omnilogic/controller")).toBe("offline");
    expect(warn).toHaveBeenCalledTimes(1);

    expect(await t.bridge.poll()).toBe(true);
    expect(await t.bridge.poll()).toBe(true);
    expect(t.last("omnilogic/controller")).toBe("online");
    expect(
      info.mock.calls.filter(([line]) => line === "controller answering again"),
    ).toHaveLength(1);
  });

  it("warns on an unexpected error instead of ending the process", async () => {
    const warn = vi.fn();
    const t = setup({}, { log: { ...silent, warn } });
    vi.spyOn(t.omni, "backyard", "get").mockImplementation(() => {
      throw new TypeError("boom");
    });

    t.bridge.start();
    await vi.waitFor(() => {
      expect(warn).toHaveBeenCalledWith("unexpected error: boom");
    });
    t.bridge.stop();
  });

  it("republishes state, not discovery, after Home Assistant's birth and a short delay, and cancels that on stop", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const t = setup();
    await t.bridge.poll();
    const before = t.published.length;

    await t.bridge.handle("homeassistant/status", "online");
    expect(t.published.length).toBe(before);
    await vi.advanceTimersByTimeAsync(2500);
    const after = t.published.slice(before).map((p) => p.topic);
    expect(after).toContain("omnilogic/controller/state");
    expect(after.some((topic) => topic.startsWith("homeassistant/"))).toBe(
      false,
    );

    await t.bridge.handle("homeassistant/status", "online");
    t.bridge.stop();
    const stopped = t.published.length;
    await vi.advanceTimersByTimeAsync(5000);
    expect(t.published.length).toBe(stopped);
  });
});

describe("configuration changes", () => {
  it("removes a component an earlier bridge published, from the broker's retained discovery, before and after the first publish", async () => {
    // what an earlier version left retained: one component this one no longer has
    const earlier = JSON.stringify({
      dev: { identifiers: ["omnilogic_controller"] },
      cmps: {
        theme_28_delete: {
          p: "button",
          unique_id: "omnilogic_controller_theme_28_delete",
        },
      },
    });

    const before = setup();
    await before.bridge.handle(CONTROLLER, earlier);
    await before.bridge.poll();
    expect(cmps(before).theme_28_delete).toEqual({ p: "button" });

    const after = setup();
    await after.bridge.poll();
    const published = () =>
      after.published.filter((p) => p.topic === CONTROLLER).length;
    const count = published();
    await after.bridge.handle(CONTROLLER, earlier);
    expect(published()).toBe(count + 1);
    expect(cmps(after).theme_28_delete).toEqual({ p: "button" });

    // the bridge's own discovery coming back changes nothing
    await after.bridge.handle(CONTROLLER, after.last(CONTROLLER)!);
    expect(published()).toBe(count + 1);
  });

  it("rebuilds discovery when the configuration changes, clearing a removed device", async () => {
    let xml = configXml();
    const telemetry = telemetryFixture();
    const t = setup({ config: () => xml, telemetry });
    await t.bridge.poll();
    await t.bridge.handle("homeassistant/device/omnilogic_22/config", "{}");

    // remove the blower relay
    xml = xml.replace(/<Relay>[\s\S]*?<\/Relay>/, "");
    telemetry.backyard.configChksum = 2;
    telemetry.relays = [];
    await t.bridge.poll();

    expect(t.last("homeassistant/device/omnilogic_22/config")).toBe("");
  });

  it("rebuilds discovery after the bridge's own verified writes, sending a deleted schedule's components once as their platform", async () => {
    // a controller whose config follows the schedule delete sent
    const t = setup({
      config: () =>
        t.sent.some((s) => s.name === "DeleteUIScheduleCmd")
          ? configXml().replace(
              /<sche>(?:(?!<\/sche>)[\s\S])*<schedule-system-id>21<\/schedule-system-id>[\s\S]*?<\/sche>/,
              "",
            )
          : configXml(),
    });
    t.omni.fetchTelemetry = <R extends boolean = false>(_options?: {
      raw?: R;
    }) => {
      const telemetry = telemetryFixture();
      telemetry.backyard.configChksum = 1 + t.sent.length;
      return Promise.resolve(telemetry as R extends true ? string : Telemetry);
    };
    await t.bridge.poll();
    expect(cmps(t).schedule_21_enabled).toBeDefined();

    await t.bridge.handle(
      "omnilogic/controller/schedule_21_delete/set",
      "PRESS",
    );
    await t.bridge.poll();
    expect(cmps(t).schedule_21_enabled).toEqual({ p: "switch" });
    expect(cmps(t).schedule_21_delete).toEqual({ p: "button" });

    t.bridge.start();
    expect(cmps(t).schedule_21_enabled).toBeUndefined();
    t.bridge.stop();
  });
});

describe("logging", () => {
  it("logs at LOG_LEVEL and above, and from warn when LOG_LEVEL is unset", () => {
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {});
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    vi.stubEnv("LOG_LEVEL", "error");
    logger.warn("hidden");
    vi.stubEnv("LOG_LEVEL", "debug");
    logger.debug("shown");
    expect(warn).not.toHaveBeenCalled();
    expect(debug).toHaveBeenCalledWith("shown");

    vi.stubEnv("LOG_LEVEL", undefined);
    logger.info("hidden");
    logger.warn("shown");
    expect(info).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith("shown");
  });
});

describe("diagnostics", () => {
  it("saves the bridge's settings and the controller's raw configuration, telemetry, and system info to one file, without the units' hardware addresses", async () => {
    const dir = await mkdtemp(join(tmpdir(), "diagnostics-"));
    const t = setup({}, { diagnosticsDir: join(dir, "out") });
    await t.bridge.poll();

    const save = cmps(t).save_diagnostics;
    expect(save).toMatchObject({ p: "button", entity_category: "diagnostic" });
    await t.bridge.handle("omnilogic/controller/save_diagnostics/set", "PRESS");

    const [file] = await readdir(join(dir, "out"));
    expect(file).toMatch(/^diagnostics-.*\.json$/);
    const saved = JSON.parse(
      await readFile(join(dir, "out", file!), "utf8"),
    ) as {
      bridge: Record<string, unknown>;
      controller: Record<string, unknown>;
    };
    expect(saved.bridge).toMatchObject({
      host: "192.168.1.100",
      pollInterval: 10,
      speedUnit: "rpm",
      apiAccess: false,
    });
    expect(saved.bridge).not.toHaveProperty("api");
    expect(saved.bridge.version).toEqual(expect.any(String));
    expect(saved.controller.config).toEqual(
      expect.stringContaining("<MSPConfig"),
    );
    expect(saved.controller.sysinfo).toEqual(
      expect.stringContaining(
        '<Parameter name="HUA" dataType="string">redacted<',
      ),
    );
    expect(saved.controller.sysinfo).not.toMatch(/00-1a-2b-3c-4d/i);
    expect(saved.controller.telemetry).toBeDefined();
  });
});
