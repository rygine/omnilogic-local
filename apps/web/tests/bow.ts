import type { BowDetail, FilterDetail } from "@/server/serializers";

// a variable-speed filter pump as the world serializes one
export const makeFilter = (
  overrides: Partial<FilterDetail> = {},
  settings: Partial<FilterDetail["settings"]> = {},
): FilterDetail => ({
  id: 3,
  name: "Filter Pump",
  on: true,
  speed: 58,
  lastSpeed: 58,
  status: "On",
  busyForMs: null,
  speedRange: { min: 58, max: 100 },
  rpm: 2000,
  rpmRange: { min: 2000, max: 3450 },
  presets: { low: 58, medium: 80, high: 100 },
  ...overrides,
  settings: {
    pumpMinSpeed: 58,
    pumpMaxSpeed: 100,
    primingDuration: 120,
    freezeProtect: true,
    freezeProtectTemp: 38,
    freezeProtectSpeed: 80,
    freezeProtectOverrideInterval: 7200,
    sharedFilterTimeout: 1800,
    filterOffDuringValveChange: false,
    flowMonitor: true,
    cooldownDuration: 300,
    ...settings,
  },
});

// a pool with one filter and nothing else
export const makeBow = (overrides: Partial<BowDetail> = {}): BowDetail => ({
  id: 1,
  name: "Pool",
  waterTemp: 82,
  filters: [makeFilter()],
  heaters: [],
  lights: [],
  chlorinators: [],
  pumps: [],
  relays: [],
  ...overrides,
});
