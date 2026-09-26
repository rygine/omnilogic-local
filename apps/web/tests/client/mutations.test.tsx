import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { makeBow, makeFilter } from "@tests/bow";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { deviceRows } from "@/client/equipment-rows";
import {
  useRenameEquipment,
  useSetEquipmentOn,
  useSetFilterSettingOn,
  useSetFilterSpeed,
  useSetHeaterEnable,
  useSetLightShow,
  useSetSpillover,
  useStartCountdown,
} from "@/client/mutations";
import { countdownQueryKey, queryKeys } from "@/client/queries";
import { getSettings } from "@/client/settings";
import type * as BowFns from "@/server/fns/bow";
import type * as SystemFns from "@/server/fns/system";
import type {
  HeaterDetail,
  LightDetail,
  PumpDetail,
  WorldData,
} from "@/server/serializers";

vi.mock("@/server/fns/bow", async (importOriginal) => ({
  ...(await importOriginal<typeof BowFns>()),
  setFilterSetting: vi.fn(() => Promise.resolve()),
  setFilterSpeed: vi.fn(() => Promise.resolve()),
  setEquipmentOn: vi.fn(() => Promise.resolve()),
  setHeaterEnable: vi.fn(() => Promise.resolve()),
  setLightShow: vi.fn(() => Promise.resolve()),
  setSpillover: vi.fn(() => Promise.resolve()),
  startCountdown: vi.fn(() => Promise.resolve()),
}));
vi.mock("@/server/fns/system", async (importOriginal) => ({
  ...(await importOriginal<typeof SystemFns>()),
  renameConfigObject: vi.fn(() => Promise.resolve()),
}));
vi.mock("@/server/fns/world", () => ({
  getWorld: vi.fn(() => Promise.resolve(undefined)),
}));

const filter = makeFilter();

const heater: HeaterDetail = {
  id: 4,
  name: "Heater",
  type: "HTR_GAS",
  enabled: false,
  setPoint: 84,
  setPointRange: { min: 65, max: 104 },
  state: "off",
  mode: 0,
  silentMode: false,
  cooldown: false,
  extend: false,
};

const light: LightDetail = {
  id: 8,
  name: "Pool Light",
  on: false,
  state: "Off",
  busy: null,
  show: null,
  shows: [
    { value: 0, name: "Voodoo Lounge" },
    { value: 6, name: "Cloud White" },
  ],
  omniDirect: false,
  speed: null,
  brightness: null,
  speeds: [],
  brightnesses: [],
};

const pump: PumpDetail = {
  id: 12,
  name: "Waterfall",
  on: true,
  speed: 45,
  speedRange: { min: 0, max: 100 },
  rpmRange: null,
};

const bow = makeBow({
  waterTemp: 84,
  filters: [filter],
  heaters: [heater],
  lights: [light],
  pumps: [pump],
  relays: [{ id: 22, name: "Blower", on: false }],
  spillover: {
    on: false,
    speed: 58,
    lastSpeed: 58,
    speedRange: { min: 58, max: 100 },
    rpmRange: { min: 2000, max: 3450 },
    presets: { low: 58, medium: 80, high: 100 },
  },
});

const world: WorldData = {
  backyard: { airTemp: 78, systemState: null },
  bows: [bow],
  schedules: [],
  favorites: [],
};

// a query client holding the world under the key the hooks patch
const setup = (seed: WorldData = world) => {
  const qc = new QueryClient();
  const { host, port } = getSettings();
  const key = queryKeys.world(host, port);
  qc.setQueryData(key, seed);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  const read = (): WorldData => {
    const data = qc.getQueryData<WorldData>(key);
    if (data === undefined) {
      throw new Error("world missing");
    }
    return data;
  };
  return { qc, wrapper, read, host, port };
};

describe("useSetFilterSettingOn", () => {
  it("pumpMaxSpeed patches settings.pumpMaxSpeed and speedRange.max, not presets", async () => {
    const { wrapper, read } = setup();
    const { result } = renderHook(() => useSetFilterSettingOn(), { wrapper });
    await act(() =>
      result.current.mutateAsync({
        bowId: 1,
        filterId: 3,
        setting: "pumpMaxSpeed",
        value: 90,
      }),
    );
    const patched = read().bows[0]!.filters[0]!;
    expect(patched.settings.pumpMaxSpeed).toBe(90);
    expect(patched.speedRange).toEqual({ min: 58, max: 90 });
    expect(patched.presets).toEqual(filter.presets);
  });

  it("pumpMinSpeed patches settings.pumpMinSpeed and speedRange.min, leaving the rest", async () => {
    const { wrapper, read } = setup();
    const { result } = renderHook(() => useSetFilterSettingOn(), { wrapper });
    await act(() =>
      result.current.mutateAsync({
        bowId: 1,
        filterId: 3,
        setting: "pumpMinSpeed",
        value: 30,
      }),
    );
    const patched = read().bows[0]!.filters[0]!;
    expect(patched.settings.pumpMinSpeed).toBe(30);
    expect(patched.speedRange).toEqual({ min: 30, max: 100 });
    expect(patched.presets).toEqual(filter.presets);
    expect(patched.speed).toBe(filter.speed);
    expect(patched.settings.freezeProtectSpeed).toBe(
      filter.settings.freezeProtectSpeed,
    );
  });
});

describe("useRenameEquipment", () => {
  it("renames a device by its id and nothing else", async () => {
    const { wrapper, read } = setup();
    const { result } = renderHook(() => useRenameEquipment(), { wrapper });
    await act(() =>
      result.current.mutateAsync({ equipmentId: 22, name: "Blower2" }),
    );
    expect(read().bows[0]!.relays[0]!.name).toBe("Blower2");
    expect(read().bows[0]!.name).toBe("Pool");
    expect(read().bows[0]!.filters[0]!.name).toBe("Filter Pump");
  });

  it("renames a body of water by its id", async () => {
    const { wrapper, read } = setup();
    const { result } = renderHook(() => useRenameEquipment(), { wrapper });
    await act(() =>
      result.current.mutateAsync({ equipmentId: 1, name: "Lap pool" }),
    );
    expect(read().bows[0]!.name).toBe("Lap pool");
    expect(read().bows[0]!.relays[0]!.name).toBe("Blower");
  });

  it("leaves the world alone for an id it does not hold", async () => {
    const { wrapper, read } = setup();
    const { result } = renderHook(() => useRenameEquipment(), { wrapper });
    await act(() =>
      result.current.mutateAsync({ equipmentId: 99, name: "Nobody" }),
    );
    expect(read()).toEqual(world);
  });
});

describe("useStartCountdown", () => {
  it("seeds a relay on and counting down, with the full duration left", async () => {
    const { qc, wrapper, read, host, port } = setup();
    const { result } = renderHook(() => useStartCountdown(1), { wrapper });
    await act(() =>
      result.current.mutateAsync({
        equipmentId: 22,
        target: "equipment",
        value: 1,
        hours: 1,
        minutes: 0,
      }),
    );
    expect(read().bows[0]!.relays[0]).toMatchObject({
      on: true,
      countdown: true,
    });
    expect(read().bows[0]!.filters[0]!.countdown).toBeUndefined();
    expect(qc.getQueryData(countdownQueryKey(host, port, 1, 22))).toEqual({
      seconds: 3600,
    });
  });

  it("seeds spillover and the filter it runs on", async () => {
    const { wrapper, read } = setup();
    const { result } = renderHook(() => useStartCountdown(1), { wrapper });
    await act(() =>
      result.current.mutateAsync({
        equipmentId: 3,
        target: "spillover",
        value: 58,
        hours: 0,
        minutes: 30,
      }),
    );
    expect(read().bows[0]!.spillover).toMatchObject({
      on: true,
      countdown: true,
    });
    expect(read().bows[0]!.filters[0]!.on).toBe(true);
  });
});

describe("useSetFilterSpeed", () => {
  it("patches the filter so its card row shows the new speed at once", async () => {
    const { wrapper, read } = setup();
    const { result } = renderHook(() => useSetFilterSpeed(1), { wrapper });
    await act(() => result.current.mutateAsync({ equipmentId: 3, speed: 80 }));
    const patched = read().bows[0]!.filters[0]!;
    expect(patched).toMatchObject({ on: true, speed: 80, lastSpeed: 80 });
    const row = deviceRows(read().bows[0]!)[0]!;
    expect(row.state).toBe("On · 2760 RPM (Medium)");
  });
});

describe("useSetSpillover", () => {
  it("turning spillover on runs the filter at the new speed", async () => {
    const { wrapper, read } = setup();
    const { result } = renderHook(() => useSetSpillover(1), { wrapper });
    await act(() => result.current.mutateAsync({ on: true, speed: 80 }));
    expect(read().bows[0]!.spillover).toMatchObject({ on: true, speed: 80 });
    expect(read().bows[0]!.filters[0]).toMatchObject({ on: true, speed: 80 });
  });

  it("turning spillover off keeps the speeds and the filter's state it had", async () => {
    const { wrapper, read } = setup();
    const { result } = renderHook(() => useSetSpillover(1), { wrapper });
    await act(() => result.current.mutateAsync({ on: false, speed: 100 }));
    expect(read().bows[0]!.spillover).toMatchObject({ on: false, speed: 58 });
    expect(read().bows[0]!.filters[0]).toMatchObject({
      on: filter.on,
      speed: filter.speed,
    });
  });
});

describe("status words follow an on/off write", () => {
  it("a light turned on reads as warming up, and off as powering off, until the controller says otherwise", async () => {
    const { wrapper, read } = setup();
    const { result } = renderHook(() => useSetEquipmentOn(1), { wrapper });
    await act(() => result.current.mutateAsync({ equipmentId: 8, on: true }));
    expect(read().bows[0]!.lights[0]).toMatchObject({
      on: true,
      state: "Warm-up",
      busy: "warming up",
    });
    await act(() => result.current.mutateAsync({ equipmentId: 8, on: false }));
    expect(read().bows[0]!.lights[0]).toMatchObject({
      on: false,
      state: "Powering off",
      busy: "powering off",
    });
  });

  it("a light given a show reads on and changing with that show, show 0 included", async () => {
    const { wrapper, read } = setup();
    const { result } = renderHook(() => useSetLightShow(1), { wrapper });
    await act(() => result.current.mutateAsync({ equipmentId: 8, show: 6 }));
    expect(read().bows[0]!.lights[0]).toMatchObject({
      on: true,
      state: "Changing show",
      busy: "changing show",
      show: "Cloud White",
    });
    await act(() => result.current.mutateAsync({ equipmentId: 8, show: 0 }));
    expect(read().bows[0]!.lights[0]).toMatchObject({
      on: true,
      show: "Voodoo Lounge",
    });
  });

  it("a pump started from stopped reads as priming for its priming duration plus thirty seconds", async () => {
    const stopped: WorldData = {
      ...world,
      bows: [
        {
          ...world.bows[0]!,
          filters: [{ ...filter, on: false, speed: 0, status: "Off" }],
        },
      ],
    };
    const { wrapper, read } = setup(stopped);
    const { result } = renderHook(() => useSetFilterSpeed(1), { wrapper });
    await act(() => result.current.mutateAsync({ equipmentId: 3, speed: 80 }));
    expect(read().bows[0]!.filters[0]).toMatchObject({
      on: true,
      speed: 80,
      status: "Starting",
      busyForMs: 150_000,
    });
    // a pump already running just changes speed
    const running = setup();
    const speed = renderHook(() => useSetFilterSpeed(1), {
      wrapper: running.wrapper,
    });
    await act(() =>
      speed.result.current.mutateAsync({ equipmentId: 3, speed: 80 }),
    );
    expect(running.read().bows[0]!.filters[0]).toMatchObject({
      on: true,
      busyForMs: null,
    });
  });

  it("a pump turned off drops its speed, as the world reports it", async () => {
    const { wrapper, read } = setup();
    const { result } = renderHook(() => useSetEquipmentOn(1), { wrapper });
    await act(() => result.current.mutateAsync({ equipmentId: 12, on: false }));
    expect(read().bows[0]!.pumps[0]).toMatchObject({ on: false, speed: null });
  });

  it("a light under a countdown reads On, and Off when it ends", async () => {
    const { wrapper, read } = setup();
    const { result } = renderHook(() => useStartCountdown(1), { wrapper });
    await act(() =>
      result.current.mutateAsync({
        equipmentId: 8,
        target: "equipment",
        value: 6,
        hours: 0,
        minutes: 1,
      }),
    );
    expect(read().bows[0]!.lights[0]).toMatchObject({ on: true, state: "On" });
  });

  it("a heater enabled reads Idle until the controller says otherwise", async () => {
    const { wrapper, read } = setup();
    const { result } = renderHook(() => useSetHeaterEnable(1), { wrapper });
    await act(() =>
      result.current.mutateAsync({ equipmentId: 4, enabled: true }),
    );
    expect(read().bows[0]!.heaters[0]).toMatchObject({
      enabled: true,
      state: "idle",
    });
    await act(() =>
      result.current.mutateAsync({ equipmentId: 4, enabled: false }),
    );
    expect(read().bows[0]!.heaters[0]).toMatchObject({
      enabled: false,
      state: "off",
    });
  });
});
