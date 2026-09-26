import { FILTER_STATE, type OmniLogic } from "@rygine/omnilogic-local-sdk";

import {
  clearStart,
  lockPumps,
  noteStart,
  pumpsBusyFor,
  requireIdlePumps,
  requireSettledLight,
  resetPumpLocks,
  startingFilter,
} from "@/server/transitions";

// a controller with one stopped filter pump in this state, with no row when not reported
const omniWith = (filterState: number, reported = true): OmniLogic =>
  ({
    telemetry: { filters: reported ? [{ systemId: 3 }] : [] },
    backyard: {
      bodies: [
        {
          filter: {
            equipmentId: 3,
            speed: 0,
            isPriming: filterState === 2 || filterState === 10,
            status: FILTER_STATE[filterState],
          },
        },
      ],
    },
    config: {
      backyard: {
        bodiesOfWater: [
          {
            filter: {
              systemId: 3,
              name: "Pool Filter Pump",
              primingEnabled: true,
              primingDuration: 120,
            },
          },
        ],
      },
    },
  }) as unknown as OmniLogic;

beforeEach(() => {
  vi.useFakeTimers();
  resetPumpLocks();
});
afterEach(() => vi.useRealTimers());

describe("pump lock", () => {
  it("is free when nothing primes", () => {
    expect(pumpsBusyFor("k", omniWith(1))).toBeNull();
    expect(() => requireIdlePumps("k", omniWith(1))).not.toThrow();
  });

  it("a start locks for the priming duration plus thirty seconds", () => {
    lockPumps("k", 120);
    expect(pumpsBusyFor("k", omniWith(1))).toBe(150_000);
    expect(() => requireIdlePumps("k", omniWith(1))).toThrow(
      /settling after a start.*150 s/,
    );
    vi.advanceTimersByTime(150_000);
    expect(pumpsBusyFor("k", omniWith(1))).toBeNull();
  });

  it("priming seen at a read locks from that read and names the pump", () => {
    expect(pumpsBusyFor("k", omniWith(2))).toBe(150_000);
    expect(() => requireIdlePumps("k", omniWith(2))).toThrow(
      /Pool Filter Pump is priming\. Pump controls return in about 150 s/,
    );
    vi.advanceTimersByTime(100_000);
    // still priming: the lock is not extended while one is in force
    expect(pumpsBusyFor("k", omniWith(2))).toBe(50_000);
  });

  it("locks are per controller", () => {
    lockPumps("a", 120);
    expect(pumpsBusyFor("b", omniWith(1))).toBeNull();
  });
});

describe("startingFilter", () => {
  it("names the started pump until the controller reports it priming or running", () => {
    noteStart("k", 3, 120);
    expect(startingFilter("k", omniWith(0))).toBe(3);
    vi.advanceTimersByTime(140_000);
    expect(startingFilter("k", omniWith(0))).toBe(3);
    expect(startingFilter("k", omniWith(2))).toBeNull();
    expect(startingFilter("k", omniWith(0))).toBeNull();
  });

  it("a stop ends the start", () => {
    noteStart("k", 3, 0);
    clearStart("k");
    expect(startingFilter("k", omniWith(0))).toBeNull();
  });

  it("gives a pump that never primes a minute, then lets the controller's word stand", () => {
    noteStart("k", 3, 0);
    vi.advanceTimersByTime(59_000);
    expect(startingFilter("k", omniWith(0))).toBe(3);
    vi.advanceTimersByTime(2_000);
    expect(startingFilter("k", omniWith(0))).toBeNull();
  });
});

describe("a filter the controller sends no row for", () => {
  it("is neither priming nor reported, so a start here stays Starting", () => {
    expect(pumpsBusyFor("k", omniWith(2, false))).toBeNull();
    noteStart("k", 3, 0);
    expect(startingFilter("k", omniWith(2, false))).toBe(3);
  });
});

describe("requireSettledLight", () => {
  const POWER: Record<number, string> = {
    0: "OFF",
    1: "POWERING_OFF",
    4: "FIFTEEN_SECONDS_WHITE",
    6: "ACTIVE",
  };
  const light = (lightState: number) =>
    ({
      name: "Pool Lights",
      state: { lightState },
      powerState: POWER[lightState],
    }) as ColorLogicLightStub;
  type ColorLogicLightStub = Parameters<typeof requireSettledLight>[0];

  it("passes a light that is off or on", () => {
    expect(() => requireSettledLight(light(0))).not.toThrow();
    expect(() => requireSettledLight(light(6))).not.toThrow();
  });

  it("refuses a light between states, naming the phase", () => {
    expect(() => requireSettledLight(light(4))).toThrow(
      /Pool Lights is warming up/,
    );
    expect(() => requireSettledLight(light(1))).toThrow(/powering off/);
  });
});
