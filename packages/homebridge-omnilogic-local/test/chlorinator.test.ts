import { Characteristic, Service } from "@homebridge/hap-nodejs";

import { attachChlorinator } from "@/accessories/chlorinator";

import { attachment, read, recordingLog, set } from "./hap";
import { readySession } from "./session";

const chlorinator = async (asSwitch = false, onPercent?: number) => {
  const t = await readySession();
  const { lines, log } = recordingLog();
  const service = asSwitch
    ? new Service.Switch("Pool Chlorinator")
    : new Service.Fan("Pool Chlorinator");
  const handle = attachChlorinator(attachment(service, t.session, log), {
    bodyId: 1,
    asSwitch,
    onPercent,
  });
  handle.update();
  return { ...t, service, handle, lines };
};

describe("chlorinator fan", () => {
  it("reads enabled as on and the output percent as the speed", async () => {
    const { service, handle, telemetry, session } = await chlorinator();
    expect(read(service, Characteristic.On)).toBe(false);
    expect(read(service, Characteristic.RotationSpeed)).toBe(10);
    telemetry.chlorinators[0]!.enable = 1;
    telemetry.chlorinators[0]!.timedPercent = 55;
    await session.refresh();
    handle.update();
    expect(read(service, Characteristic.On)).toBe(true);
    expect(read(service, Characteristic.RotationSpeed)).toBe(55);
  });

  it("writes the slider as the output percent and on as the enable", async () => {
    const { service, sent, lines } = await chlorinator();
    await set(service, Characteristic.RotationSpeed, 40);
    await set(service, Characteristic.On, true);
    await set(service, Characteristic.On, false);
    expect(sent).toEqual([
      {
        name: "SetCHLORTimePercent",
        params: { poolId: 1, equipmentId: 6, data: 40 },
      },
      { name: "SetCHLOREnable", params: { poolId: 1, data: 1 } },
      { name: "SetCHLOREnable", params: { poolId: 1, data: 0 } },
    ]);
    expect(lines).toEqual([
      "Pool Chlorinator: output 40%",
      "Pool Chlorinator: on",
      "Pool Chlorinator: off",
    ]);
  });
});

describe("chlorinator switch", () => {
  it("on sets the chosen output when it differs, then enables", async () => {
    const { service, sent, lines, telemetry, session } = await chlorinator(
      true,
      40,
    );
    await set(service, Characteristic.On, true);
    telemetry.chlorinators[0]!.timedPercent = 40;
    await session.refresh();
    await set(service, Characteristic.On, true);
    expect(sent.map((s) => s.name)).toEqual([
      "SetCHLORTimePercent",
      "SetCHLOREnable",
      "SetCHLOREnable",
    ]);
    expect(lines.at(-1)).toBe("Pool Chlorinator: on at 40%");
  });
});

describe("chlorinator faults", () => {
  it("logs the decoded alert and error once when they change", async () => {
    const { handle, lines, telemetry, session } = await chlorinator();
    expect(lines).toEqual([]);
    telemetry.chlorinators[0]!.chlrAlert = 1;
    telemetry.chlorinators[0]!.chlrError = 1280;
    await session.refresh();
    handle.update();
    handle.update();
    expect(lines).toEqual([
      "Pool Chlorinator: alert Low Salt",
      "Pool Chlorinator: error Relay K1 Shorted, Relay K2 Shorted",
    ]);
    telemetry.chlorinators[0]!.chlrError = 0;
    await session.refresh();
    handle.update();
    expect(lines.at(-1)).toBe("Pool Chlorinator: error None");
  });
});

it("a tap after the chlorinator leaves the controller is logged and reverts the tile", async () => {
  const { service, lines, omni } = await chlorinator(true);
  vi.spyOn(omni.backyard, "body").mockReturnValue(undefined);
  await expect(set(service, Characteristic.On, true)).rejects.toBeDefined();
  expect(lines.at(-1)).toBe(
    "Pool Chlorinator failed, the tile reverts: Error: no chlorinator on body 1",
  );
});
