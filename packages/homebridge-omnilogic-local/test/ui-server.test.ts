import { discoverHandler } from "@/ui/discover";

import { testSession } from "./session";

describe("discover handler", () => {
  it("returns the exposable list for a host", async () => {
    const t = testSession();
    const list = await discoverHandler(
      { host: "127.0.0.1", port: 10444 },
      () => t.omni,
    );
    const pool = list.find(
      (e) => e.kind === "filter" && e.defaultName === "Pool Filter Pump",
    );
    expect(pool).toBeDefined();
    expect(pool?.lastSpeed).toBe(80);
  });

  it("keeps the list when only the telemetry read fails", async () => {
    const t = testSession();
    t.omni.fetchTelemetry = () => Promise.reject(new Error("timed out"));
    const list = await discoverHandler({ host: "127.0.0.1" }, () => t.omni);
    const pool = list.find((e) => e.kind === "filter");
    expect(pool?.presets).toEqual({ low: 58, medium: 80, high: 100 });
    expect(pool?.lastSpeed).toBeUndefined();
  });

  it("refuses a request without a host", async () => {
    await expect(
      discoverHandler({ host: "" }, () => testSession().omni),
    ).rejects.toThrow(/host/);
  });
});
