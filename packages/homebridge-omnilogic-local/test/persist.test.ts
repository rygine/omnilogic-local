import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { OffTimers, Readings } from "@/persist";

import { recordingLog, silentLog } from "./hap";

const file = () => join(mkdtempSync(join(tmpdir(), "omni-")), "state.json");

describe("Readings", () => {
  it("returns a reading and remembers it for when there is none", () => {
    const r = new Readings(file());
    expect(r.keep("water:1", undefined)).toBeUndefined();
    expect(r.keep("water:1", 84)).toBe(84);
    expect(r.keep("water:1", undefined)).toBe(84);
  });

  it("survives a restart through its file", () => {
    const path = file();
    new Readings(path).keep("air", 78);
    expect(new Readings(path).keep("air", undefined)).toBe(78);
  });
});

const log = silentLog;

afterEach(() => vi.useRealTimers());

describe("off timers", () => {
  it("arms a deadline, keeps it in the file, and fires it after the minutes", async () => {
    vi.useFakeTimers();
    const path = file();
    const fired: number[] = [];
    const t = new OffTimers(path, log);
    const heater = t.for("h:4", 30, async () => {
      fired.push(Date.now());
    });
    heater(true);
    expect(JSON.parse(readFileSync(path, "utf8"))["h:4"]).toBe(
      Date.now() + 30 * 60_000,
    );
    await vi.advanceTimersByTimeAsync(29 * 60_000);
    expect(fired).toEqual([]);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fired.length).toBe(1);
    expect(JSON.parse(readFileSync(path, "utf8"))).toEqual({});
  });

  it("clear drops the deadline so nothing fires", async () => {
    vi.useFakeTimers();
    const t = new OffTimers(file(), log);
    let fired = 0;
    const heater = t.for("h:4", 5, async () => {
      fired += 1;
    });
    expect(heater(true)).toBe(true);
    expect(heater(false)).toBe(true);
    expect(heater(false)).toBe(false);
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(fired).toBe(0);
  });

  it("re-arms a saved deadline on the next run, and fires a past one at once", async () => {
    vi.useFakeTimers();
    const path = file();
    writeFileSync(
      path,
      JSON.stringify({ "h:4": Date.now() + 60_000, "h:9": Date.now() - 1 }),
    );
    const { lines, log: recording } = recordingLog();
    const t = new OffTimers(path, recording);
    const fired: string[] = [];
    t.for(
      "h:4",
      60,
      async () => {
        fired.push("h:4");
      },
      "Pool Heater",
    );
    t.for(
      "h:9",
      60,
      async () => {
        fired.push("h:9");
      },
      "Spa Heater",
    );
    expect(lines).toEqual([
      "Pool Heater: found a timer from before the restart, 1 minute left",
      "Spa Heater: found a timer that ran out while Homebridge was down, turning it off now",
    ]);
    await vi.advanceTimersByTimeAsync(0);
    expect(fired).toEqual(["h:9"]);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fired).toEqual(["h:9", "h:4"]);
  });

  it("sends the off again a minute later when it fails, keeping the deadline", async () => {
    vi.useFakeTimers();
    const path = file();
    let attempts = 0;
    const t = new OffTimers(path, log);
    t.for("h:4", 5, async () => {
      attempts += 1;
      if (attempts === 1) {
        throw new Error("timed out");
      }
    })(true);
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    expect(attempts).toBe(1);
    expect(JSON.parse(readFileSync(path, "utf8"))["h:4"]).toBeDefined();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(attempts).toBe(2);
    expect(JSON.parse(readFileSync(path, "utf8"))).toEqual({});
  });

  it("a re-arm during an in-flight fire keeps the new deadline", async () => {
    vi.useFakeTimers();
    const path = file();
    const t = new OffTimers(path, log);
    let calls = 0;
    const first = Promise.withResolvers<void>();
    const heater = t.for("h:4", 30, async () => {
      calls += 1;
      if (calls === 1) {
        await first.promise;
      }
    });
    heater(true);
    await vi.advanceTimersByTimeAsync(30 * 60_000);
    expect(calls).toBe(1);
    heater(true);
    const rearmed = JSON.parse(readFileSync(path, "utf8"))["h:4"];
    first.resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(JSON.parse(readFileSync(path, "utf8"))["h:4"]).toBe(rearmed);
    await vi.advanceTimersByTimeAsync(30 * 60_000);
    expect(calls).toBe(2);
    expect(JSON.parse(readFileSync(path, "utf8"))).toEqual({});
  });

  it("a re-arm during an in-flight failing fire is not preempted by the retry", async () => {
    vi.useFakeTimers();
    const path = file();
    const t = new OffTimers(path, log);
    let calls = 0;
    const first = Promise.withResolvers<void>();
    const heater = t.for("h:4", 5, async () => {
      calls += 1;
      if (calls === 1) {
        await first.promise;
      }
    });
    heater(true);
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    expect(calls).toBe(1);
    heater(true);
    const rearmed = JSON.parse(readFileSync(path, "utf8"))["h:4"];
    first.reject(new Error("timed out"));
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(calls).toBe(1);
    expect(JSON.parse(readFileSync(path, "utf8"))["h:4"]).toBe(rearmed);
    await vi.advanceTimersByTimeAsync(4 * 60_000);
    expect(calls).toBe(2);
  });

  it("stop is final even when an in-flight fire rejects after it", async () => {
    vi.useFakeTimers();
    const path = file();
    const t = new OffTimers(path, log);
    let calls = 0;
    const first = Promise.withResolvers<void>();
    const heater = t.for("h:4", 5, async () => {
      calls += 1;
      await first.promise;
    });
    heater(true);
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    expect(calls).toBe(1);
    const deadline = JSON.parse(readFileSync(path, "utf8"))["h:4"];
    t.stop();
    first.reject(new Error("timed out"));
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(calls).toBe(1);
    expect(JSON.parse(readFileSync(path, "utf8"))["h:4"]).toBe(deadline);
  });

  it("drops a saved deadline that is not a number and keeps the rest", async () => {
    vi.useFakeTimers();
    const path = file();
    writeFileSync(
      path,
      JSON.stringify({ "h:4": "soon", "h:9": Date.now() + 60_000 }),
    );
    const t = new OffTimers(path, log);
    const fired: string[] = [];
    t.for("h:4", 60, async () => {
      fired.push("h:4");
    });
    t.for("h:9", 60, async () => {
      fired.push("h:9");
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(fired).toEqual([]);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fired).toEqual(["h:9"]);
  });

  it("prune drops a saved deadline nothing bound and keeps the rest", () => {
    const path = file();
    const soon = Date.now() + 60_000;
    writeFileSync(
      path,
      JSON.stringify({
        "heater:4": soon,
        "heater:9": soon,
        "old:heater:4": soon,
      }),
    );
    const { lines, log: recording } = recordingLog();
    const t = new OffTimers(path, recording);
    t.for("heater:4", 30, async () => {});
    t.prune();
    expect(JSON.parse(readFileSync(path, "utf8"))).toEqual({
      "heater:4": soon,
    });
    expect(lines).toContain(
      "heater:9: dropping a saved timer that is no longer configured",
    );
    expect(lines).toContain(
      "old:heater:4: dropping a saved timer that is no longer configured",
    );
    t.stop();
  });

  it("starts empty when the file is missing or unreadable", () => {
    const path = file();
    expect(existsSync(path)).toBe(false);
    expect(() => new OffTimers(path, log)).not.toThrow();
    writeFileSync(path, "not json");
    expect(() => new OffTimers(path, log)).not.toThrow();
  });
});
