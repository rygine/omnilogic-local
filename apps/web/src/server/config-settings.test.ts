import type { OmniLogic } from "@rygine/omnilogic-local-sdk";
import { describe, expect, it } from "vitest";

import { serializeSettings } from "./config-settings";

const stub = (config: unknown): OmniLogic =>
  ({ config }) as unknown as OmniLogic;

const baseConfig = () => ({
  system: {
    units: "Standard",
    mspVspSpeedFormat: "RPM",
    timeZone: -360,
    dst: true,
    internetTime: "on",
    // app display flags the settings leave out
    uiMoodColorEnabled: "Yes",
    uiFilterSimpleMode: "Yes",
  },
  backyard: {
    serviceModeTimeout: 0,
    bodiesOfWater: [
      {
        name: "Pool",
        systemId: 1,
        filter: {
          filterType: "FMT_VARIABLE_SPEED_PUMP",
          primingEnabled: true,
          primingDuration: 120,
          minPrimingInterval: 30,
          noWaterFlowTimeoutTimeout: 900,
          freezeProtectEnable: true,
          freezeProtectTemp: 38,
          freezeProtectSpeed: 80,
          minPumpSpeed: 58,
          maxPumpSpeed: 100,
          minPumpRpm: 2000,
          maxPumpRpm: 3450,
          vspLowPumpSpeed: 58,
          vspHighPumpSpeed: 100,
        },
        heater: {
          enabled: false,
          systemId: 4,
          currentSetPoint: 82,
          minSettableWaterTemp: 65,
          maxSettableWaterTemp: 104,
          maxWaterTemp: 104,
          boostTimeInterval: 3600,
          cooldownEnabled: false,
          extendEnabled: true,
          operations: [
            {
              heaterEquipment: {
                systemId: 5,
                heaterType: "HTR_GAS",
                allowLowSpeedOperation: true,
                minSpeedForOperation: 60,
              },
            },
          ],
        },
        chlorinator: {
          enabled: true,
          cellType: "CELL_TYPE_TCELLS340",
          dispenserType: "SALT_DISPENSING",
          mode: "CHLOR_OP_MODE_TIMED",
          timedPercent: 15,
          orpTimeout: 86400,
        },
        relays: [],
        pumps: [],
        sensors: [],
      },
    ],
  },
});

const settings = (config: unknown) => serializeSettings(stub(config));

const groupTitles = (config: unknown) =>
  settings(config).groups.map((g) => g.title);

const rowValue = (config: unknown, title: string, label: string) =>
  settings(config)
    .groups.find((g) => g.title === title)
    ?.rows.find((r) => r.label === label)?.value;

const rowLabels = (config: unknown, title: string) =>
  settings(config)
    .groups.find((g) => g.title === title)
    ?.rows.map((r) => r.label) ?? [];

describe("serializeSettings", () => {
  it("groups System first, then per-body sections", () => {
    expect(groupTitles(baseConfig())).toEqual([
      "System",
      "Pool · Filter",
      "Pool · Heater",
      "Pool · Chlorinator",
    ]);
  });

  it("drops the UI flags", () => {
    const labels = rowLabels(baseConfig(), "System");
    expect(labels).not.toContain("Mood color");
    expect(labels).not.toContain("Filter simple mode");
    expect(labels).toContain("Temperature units");
  });

  it("humanizes enum constants", () => {
    const c = baseConfig();
    expect(rowValue(c, "Pool · Filter", "Pump type")).toBe("Variable Speed");
    expect(rowValue(c, "Pool · Chlorinator", "Mode")).toBe("Timed");
    expect(rowValue(c, "Pool · Chlorinator", "Dispenser")).toBe("Salt");
    expect(rowValue(c, "Pool · Chlorinator", "Cell type")).toBe("TCELLS340");
  });

  it("qualifies time values (seconds) as human durations", () => {
    const c = baseConfig();
    expect(rowValue(c, "Pool · Filter", "Min priming interval")).toBe("30 sec");
    expect(rowValue(c, "Pool · Chlorinator", "ORP timeout")).toBe("24 hr");
    expect(rowValue(c, "System", "Service mode timeout")).toBe("0 sec");
  });

  it("reads the time zone as minutes from UTC", () => {
    expect(rowValue(baseConfig(), "System", "Time zone")).toBe("UTC-6");
    const half = baseConfig();
    half.system.timeZone = 330;
    expect(rowValue(half, "System", "Time zone")).toBe("UTC+5:30");
  });

  it("formats temps, speeds, and ranges", () => {
    const c = baseConfig();
    expect(rowValue(c, "System", "Temperature units")).toBe("Fahrenheit");
    expect(rowValue(c, "Pool · Filter", "RPM range")).toBe("2000 – 3450 RPM");
    expect(rowValue(c, "Pool · Filter", "Low speed")).toBe("58%");
  });

  it("leaves out the filter rows the Settings page edits", () => {
    const labels = rowLabels(baseConfig(), "Pool · Filter");
    for (const edited of [
      "Priming duration",
      "Freeze protection",
      "Freeze protect temp",
      "Freeze protect speed",
      "Freeze protect override",
      "Shared filter timeout",
      "No-flow shutoff",
      "Valve-change off",
      "Cooldown duration",
      "Speed range",
    ]) {
      expect(labels).not.toContain(edited);
    }
    expect(labels).toContain("Min priming interval");
    expect(labels).toContain("RPM range");
  });

  it("omits Enabled — that is device state, not a setting", () => {
    expect(rowLabels(baseConfig(), "Pool · Heater")).not.toContain("Enabled");
    expect(rowLabels(baseConfig(), "Pool · Chlorinator")).not.toContain(
      "Enabled",
    );
  });

  it("returns only the four read-only heater rows", () => {
    // every heater group, shared or per body
    const groups = settings(baseConfig()).groups;
    const heaterLabels = groups
      .filter((g) => g.title === "Heater" || g.title.endsWith("· Heater"))
      .flatMap((g) => g.rows.map((r) => r.label));
    expect(new Set(heaterLabels)).toEqual(
      new Set([
        "Current setpoint",
        "Settable range",
        "Max water temp",
        "Boost interval",
      ]),
    );
  });

  // the wire is °F whatever the panel shows
  it("labels a temperature °F when units are Metric", () => {
    const c = baseConfig();
    c.system.units = "Metric";
    c.backyard.bodiesOfWater[0]!.heater.currentSetPoint = 82;
    expect(rowValue(c, "Pool · Heater", "Current setpoint")).toBe("82°F");
  });

  it("names a relay for what it drives, and drops a blower with no config", () => {
    const blower = baseConfig();
    blower.backyard.bodiesOfWater[0] = {
      ...blower.backyard.bodiesOfWater[0]!,
      relays: [
        // @ts-expect-error test fixture adds a relay
        {
          function: "RLY_BLOWER",
          freezeProtectEnable: false,
          valveCycleEnable: false,
        },
      ],
    };
    // a blower with nothing enabled has no group
    expect(groupTitles(blower)).not.toContain("Pool · Blower");

    const valve = baseConfig();
    valve.backyard.bodiesOfWater[0] = {
      ...valve.backyard.bodiesOfWater[0]!,
      relays: [
        // @ts-expect-error test fixture adds a relay
        {
          function: "RLY_VALVE_ACTUATOR",
          freezeProtectEnable: false,
          valveCycleEnable: true,
          valveCycleTime: 1800,
        },
      ],
    };
    expect(groupTitles(valve)).toContain("Pool · Valve actuator");
    expect(rowValue(valve, "Pool · Valve actuator", "Valve cycle")).toBe("On");
    expect(rowValue(valve, "Pool · Valve actuator", "Valve cycle time")).toBe(
      "30 min",
    );
  });

  it("keeps a row only the second body carries", () => {
    const c = baseConfig();
    const pool = c.backyard.bodiesOfWater[0]!;
    const spa = JSON.parse(JSON.stringify(pool));
    spa.name = "Spa";
    // a single-speed pump on the pool: its copy has no rpm range
    const poolFilter = pool.filter as unknown as Record<string, unknown>;
    delete poolFilter.minPumpRpm;
    delete poolFilter.maxPumpRpm;
    c.backyard.bodiesOfWater = [pool, spa];

    expect(rowValue(c, "Spa · Filter", "RPM range")).toBe("2000 – 3450 RPM");
    expect(rowLabels(c, "Pool · Filter")).not.toContain("RPM range");
  });

  it("splits shared settings from per-mode differences across pool and spa", () => {
    const c = baseConfig();
    const pool = c.backyard.bodiesOfWater[0]!;
    const spa = JSON.parse(JSON.stringify(pool));
    spa.name = "Spa";
    spa.filter.vspLowPumpSpeed = 60; // → Low speed differs
    spa.heater.currentSetPoint = 98; // → Current setpoint differs
    c.backyard.bodiesOfWater = [pool, spa];

    const titles = groupTitles(c);
    // the filter: a shared table plus per-body tables of what differs
    expect(titles).toContain("Filter");
    expect(titles).toContain("Pool · Filter");
    expect(titles).toContain("Spa · Filter");
    expect(rowLabels(c, "Filter")).toContain("RPM range");
    expect(rowLabels(c, "Pool · Filter")).toEqual(["Low speed"]);
    expect(rowValue(c, "Pool · Filter", "Low speed")).toBe("58%");
    expect(rowValue(c, "Spa · Filter", "Low speed")).toBe("60%");

    // the heater: the setpoint differs, the settable range is shared
    expect(rowValue(c, "Pool · Heater", "Current setpoint")).toBe("82°F");
    expect(rowValue(c, "Spa · Heater", "Current setpoint")).toBe("98°F");
    expect(rowLabels(c, "Heater")).toContain("Settable range");

    // the chlorinator is identical across bodies and has only a shared table
    expect(titles).toContain("Chlorinator");
    expect(titles).not.toContain("Pool · Chlorinator");
  });
});
