import { makeBow, makeFilter } from "@tests/bow";
import { describe, expect, it } from "vitest";

import {
  favoritableDevices,
  favoriteRows,
  themeFavoriteRows,
} from "@/client/favorites";
import type { BowDetail, FavoriteSummary } from "@/server/serializers";

const bow = makeBow({
  filters: [
    makeFilter({
      name: "Filter",
      speed: 75,
      lastSpeed: 75,
      rpm: 3000,
    }),
  ],
  lights: [
    {
      id: 5,
      name: "Light",
      on: true,
      state: "On",
      busy: null,
      show: "USA",
      shows: [],
      omniDirect: false,
      speed: null,
      brightness: null,
      speeds: [],
      brightnesses: [],
    },
  ],
  relays: [{ id: 9, name: "Blower", on: false }],
});

const favorites: FavoriteSummary[] = [
  { indexId: 2, equipmentId: 5, data: 0 }, // Light
  { indexId: 1, equipmentId: 3, data: 0 }, // Filter
];

describe("favoriteRows", () => {
  it("resolves favorites to their devices in the given order", () => {
    const rows = favoriteRows(favorites, [bow]);
    expect(rows.map((r) => [r.indexId, r.device.id, r.device.name])).toEqual([
      [2, 5, "Light"],
      [1, 3, "Filter"],
    ]);
    expect(rows[0]).toMatchObject({ bowId: 1, bodyName: "Pool" });
  });

  it("skips favorites whose target isn't a device in the tree", () => {
    const withTheme = [...favorites, { indexId: 3, equipmentId: 999, data: 0 }];
    const rows = favoriteRows(withTheme, [bow]);
    expect(rows).toHaveLength(2);
    expect(rows.some((r) => r.device.id === 999)).toBe(false);
  });
});

// spillover's favorite resolves to the Spillover row, apart from the filter's bookmark
describe("spillover favorites", () => {
  const withSpillover: BowDetail = {
    ...bow,
    spillover: {
      on: false,
      speed: 75,
      lastSpeed: 75,
      speedRange: { min: 58, max: 100 },
      rpmRange: { min: 2000, max: 3450 },
      presets: { low: 58, medium: 80, high: 100 },
    },
  };
  const spilloverFavorite = { indexId: 4, equipmentId: 3, data: 268435441 };

  it("resolves the filter id + marker to the Spillover row", () => {
    const rows = favoriteRows([spilloverFavorite], [withSpillover]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      indexId: 4,
      bowId: 1,
      device: { kind: "spillover", id: 1, name: "Spillover" },
      favorite: { equipmentId: 3, data: 268435441 },
    });
  });

  it("keeps the filter's plain bookmark and the spillover favorite apart", () => {
    const rows = favoriteRows(
      [{ indexId: 1, equipmentId: 3, data: 0 }, spilloverFavorite],
      [withSpillover],
    );
    expect(rows.map((r) => r.device.kind)).toEqual(["filter", "spillover"]);
  });

  it("offers Spillover with its own favorite record, until it is taken", () => {
    const open = favoritableDevices([], [withSpillover]);
    const spill = open.find((d) => d.device.kind === "spillover");
    expect(spill?.favorite).toEqual({ equipmentId: 3, data: 268435441 });

    const taken = favoritableDevices([spilloverFavorite], [withSpillover]);
    expect(taken.some((d) => d.device.kind === "spillover")).toBe(false);
    // the filter's own bookmark is still open: same id, different data
    expect(
      taken.some((d) => d.device.id === 3 && d.device.kind === "filter"),
    ).toBe(true);
  });
});

describe("favoritableDevices", () => {
  it("lists only devices that aren't already favorited", () => {
    const picks = favoritableDevices(favorites, [bow]);
    // the filter (3) and light (5) are favorited, only the Blower relay (9) remains
    expect(picks.map((p) => p.device.id)).toEqual([9]);
  });

  it("lists every device when nothing is favorited", () => {
    const picks = favoritableDevices([], [bow]);
    expect(picks.map((p) => p.device.id).toSorted((a, b) => a - b)).toEqual([
      3, 5, 9,
    ]);
  });
});

describe("themeFavoriteRows", () => {
  const themes = [
    { id: 32, name: "Party", active: false, equipment: [] },
    { id: 35, name: "Quiet", active: true, equipment: [] },
  ];
  it("resolves records carrying the theme marker to their themes, in order", () => {
    const rows = themeFavoriteRows(
      [
        { indexId: 3, equipmentId: 35, data: 268435455 },
        { indexId: 1, equipmentId: 3, data: 0 }, // an equipment favorite
        { indexId: 2, equipmentId: 32, data: 268435455 },
      ],
      themes,
    );
    expect(rows.map((r) => [r.indexId, r.theme.name])).toEqual([
      [3, "Quiet"],
      [2, "Party"],
    ]);
  });
  it("skips a theme favorite whose theme no longer exists", () => {
    expect(
      themeFavoriteRows(
        [{ indexId: 4, equipmentId: 99, data: 268435455 }],
        themes,
      ),
    ).toEqual([]);
  });
  it("never mistakes a plain bookmark of an id that is also a theme id", () => {
    expect(
      themeFavoriteRows([{ indexId: 1, equipmentId: 32, data: 0 }], themes),
    ).toEqual([]);
  });
});
