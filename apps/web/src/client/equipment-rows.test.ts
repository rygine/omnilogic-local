import { makeBow, makeFilter } from "@tests/bow";
import { describe, expect, it } from "vitest";

import { deviceRows, equipmentRows } from "@/client/equipment-rows";
import type { LightState } from "@/server/serializers";

const bow = makeBow({
  filters: [
    makeFilter({
      name: "Filter",
      speed: 75,
      lastSpeed: 75,
      // 2000 + (75-50)/50 * (4000-2000) = 3000
      speedRange: { min: 50, max: 100 },
      rpm: 3000,
      rpmRange: { min: 2000, max: 4000 },
    }),
  ],
  heaters: [
    {
      id: 4,
      name: "Heater",
      type: "HTR_GAS",
      enabled: false,
      setPoint: 94,
      setPointRange: { min: 55, max: 94 },
      state: "off",
      mode: 0,
      silentMode: false,
      cooldown: false,
      extend: false,
      lowSpeed: {
        allow: true,
        minSpeed: 60,
        speedRange: { min: 58, max: 100 },
        presets: { low: 58, medium: 80, high: 100 },
        rpmRange: { min: 2000, max: 3450 },
      },
    },
  ],
  lights: [
    {
      id: 5,
      name: "Light",
      on: true,
      state: "On",
      busy: null,
      show: "VOODOO_LOUNGE",
      shows: [],
      omniDirect: false,
      speed: null,
      brightness: null,
      speeds: [],
      brightnesses: [],
    },
  ],
  chlorinators: [
    {
      id: 6,
      active: true,
      generating: true,
      outputPercent: 50,
      avgSalt: 3200,
      instantSalt: 3210,
      superchlorinating: false,
    },
  ],
  pumps: [
    {
      id: 3,
      name: "Pump",
      on: true,
      speed: 58,
      speedRange: { min: 58, max: 100 },
      rpmRange: { min: 2000, max: 3450 },
    },
  ],
  relays: [{ id: 9, name: "Blower", on: true }],
});

describe("equipmentRows", () => {
  it("flattens every device to a row with a state summary", () => {
    const rows = equipmentRows([bow]);
    expect(rows).toEqual([
      {
        body: "Pool",
        kind: "Filter",
        name: "Filter",
        state: "On · 3000 RPM",
      },
      { body: "Pool", kind: "Heater", name: "Heater", state: "Off · 94°F" },
      {
        body: "Pool",
        kind: "Chlorinator",
        name: "Chlorinator",
        state: "On · 50%",
      },
      { body: "Pool", kind: "Light", name: "Light", state: "VOODOO_LOUNGE" },
      { body: "Pool", kind: "Pump", name: "Pump", state: "On · 2000 RPM" },
      { body: "Pool", kind: "Relay", name: "Blower", state: "On" },
    ]);
  });

  it("is empty for no bodies", () => {
    expect(equipmentRows([])).toEqual([]);
  });
});

// spillover is listed after the devices, keyed by the body id
describe("deviceRows spillover", () => {
  const spillover = {
    on: true,
    speed: 58,
    lastSpeed: 58,
    speedRange: { min: 58, max: 100 },
    rpmRange: { min: 2000, max: 3450 },
    presets: { low: 58, medium: 80, high: 100 },
    preset: "Low",
  };

  it("adds a Spillover row keyed by the body id when the body supports it", () => {
    const rows = deviceRows({ ...bow, spillover });
    const row = rows.at(-1)!;
    expect(row).toMatchObject({
      kind: "spillover",
      label: "Spillover",
      id: 1,
      name: "Spillover",
      on: true,
      value: "2000 RPM",
      detail: "Low",
      state: "On · 2000 RPM (Low)",
    });
  });

  it("shows no reading while off", () => {
    const rows = deviceRows({ ...bow, spillover: { ...spillover, on: false } });
    expect(rows.at(-1)).toMatchObject({
      kind: "spillover",
      on: false,
      value: null,
      detail: null,
      state: "Off",
    });
  });

  it("adds nothing for a body without spillover", () => {
    expect(deviceRows(bow).some((r) => r.kind === "spillover")).toBe(false);
  });
});

describe("deviceRows chlorinator detail", () => {
  const chlorDetail = (generating: boolean) => {
    const b = {
      ...bow,
      chlorinators: [{ ...bow.chlorinators[0]!, generating }],
    };
    return deviceRows(b).find((r) => r.kind === "chlorinator")?.detail;
  };

  it("calls out chlorinating with the salt ppm while dosing", () => {
    expect(chlorDetail(true)).toBe("Chlorinating · 3200 ppm");
  });

  it("shows just the salt ppm when enabled but not dosing", () => {
    expect(chlorDetail(false)).toBe("3200 ppm salt");
  });
});

describe("deviceRows light status", () => {
  const lightRow = (on: boolean, state: LightState) => {
    const b = { ...bow, lights: [{ ...bow.lights[0]!, on, state }] };
    return deviceRows(b).find((r) => r.kind === "light");
  };

  it("surfaces the light's power state on the badge", () => {
    expect(lightRow(false, "Cooldown")?.statusLabel).toBe("Cooldown");
    expect(lightRow(false, "Cooldown")?.on).toBe(false);
    expect(lightRow(true, "On")?.statusLabel).toBe("On");
  });
});

describe("deviceRows filter status", () => {
  const filterRow = (status: string, on: boolean) => {
    const b = { ...bow, filters: [{ ...bow.filters[0]!, status, on }] };
    return deviceRows(b).find((r) => r.kind === "filter");
  };

  it("surfaces a state beyond On and Off, such as priming", () => {
    expect(filterRow("Priming", true)?.statusLabel).toBe("Priming");
    expect(filterRow("Waiting To Turn Off", false)?.statusLabel).toBe(
      "Waiting To Turn Off",
    );
    expect(filterRow("On", true)?.statusLabel).toBeUndefined();
  });
});

describe("deviceRows heater status", () => {
  it("shows the heater's set point and its state, never the water temperature", () => {
    const heating = {
      ...bow,
      heaters: [
        { ...bow.heaters[0]!, enabled: true, state: "heating" as const },
      ],
    };
    const row = deviceRows(heating).find((r) => r.kind === "heater")!;
    expect(row.on).toBe(true);
    expect(row.value).toBe("94°F");
    expect(row.detail).toBeNull();
    expect(row.statusLabel).toBe("Heating");
    expect(row.valueLabel).toBe("Set point");

    const idleOn = {
      ...bow,
      heaters: [{ ...bow.heaters[0]!, enabled: true, state: "idle" as const }],
    };
    const idleRow = deviceRows(idleOn).find((r) => r.kind === "heater")!;
    expect(idleRow.on).toBe(true);
    expect(idleRow.statusLabel).toBe("Idle");

    const off = deviceRows(bow).find((r) => r.kind === "heater")!;
    expect(off.on).toBe(false);
    expect(off.statusLabel).toBe("Off");
  });

  it("leaves valueLabel unset for other kinds", () => {
    const row = deviceRows(bow).find((r) => r.kind === "filter")!;
    expect(row.valueLabel).toBeUndefined();
  });
});
