import { makeBow, makeFilter } from "@tests/bow";
import { describe, expect, it } from "vitest";

import {
  defaultScheduleData,
  scheduleTargets,
  targetKey,
} from "@/client/schedule-targets";
import type { BowDetail } from "@/server/serializers";

const bow = makeBow({
  filters: [
    makeFilter({ name: "Filter", speed: 75, lastSpeed: 75, rpm: 3000 }),
  ],
  heaters: [
    {
      id: 4,
      name: "Heater",
      type: "HTR_GAS",
      enabled: false,
      setPoint: 94,
      setPointRange: { min: 55, max: 104 },
      state: "off",
      mode: 0,
      silentMode: false,
      cooldown: false,
      extend: false,
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
      shows: [{ value: 1, name: "VOODOO_LOUNGE" }],
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
      id: 7,
      name: "Spillway Pump",
      on: true,
      speed: 40,
      speedRange: { min: 0, max: 100 },
      rpmRange: null,
    },
  ],
  relays: [{ id: 8, name: "Pool Light Relay", on: false }],
});

describe("scheduleTargets", () => {
  it("lists each body's heater alongside the other schedulable devices", () => {
    const targets = scheduleTargets([bow]);
    const heater = targets.find((t) => t.kind === "heater");
    expect(heater).toBeDefined();
    expect(heater).toMatchObject({
      kind: "heater",
      equipmentId: 4,
      bodyName: "Pool",
      name: "Heater",
      device: bow.heaters[0],
    });
  });

  it("still lists every other kind", () => {
    const kinds = scheduleTargets([bow]).map((t) => t.kind);
    expect(kinds).toEqual(
      expect.arrayContaining([
        "filter",
        "chlorinator",
        "heater",
        "light",
        "pump",
        "relay",
      ]),
    );
  });
});

// a spillover schedule is the filter's id plus the spillover event, told apart by its key
describe("spillover target", () => {
  const withSpillover: BowDetail = {
    ...bow,
    spillover: {
      on: false,
      speed: 58,
      lastSpeed: 58,
      speedRange: { min: 58, max: 100 },
      rpmRange: { min: 2000, max: 3450 },
      presets: { low: 58, medium: 80, high: 100 },
    },
  };

  it("targets the filter id with the spillover type", () => {
    const targets = scheduleTargets([withSpillover]);
    const spill = targets.find((t) => t.kind === "spillover");
    expect(spill).toMatchObject({
      equipmentId: 3,
      type: "spillover",
      name: "Spillover",
      bodyName: "Pool",
    });
    const filter = targets.find((t) => t.kind === "filter")!;
    expect(filter.equipmentId).toBe(3);
    expect(targetKey(spill!)).not.toBe(targetKey(filter));
  });

  it("defaults to the Medium preset like a filter", () => {
    const spill = scheduleTargets([withSpillover]).find(
      (t) => t.kind === "spillover",
    )!;
    expect(defaultScheduleData(spill)).toBe(80);
  });

  it("is absent for a body without spillover", () => {
    expect(scheduleTargets([bow]).some((t) => t.kind === "spillover")).toBe(
      false,
    );
  });
});

describe("defaultScheduleData", () => {
  it("defaults a heater target to its current set point", () => {
    const targets = scheduleTargets([bow]);
    const heater = targets.find((t) => t.kind === "heater")!;
    expect(defaultScheduleData(heater)).toBe(94);
  });

  it("lists themes last, under Themes, with the theme type and data 1", () => {
    const targets = scheduleTargets(
      [bow],
      [
        { id: 35, name: "Movie Night", active: false, equipment: [] },
        { id: 36, name: "Quiet", active: true, equipment: [] },
      ],
    );
    const themes = targets.filter((t) => t.kind === "theme");
    expect(
      themes.map((t) => [t.equipmentId, t.name, t.type, t.bodyName]),
    ).toEqual([
      [35, "Movie Night", "theme", "Themes"],
      [36, "Quiet", "theme", "Themes"],
    ]);
    expect(targets.at(-1)?.kind).toBe("theme");
    expect(defaultScheduleData(themes[0]!)).toBe(1);
    expect(targetKey(themes[0]!)).toBe("35:theme");
  });
});
