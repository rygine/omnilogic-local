import type { Telemetry } from "@rygine/omnilogic-local-sdk";

import { recordingLog } from "./hap";
import { testSession } from "./session";
import { telemetryFixture } from "./telemetry";

describe("ControllerSession", () => {
  it("refreshes and reports success", async () => {
    const { session, omni } = testSession();
    let refreshed = 0;
    session.on("refreshed", () => refreshed++);
    expect(await session.refresh()).toBe(true);
    expect(refreshed).toBe(1);
    expect(session.faulted).toBe(false);
    expect(omni.telemetry.backyard.airTemp).toBe(78);
  });

  it("marks a fault once and clears it on the next success", async () => {
    const { session, omni } = testSession();
    const faults: boolean[] = [];
    session.on("fault", (f) => faults.push(f));
    const good = omni.fetchTelemetry;
    omni.fetchTelemetry = () => Promise.reject(new Error("timeout"));
    expect(await session.refresh()).toBe(false);
    expect(await session.refresh()).toBe(false);
    omni.fetchTelemetry = good;
    expect(await session.refresh()).toBe(true);
    expect(faults).toEqual([true, false]);
  });

  it("names unsupported firmware once, in place of the not-answering warning, and faults", async () => {
    const telemetry = telemetryFixture();
    telemetry.backyard.mspVersion = "R0501000";
    const { lines, log } = recordingLog();
    const { session } = testSession({ telemetry, log });
    const faults: boolean[] = [];
    session.on("fault", (f) => faults.push(f));
    expect(await session.refresh()).toBe(false);
    expect(await session.refresh()).toBe(false);
    expect(lines).toEqual([
      "Firmware R0501000 is not supported: R0502000 or newer required.",
    ]);
    expect(faults).toEqual([true]);

    telemetry.backyard.mspVersion = "R0502000";
    expect(await session.refresh()).toBe(true);
    expect(lines.at(-1)).toBe("controller firmware R0502000");
    expect(faults).toEqual([true, false]);
  });

  it("names the firmware from the system info when telemetry reports no version", async () => {
    const telemetry = telemetryFixture();
    delete telemetry.backyard.mspVersion;
    const { lines, log } = recordingLog();
    const { session, omni } = testSession({ telemetry, log });
    vi.spyOn(omni, "fetchSysInfo").mockResolvedValueOnce({
      numComponents: 1,
      components: [
        {
          devName: "MSP",
          type: "MSP",
          hua: "",
          version: "R0302001",
          nodeId: -1,
          systemId: 1,
          upgradeCapable: true,
        },
      ],
    });
    expect(await session.refresh()).toBe(false);
    expect(lines).toEqual([
      "Firmware R0302001 is not supported: R0502000 or newer required.",
    ]);
  });

  it("names unsupported firmware after an earlier network fault, and unknown firmware as unknown", async () => {
    const telemetry = telemetryFixture();
    delete telemetry.backyard.mspVersion;
    const { lines, log } = recordingLog();
    const { session, omni } = testSession({ telemetry, log });
    const faults: boolean[] = [];
    session.on("fault", (f) => faults.push(f));
    const good = omni.fetchTelemetry;
    omni.fetchTelemetry = () => Promise.reject(new Error("timeout"));
    expect(await session.refresh()).toBe(false);
    omni.fetchTelemetry = good;
    expect(await session.refresh()).toBe(false);
    expect(await session.refresh()).toBe(false);
    expect(lines).toEqual([
      "controller not answering: Error: timeout",
      "Firmware version unknown: R0502000 or newer required.",
    ]);
    expect(faults).toEqual([true]);
  });

  it("a refreshed listener that throws reaches the caller and does not fault the session", async () => {
    const { session } = testSession();
    const faults: boolean[] = [];
    session.on("fault", (f) => faults.push(f));
    session.on("refreshed", () => {
      throw new Error("wiring failed");
    });
    await expect(session.refresh()).rejects.toThrow("wiring failed");
    expect(session.faulted).toBe(false);
    expect(faults).toEqual([]);
  });

  it("a listener that throws under a timer-driven poll is a warning, not an unhandled rejection", async () => {
    vi.useFakeTimers();
    const { lines, log } = recordingLog();
    const { session } = testSession({ pollInterval: 30, log });
    session.on("refreshed", () => {
      throw new Error("wiring failed");
    });
    session.start();
    await vi.advanceTimersByTimeAsync(30_000);
    session.stop();
    expect(lines).toEqual([
      "a poll failed: Error: wiring failed",
      "a poll failed: Error: wiring failed",
    ]);
  });

  it("runs one refresh at a time: a second caller waits on the one in flight", async () => {
    const { session, omni, telemetry } = testSession();
    let fetches = 0;
    const { promise: pending, resolve: release } =
      Promise.withResolvers<void>();
    omni.fetchTelemetry = async <R extends boolean = false>(_options?: {
      raw?: R;
    }) => {
      fetches++;
      await pending;
      return telemetry as R extends true ? string : Telemetry;
    };
    let refreshed = 0;
    session.on("refreshed", () => refreshed++);
    const first = session.refresh();
    const second = session.refresh();
    release();
    expect(await first).toBe(true);
    expect(await second).toBe(true);
    expect(fetches).toBe(1);
    expect(refreshed).toBe(1);
    // the next call is a read of its own
    await session.refresh();
    expect(fetches).toBe(2);
  });

  it("installs no timer for a refresh or a write that lands after stop", async () => {
    vi.useFakeTimers();
    const { session, omni, telemetry } = testSession();
    telemetry.filters[0]!.filterState = 2;
    let fetches = 0;
    const { promise: pending, resolve: release } =
      Promise.withResolvers<Telemetry>();
    omni.fetchTelemetry = <R extends boolean = false>(_options?: {
      raw?: R;
    }) => {
      fetches++;
      return pending as Promise<R extends true ? string : Telemetry>;
    };
    const refreshing = session.refresh();
    session.stop();
    release(telemetry);
    await refreshing;
    await session.write(() => Promise.resolve());
    await vi.advanceTimersByTimeAsync(120_000);
    expect(fetches).toBe(1);
    vi.useRealTimers();
  });

  it("a write that throws is still followed by the reads", async () => {
    vi.useFakeTimers();
    const { session, omni } = testSession();
    await session.refresh();
    let fetches = 0;
    const base = omni.fetchTelemetry;
    omni.fetchTelemetry = () => {
      fetches++;
      return base();
    };
    await expect(
      session.write(() => Promise.reject(new Error("timed out"))),
    ).rejects.toThrow("timed out");
    await vi.advanceTimersByTimeAsync(2_000);
    expect(fetches).toBe(1);
    vi.useRealTimers();
  });

  it("a write is followed by a series of reads while the equipment moves, shared by writes in quick succession", async () => {
    vi.useFakeTimers();
    const { session, omni } = testSession();
    await session.refresh();
    let fetches = 0;
    let configs = 0;
    const base = omni.fetchTelemetry;
    omni.fetchTelemetry = () => {
      fetches++;
      return base();
    };
    const baseConfig = omni.fetchConfig.bind(omni);
    omni.fetchConfig = () => {
      configs++;
      return baseConfig();
    };
    await session.write(() => Promise.resolve());
    await session.write(() => Promise.resolve());
    expect(fetches).toBe(0);
    await vi.advanceTimersByTimeAsync(2_100);
    expect(fetches).toBe(1);
    await vi.advanceTimersByTimeAsync(8_000);
    expect(fetches).toBe(2);
    await vi.advanceTimersByTimeAsync(20_000);
    expect(fetches).toBe(3);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(fetches).toBe(4);
    await vi.advanceTimersByTimeAsync(300_000);
    expect(fetches).toBe(4);
    expect(configs).toBe(0);
    vi.useRealTimers();
  });

  it("keeps reading every ten seconds while a filter primes, one poll at a time, past a failed read", async () => {
    vi.useFakeTimers();
    const { session, omni, telemetry } = testSession();
    telemetry.filters[0]!.filterState = 2;
    await session.refresh();
    let fetches = 0;
    const base = omni.fetchTelemetry;
    const counting = <R extends boolean = false>(options?: { raw?: R }) => {
      fetches++;
      return base(options);
    };
    omni.fetchTelemetry = counting;
    await vi.advanceTimersByTimeAsync(10_100);
    expect(fetches).toBe(1);
    // a write's own reads add no polls of their own
    await session.write(() => Promise.resolve());
    await vi.advanceTimersByTimeAsync(2_100);
    expect(fetches).toBe(2);
    omni.fetchTelemetry = () => {
      fetches++;
      return Promise.reject(new Error("timeout"));
    };
    // the write's 10 s read fails and still re-arms the poll
    await vi.advanceTimersByTimeAsync(8_000);
    expect(fetches).toBe(3);
    omni.fetchTelemetry = counting;
    telemetry.filters[0]!.filterState = 1;
    await vi.advanceTimersByTimeAsync(10_100);
    expect(fetches).toBe(4);
    // priming over, only the write's 30 s and 60 s reads remain
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetches).toBe(6);
    session.stop();
    vi.useRealTimers();
  });

  it("holds the pumps for thirty seconds past the last read that saw priming", async () => {
    vi.useFakeTimers();
    const { session, telemetry } = testSession();
    telemetry.filters[0]!.filterState = 2;
    await session.refresh();
    // the fixture's pool primes for 120 s, an overstaying run keeps the grace ahead
    await vi.advanceTimersByTimeAsync(149_000);
    expect(session.pumpsSettling()).toBe(true);
    telemetry.filters[0]!.filterState = 1;
    await vi.advanceTimersByTimeAsync(1_500);
    expect(session.pumpsSettling()).toBe(true);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(session.pumpsSettling()).toBe(false);
    session.stop();
    vi.useRealTimers();
  });

  it("reads telemetry on every tick, however fresh the SDK's cache is", async () => {
    vi.useFakeTimers();
    const { session, omni } = testSession({ pollInterval: 5 });
    let fetches = 0;
    const base = omni.fetchTelemetry;
    omni.fetchTelemetry = () => {
      fetches++;
      return base();
    };
    session.start();
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(5_000);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(fetches).toBe(3);
    session.stop();
    vi.useRealTimers();
  });

  it("polls on the interval", async () => {
    vi.useFakeTimers();
    const { session } = testSession({ pollInterval: 60 });
    let refreshed = 0;
    session.on("refreshed", () => refreshed++);
    session.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(refreshed).toBe(1);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(refreshed).toBe(2);
    session.stop();
    await vi.advanceTimersByTimeAsync(120_000);
    expect(refreshed).toBe(2);
    vi.useRealTimers();
  });
});
