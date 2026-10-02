import { FirmwareTooOldError } from "@rygine/omnilogic-local-sdk";

import { discoverHandler } from "@/ui/discover";

import { testSession } from "./session";
import { telemetryFixture } from "./telemetry";

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

  it("refuses a controller whose firmware is not supported, naming it, from the system info when telemetry reports none", async () => {
    const telemetry = telemetryFixture();
    telemetry.backyard.mspVersion = "R0501000";
    const older = testSession({ telemetry });
    const error = await discoverHandler(
      { host: "127.0.0.1" },
      () => older.omni,
    ).catch((e: unknown) => e);
    expect((error as Error).message).toBe(
      "Firmware R0501000 is not supported: R0502000 or newer required.",
    );
    expect((error as Error).cause).toBeInstanceOf(FirmwareTooOldError);

    delete telemetry.backyard.mspVersion;
    const unreported = testSession({ telemetry });
    vi.spyOn(unreported.omni, "fetchSysInfo").mockResolvedValueOnce({
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
    await expect(
      discoverHandler({ host: "127.0.0.1" }, () => unreported.omni),
    ).rejects.toThrow(
      "Firmware R0302001 is not supported: R0502000 or newer required.",
    );
  });

  it("refuses a request without a host", async () => {
    await expect(
      discoverHandler({ host: "" }, () => testSession().omni),
    ).rejects.toThrow(/host/);
  });
});
