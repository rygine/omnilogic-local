import {
  FirmwareTooOldError,
  type OmniLogic,
} from "@rygine/omnilogic-local-sdk";

import { checkFirmware } from "./connection";

// a fake controller for checkFirmware
const controller = (fake: {
  refresh: () => Promise<void>;
  systemInfoVersion?: string;
}) =>
  ({
    refresh: fake.refresh,
    fetchSysInfo: () =>
      fake.systemInfoVersion === undefined
        ? Promise.reject(new Error("timeout"))
        : Promise.resolve({
            components: [{ type: "MSP", version: fake.systemInfoVersion }],
          }),
  }) as unknown as OmniLogic;

const refused = (version?: string) => () =>
  Promise.reject(new FirmwareTooOldError({ version, minimum: "R0502000" }));

describe("checkFirmware", () => {
  it("passes supported firmware", async () => {
    expect(
      await checkFirmware(controller({ refresh: () => Promise.resolve() })),
    ).toEqual({ ok: true });
  });

  it("names refused firmware, reading the version from the system info when telemetry has none", async () => {
    expect(
      await checkFirmware(controller({ refresh: refused("R0501000") })),
    ).toEqual({
      ok: false,
      message:
        "Firmware R0501000 is not supported: R0502000 or newer required.",
    });
    expect(
      await checkFirmware(
        controller({ refresh: refused(), systemInfoVersion: "R0302001" }),
      ),
    ).toEqual({
      ok: false,
      message:
        "Firmware R0302001 is not supported: R0502000 or newer required.",
    });
    expect(await checkFirmware(controller({ refresh: refused() }))).toEqual({
      ok: false,
      message: "Firmware version unknown: R0502000 or newer required.",
    });
  });

  it("reports a controller that does not answer", async () => {
    expect(
      await checkFirmware(
        controller({ refresh: () => Promise.reject(new Error("timeout")) }),
      ),
    ).toEqual({ ok: false });
  });
});
