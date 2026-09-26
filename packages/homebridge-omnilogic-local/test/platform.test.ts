import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  type Accessory,
  Characteristic,
  Service,
} from "@homebridge/hap-nodejs";
import {
  OmniLogic,
  parseConfig,
  type Telemetry,
} from "@rygine/omnilogic-local-sdk";

import { OmniLogicPlatform } from "@/platform";

import { fakeApi } from "./api";
import { configXml } from "./fixtures";
import { read, recordingLog, silentLog } from "./hap";
import { testSession } from "./session";
import { telemetryFixture } from "./telemetry";

const config = {
  platform: "OmniLogicLocal",
  controllers: [
    {
      host: "127.0.0.1",
      accessories: [
        {
          id: "filter1",
          type: "filterFan",
          equipment: 3,
          name: "Pool Filter Pump",
        },
        {
          id: "heater1",
          type: "heaterThermostat",
          equipment: 4,
          name: "Pool Heater",
        },
        { id: "light1", type: "light", equipment: 8, name: "Pool Light" },
        { id: "light77", type: "light", equipment: 77, name: "Gone Light" },
        {
          id: "relay1",
          type: "relaySwitch",
          equipment: 22,
          name: "Spa Blower",
        },
        {
          id: "water1",
          type: "waterTemp",
          equipment: 1,
          name: "Pool Water Temperature Sensor",
        },
        {
          id: "air1",
          type: "airTemp",
          equipment: 0,
          name: "Backyard Air Temperature Sensor",
        },
      ],
    },
  ],
};

// the one controller block with these accessories instead
const only = (...accessories: Record<string, unknown>[]) => ({
  ...config,
  controllers: [{ ...config.controllers[0]!, accessories }],
});

// homebridge whose storage holds a heater deadline saved before a restart
const savedTimer = (deadline: number) => {
  const dir = mkdtempSync(join(tmpdir(), "omni-"));
  const file = join(dir, "omnilogic-local-timers.json");
  writeFileSync(file, JSON.stringify({ "heater:4": deadline }));
  const api = fakeApi();
  api.api.user.storagePath = () => dir;
  return { api, saved: () => JSON.parse(readFileSync(file, "utf8")) };
};

const timedHeater = {
  id: "heater1",
  type: "heaterThermostat",
  equipment: 4,
  name: "Pool Heater",
  offAfter: 5,
};

describe("OmniLogicPlatform", () => {
  afterEach(() => vi.useRealTimers());

  it("registers one accessory per configured entry, named by the config", async () => {
    const api = fakeApi();
    void new OmniLogicPlatform(
      silentLog,
      config,
      api.api,
      () => testSession().session,
    );
    await api.launch();
    expect(api.registered.map((a) => a.displayName)).toEqual([
      "Pool Filter Pump",
      "Pool Heater",
      "Pool Light",
      "Spa Blower",
      "Pool Water Temperature Sensor",
      "Backyard Air Temperature Sensor",
    ]);
    expect(
      api.registered[0]!.getService(Service.Fan)!.getCharacteristic(
        Characteristic.Name,
      ).value,
    ).toBe("Pool Filter Pump");
    expect(api.registered[1]!.getService(Service.Thermostat)).toBeDefined();
    await api.shutdown();
  });

  it("registers several accessories on one piece of equipment", async () => {
    const api = fakeApi();
    void new OmniLogicPlatform(
      silentLog,
      only(
        {
          id: "filter1",
          type: "filterFan",
          equipment: 3,
          name: "Pool Filter Pump",
        },
        {
          id: "filter2",
          type: "filterSwitch",
          equipment: 3,
          name: "Pool Filter Pump High",
          onSpeed: "high",
        },
      ),
      api.api,
      () => testSession().session,
    );
    await api.launch();
    expect(api.registered.map((a) => a.displayName)).toEqual([
      "Pool Filter Pump",
      "Pool Filter Pump High",
    ]);
    expect(api.registered[0]!.getService(Service.Fan)).toBeDefined();
    expect(api.registered[1]!.getService(Service.Switch)).toBeDefined();
    await api.shutdown();
  });

  it("describes every accessory as Unknown", async () => {
    const api = fakeApi();
    void new OmniLogicPlatform(
      silentLog,
      config,
      api.api,
      () => testSession().session,
    );
    await api.launch();
    const value = (i: number, c: typeof Characteristic.Model) =>
      (api.registered[i] as unknown as Accessory)
        .getService(Service.AccessoryInformation)!
        .getCharacteristic(c).value;
    expect(value(0, Characteristic.Manufacturer)).toBe("Unknown");
    expect(value(0, Characteristic.Model)).toBe("Unknown");
    expect(value(1, Characteristic.Manufacturer)).toBe("Unknown");
    expect(value(1, Characteristic.Model)).toBe("Unknown");
    await api.shutdown();
  });

  it.each([
    {
      entry: {
        id: "filter1",
        type: "filterSwitch",
        equipment: 3,
        name: "Pool Filter Pump",
      },
      was: Service.Fan,
    },
    {
      entry: {
        id: "light1",
        type: "lightSwitch",
        equipment: 8,
        name: "Pool Light",
        show: 6,
      },
      was: Service.Lightbulb,
    },
    {
      entry: {
        id: "heater1",
        type: "heaterSwitch",
        equipment: 4,
        name: "Pool Heater",
        setPoint: 88,
      },
      was: Service.Thermostat,
    },
  ])(
    "a $entry.type entry is a Switch, the cached service making way for it",
    async ({ entry, was }) => {
      const api = fakeApi();
      const platform = new OmniLogicPlatform(
        silentLog,
        only(entry),
        api.api,
        () => testSession().session,
      );
      const cached = api.cached(entry.name, { id: entry.id });
      (cached as unknown as Accessory).addService(was);
      platform.configureAccessory(cached);
      await api.launch();
      const services = (cached as unknown as Accessory).services;
      expect(services.some((s) => s.UUID === Service.Switch.UUID)).toBe(true);
      expect(services.some((s) => s.UUID === was.UUID)).toBe(false);
      await api.shutdown();
    },
  );

  it("logs the controller and each accessory it sets up", async () => {
    const api = fakeApi();
    const { lines: messages, log } = recordingLog();
    void new OmniLogicPlatform(
      log,
      only({
        id: "pump1",
        type: "filterSwitch",
        equipment: 3,
        name: "Pool Filter Pump High",
        onSpeed: "high",
      }),
      api.api,
      () => testSession().session,
    );
    await api.launch();
    expect(messages).toContain(
      "127.0.0.1: connected, 13 pieces of equipment found",
    );
    expect(messages).toContain("Pool Filter Pump High: added");
    await api.shutdown();
  });

  it("drops an entry whose equipment is not on the controller", async () => {
    const api = fakeApi();
    const { lines: messages, log } = recordingLog();
    void new OmniLogicPlatform(
      log,
      config,
      api.api,
      () => testSession().session,
    );
    await api.launch();
    expect(messages).toContain(
      "Gone Light: dropped, light 77 is not on the controller at 127.0.0.1; re-add it on the settings page",
    );
    await api.shutdown();
  });

  it("removes a theme from HomeKit at the poll that finds it gone", async () => {
    const api = fakeApi();
    const { lines: messages, log } = recordingLog();
    let xml = configXml();
    const t = testSession({ config: () => xml });
    void new OmniLogicPlatform(
      log,
      only({
        id: "theme1",
        type: "themeSwitch",
        equipment: 29,
        name: "Party Theme",
      }),
      api.api,
      () => t.session,
    );
    await api.launch();
    expect(api.registered.map((a) => a.displayName)).toEqual(["Party Theme"]);
    xml = xml.replace(/<Groups>[\s\S]*<\/Groups>/, "");
    // the controller announces a changed config through the checksum
    t.telemetry.backyard.configChksum += 1;
    await t.session.refresh();
    expect(api.unregistered.map((a) => a.displayName)).toEqual(["Party Theme"]);
    expect(messages.at(-1)).toBe(
      "Party Theme: no longer on the controller, removed from HomeKit",
    );
    await api.shutdown();
  });

  it("a theme entry is a Switch named by the config", async () => {
    const api = fakeApi();
    void new OmniLogicPlatform(
      silentLog,
      only({
        id: "theme1",
        type: "themeSwitch",
        equipment: 29,
        name: "Party Theme",
        offAfter: 30,
      }),
      api.api,
      () => testSession().session,
    );
    await api.launch();
    expect(api.registered.map((a) => a.displayName)).toEqual(["Party Theme"]);
    expect(api.registered[0]!.getService(Service.Switch)).toBeDefined();
    await api.shutdown();
  });

  it("a heater with an off timer is turned off when the timer fires", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    const api = fakeApi();
    const t = testSession();
    void new OmniLogicPlatform(
      silentLog,
      only({
        id: "heater1",
        type: "heaterThermostat",
        equipment: 4,
        name: "Pool Heater",
        offAfter: 5,
      }),
      api.api,
      () => t.session,
    );
    await api.launch();
    const thermostat = api.registered[0]!.getService(Service.Thermostat)!;
    await thermostat
      .getCharacteristic(Characteristic.TargetHeatingCoolingState)
      .handleSetRequest(1);
    const before = t.sent.length;
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    expect(
      t.sent.slice(before).map((s) => [s.name, s.params.data]),
    ).toContainEqual(["SetHeaterEnable", 0]);
    await api.shutdown();
  });

  it("keeps one off timer for two accessories on the same heater", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    const api = fakeApi();
    const t = testSession();
    void new OmniLogicPlatform(
      silentLog,
      only(
        {
          id: "heater1",
          type: "heaterThermostat",
          equipment: 4,
          name: "Pool Heater",
          offAfter: 5,
        },
        {
          id: "heater2",
          type: "heaterSwitch",
          equipment: 4,
          name: "Pool Heater On",
          offAfter: 5,
        },
      ),
      api.api,
      () => t.session,
    );
    await api.launch();
    await api.registered[0]!.getService(Service.Thermostat)!
      .getCharacteristic(Characteristic.TargetHeatingCoolingState)
      .handleSetRequest(1);
    await api.registered[1]!.getService(Service.Switch)!
      .getCharacteristic(Characteristic.On)
      .handleSetRequest(false);
    const before = t.sent.length;
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    expect(t.sent.slice(before)).toEqual([]);
    await api.shutdown();
  });

  it("resumes a saved heater timer after a restart and a host change", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    const { api } = savedTimer(Date.now() + 5 * 60_000);
    const t = testSession();
    t.telemetry.virtualHeaters[0]!.enable = 1;
    void new OmniLogicPlatform(
      silentLog,
      {
        ...config,
        controllers: [{ host: "192.168.1.100", accessories: [timedHeater] }],
      },
      api.api,
      () => t.session,
    );
    await api.launch();
    expect(t.sent).toEqual([]);
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    expect(t.sent.map((s) => [s.name, s.params.data])).toContainEqual([
      "SetHeaterEnable",
      0,
    ]);
    await api.shutdown();
  });

  it("cancels a saved heater timer when the first read finds the heater off", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    const { api, saved } = savedTimer(Date.now() + 5 * 60_000);
    const t = testSession();
    void new OmniLogicPlatform(
      silentLog,
      only(timedHeater),
      api.api,
      () => t.session,
    );
    await api.launch();
    expect(saved()).toEqual({});
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    expect(t.sent).toEqual([]);
    await api.shutdown();
  });

  it("drops an entry whose id another entry already uses", async () => {
    const api = fakeApi();
    const { lines: messages, log } = recordingLog();
    void new OmniLogicPlatform(
      log,
      only(
        {
          id: "dup",
          type: "filterFan",
          equipment: 3,
          name: "Pool Filter Pump",
        },
        { id: "dup", type: "relaySwitch", equipment: 22, name: "Spa Blower" },
      ),
      api.api,
      () => testSession().session,
    );
    await api.launch();
    expect(api.registered.map((a) => a.displayName)).toEqual([
      "Pool Filter Pump",
    ]);
    expect(messages).toContain(
      "Spa Blower: dropped, another accessory already uses id dup; re-add it on the settings page",
    );
    await api.shutdown();
  });

  it("drops a light switch entry with no show to turn on to", async () => {
    const api = fakeApi();
    const { lines: messages, log } = recordingLog();
    void new OmniLogicPlatform(
      log,
      only({
        id: "light1",
        type: "lightSwitch",
        equipment: 8,
        name: "Pool Light",
      }),
      api.api,
      () => testSession().session,
    );
    await api.launch();
    expect(api.registered).toEqual([]);
    expect(messages).toContain(
      "Pool Light: dropped, show is missing at 127.0.0.1; re-add it on the settings page",
    );
    await api.shutdown();
  });

  it("restores a cached accessory instead of registering it again, and drops one no longer configured or no longer on the controller", async () => {
    const api = fakeApi();
    const platform = new OmniLogicPlatform(
      silentLog,
      config,
      api.api,
      () => testSession().session,
    );
    platform.configureAccessory(
      api.cached("Pool Filter Pump", { id: "filter1" }),
    );
    platform.configureAccessory(api.cached("Old Relay", { id: "relay99" }));
    platform.configureAccessory(api.cached("Gone Light", { id: "light77" }));
    await api.launch();
    expect(api.registered.map((a) => a.displayName)).not.toContain(
      "Pool Filter Pump",
    );
    expect(api.unregistered.map((a) => a.displayName).toSorted()).toEqual([
      "Gone Light",
      "Old Relay",
    ]);
    expect(api.updated).toEqual([]);
    await api.shutdown();
  });

  it("renames a cached accessory when the config gives it a new name", async () => {
    const api = fakeApi();
    const platform = new OmniLogicPlatform(
      silentLog,
      config,
      api.api,
      () => testSession().session,
    );
    const cached = api.cached("Pool Lights", { id: "light1" });
    const bulb = (cached as unknown as Accessory).addService(Service.Lightbulb);
    platform.configureAccessory(cached);
    await api.launch();
    expect(cached.displayName).toBe("Pool Light");
    expect(bulb.getCharacteristic(Characteristic.Name).value).toBe(
      "Pool Light",
    );
    expect(
      (cached as unknown as Accessory)
        .getService(Service.AccessoryInformation)!
        .getCharacteristic(Characteristic.Name).value,
    ).toBe("Pool Light");
    expect(api.updated).toContain(cached);
    await api.shutdown();
  });

  it("keys an accessory on its id alone, so a host change keeps it", async () => {
    const api = fakeApi();
    const cached = api.cached("Pool Lights", { id: "light1" });
    const moved = {
      ...config,
      controllers: [{ ...config.controllers[0]!, host: "192.168.1.100" }],
    };
    const platform = new OmniLogicPlatform(
      silentLog,
      moved,
      api.api,
      () => testSession().session,
    );
    platform.configureAccessory(cached);
    await api.launch();
    expect(api.unregistered).toEqual([]);
    expect(api.registered.map((a) => a.UUID)).not.toContain(cached.UUID);
    await api.shutdown();
  });

  it("keeps a cached accessory while the controller is unreachable, and wires it once the controller answers", async () => {
    const api = fakeApi();
    const t = testSession();
    t.omni.fetchTelemetry = () => Promise.reject(new Error("timeout"));
    const platform = new OmniLogicPlatform(
      silentLog,
      config,
      api.api,
      () => t.session,
    );
    const cached = api.cached("Pool Filter Pump", { id: "filter1" });
    // homebridge restores an accessory with the services it had last run
    const fan = cached.addService(api.api.hap.Service.Fan);
    const fault = fan.getCharacteristic(api.api.hap.Characteristic.StatusFault);
    platform.configureAccessory(cached);
    await api.launch();
    expect(api.unregistered).toEqual([]);
    expect(api.registered).toEqual([]);
    expect(fault.value).toBe(1);
    t.omni.fetchTelemetry = <R extends boolean = false>(_options?: {
      raw?: R;
    }) => Promise.resolve(t.telemetry as R extends true ? string : Telemetry);
    await t.session.refresh();
    expect(api.registered.map((a) => a.displayName)).toContain("Pool Heater");
    expect(fault.value).toBe(0);
    await api.shutdown();
  });

  it("removes a cached accessory the controller no longer has once it answers", async () => {
    const api = fakeApi();
    const { lines: messages, log } = recordingLog();
    const t = testSession();
    t.omni.fetchTelemetry = () => Promise.reject(new Error("timeout"));
    const platform = new OmniLogicPlatform(
      log,
      config,
      api.api,
      () => t.session,
    );
    platform.configureAccessory(api.cached("Gone Light", { id: "light77" }));
    await api.launch();
    expect(api.unregistered).toEqual([]);
    t.omni.fetchTelemetry = <R extends boolean = false>(_options?: {
      raw?: R;
    }) => Promise.resolve(t.telemetry as R extends true ? string : Telemetry);
    await t.session.refresh();
    expect(api.unregistered.map((a) => a.displayName)).toEqual(["Gone Light"]);
    expect(messages).toContain(
      "Gone Light: no longer on the controller, removed from HomeKit",
    );
    await api.shutdown();
  });

  it("reads telemetry on every poll and the configuration once", async () => {
    const telemetry = vi
      .spyOn(OmniLogic.prototype, "fetchTelemetry")
      .mockResolvedValue(telemetryFixture());
    const configuration = vi
      .spyOn(OmniLogic.prototype, "fetchConfig")
      .mockResolvedValue(parseConfig(configXml()));
    const api = fakeApi();
    void new OmniLogicPlatform(
      silentLog,
      only({ id: "air1", type: "airTemp", equipment: 0, name: "Air" }),
      api.api,
    );
    // the launch reads once and the first poll reads again
    await api.launch();
    await vi.waitFor(() => expect(telemetry).toHaveBeenCalledTimes(2));
    expect(configuration).toHaveBeenCalledTimes(1);
    await api.shutdown();
    telemetry.mockRestore();
    configuration.mockRestore();
  });

  it("drops a controller block with no host and keeps the rest", async () => {
    const api = fakeApi();
    const { log, lines: messages } = recordingLog();
    void new OmniLogicPlatform(
      log,
      { ...config, controllers: [{ port: 10444 }, ...config.controllers] },
      api.api,
      () => testSession().session,
    );
    await api.launch();
    expect(messages).toContain(
      "a controller block: dropped, host undefined is not an IPv4 address or a host name",
    );
    expect(api.registered).toHaveLength(6);
    await api.shutdown();
  });

  it("keeps the accessories and wires again on the next refresh when the first wiring throws", async () => {
    const api = fakeApi();
    const { log, lines: messages } = recordingLog();
    const t = testSession({ log });
    const platform = new OmniLogicPlatform(
      log,
      config,
      api.api,
      () => t.session,
    );
    platform.configureAccessory(
      api.cached("Pool Filter Pump", { id: "filter1" }),
    );
    platform.configureAccessory(api.cached("Old Relay", { id: "relay99" }));
    const register = api.api.registerPlatformAccessories;
    api.api.registerPlatformAccessories = () => {
      throw new Error("register failed");
    };
    await api.launch();
    expect(
      messages.some((m) =>
        m.includes(
          "could not set up the accessories, trying again at the next poll: Error: register failed",
        ),
      ),
    ).toBe(true);
    expect(api.unregistered.map((a) => a.displayName)).toEqual(["Old Relay"]);
    api.api.registerPlatformAccessories = register;
    await t.session.refresh();
    expect(api.registered.map((a) => a.displayName)).toContain("Pool Heater");
    await api.shutdown();
  });

  it("wires again on the next refresh when wiring throws", async () => {
    const api = fakeApi();
    const { log, lines: messages } = recordingLog();
    const t = testSession({ log });
    t.omni.fetchTelemetry = () => Promise.reject(new Error("timeout"));
    void new OmniLogicPlatform(log, config, api.api, () => t.session);
    await api.launch();
    t.omni.fetchTelemetry = <R extends boolean = false>(_options?: {
      raw?: R;
    }) => Promise.resolve(t.telemetry as R extends true ? string : Telemetry);
    const register = api.api.registerPlatformAccessories;
    api.api.registerPlatformAccessories = () => {
      throw new Error("register failed");
    };
    await t.session.refresh();
    expect(api.registered).toEqual([]);
    expect(t.session.faulted).toBe(false);
    expect(
      messages.some((m) =>
        m.includes(
          "could not set up the accessories, trying again at the next poll: Error: register failed",
        ),
      ),
    ).toBe(true);
    api.api.registerPlatformAccessories = register;
    await t.session.refresh();
    expect(api.registered.map((a) => a.displayName)).toContain("Pool Heater");
    await api.shutdown();
  });

  it("wiring that throws partway leaves each accessory and each handle once", async () => {
    const api = fakeApi();
    const t = testSession();
    t.omni.fetchTelemetry = () => Promise.reject(new Error("timeout"));
    const platform = new OmniLogicPlatform(
      silentLog,
      config,
      api.api,
      () => t.session,
    );
    const cached = api.cached("Pool Filter Pump", { id: "filter1" });
    const fan = cached.addService(api.api.hap.Service.Fan);
    platform.configureAccessory(cached);
    await api.launch();
    t.omni.fetchTelemetry = <R extends boolean = false>(_options?: {
      raw?: R;
    }) => Promise.resolve(t.telemetry as R extends true ? string : Telemetry);
    const register = api.api.registerPlatformAccessories;
    api.api.registerPlatformAccessories = () => {
      throw new Error("register failed");
    };
    await t.session.refresh();
    api.api.registerPlatformAccessories = register;
    await t.session.refresh();
    const on = vi.spyOn(
      fan.getCharacteristic(api.api.hap.Characteristic.On),
      "updateValue",
    );
    await t.session.refresh();
    expect(on).toHaveBeenCalledTimes(1);
    const fault = vi.spyOn(
      fan.getCharacteristic(api.api.hap.Characteristic.StatusFault),
      "updateValue",
    );
    t.omni.fetchTelemetry = () => Promise.reject(new Error("timeout"));
    await t.session.refresh();
    expect(fault).toHaveBeenCalledTimes(1);
    await api.shutdown();
  });

  it("marks every accessory faulted while the controller does not answer", async () => {
    vi.useFakeTimers();
    const api = fakeApi();
    const t = testSession();
    void new OmniLogicPlatform(silentLog, config, api.api, () => t.session);
    await api.launch();
    t.omni.fetchTelemetry = () => Promise.reject(new Error("timeout"));
    // an unforced poll refetches once its telemetry is a second old
    vi.setSystemTime(Date.now() + 2000);
    await t.session.refresh();
    const fan = api.registered[0]!.getService(Service.Fan)!;
    expect(read(fan, Characteristic.StatusFault)).toBe(1);
    await api.shutdown();
  });
});
