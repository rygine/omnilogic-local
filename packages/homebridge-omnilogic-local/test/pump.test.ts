import { Characteristic, Service } from "@homebridge/hap-nodejs";

import {
  attachFilter,
  attachPump,
  attachSpilloverFan,
  attachSpilloverSwitch,
} from "@/accessories/pump";

import { configXml, extraConfigXml } from "./fixtures";
import { attachment, read, recordingLog, set } from "./hap";
import { readySession, testSession } from "./session";

const filterFan = async (
  speedMode: "presets" | "percent" | "switch" = "presets",
  onSpeed?: string,
  onPercent?: number,
) => {
  const t = await readySession();
  const service =
    speedMode === "switch"
      ? new Service.Switch("Pool Filter Pump")
      : new Service.Fan("Pool Filter Pump");
  const handle = attachFilter(attachment(service, t.session), {
    bodyId: 1,
    speedMode,
    onSpeed,
    onPercent,
  });
  handle.update();
  return { ...t, service, handle };
};

afterEach(() => vi.useRealTimers());

describe("filter fan", () => {
  it("logs the speed it sent", async () => {
    const t = await readySession();
    const { lines, log } = recordingLog();
    const service = new Service.Fan("Pool Filter Pump");
    attachFilter(attachment(service, t.session, log), {
      bodyId: 1,
      speedMode: "percent",
    });
    await set(service, Characteristic.RotationSpeed, 73);
    expect(lines.at(-1)).toBe("Pool Filter Pump: on at 73%");
    await set(service, Characteristic.On, false);
    expect(lines.at(-1)).toBe("Pool Filter Pump: off");
  });

  it("reads the pump's state and speed, with the slider bounded by the pump's range", async () => {
    const { service } = await filterFan();
    expect(read(service, Characteristic.On)).toBe(true);
    expect(read(service, Characteristic.RotationSpeed)).toBe(58);
    const props = service.getCharacteristic(Characteristic.RotationSpeed).props;
    expect(props.minValue).toBe(58);
    expect(props.maxValue).toBe(100);
  });

  it("in switch mode is a plain switch: on resumes the last speed within the pump's range, off stops", async () => {
    const { service, sent, telemetry, session } = await filterFan("switch");
    expect(service.testCharacteristic(Characteristic.RotationSpeed)).toBe(
      false,
    );
    expect(read(service, Characteristic.On)).toBe(true);
    await set(service, Characteristic.On, false);
    expect(sent.at(-1)?.params).toMatchObject({ equipmentId: 3, isOn: 0 });
    telemetry.filters[0]!.filterState = 0;
    telemetry.filters[0]!.filterSpeed = 0;
    telemetry.filters[0]!.lastSpeed = 73;
    await session.refresh();
    await set(service, Characteristic.On, true);
    expect(sent.at(-1)?.params).toMatchObject({ equipmentId: 3, isOn: 73 });
  });

  it("in switch mode turns on at the chosen preset or percent, the percent held to the pump's range", async () => {
    const stopped = async (onSpeed: string, onPercent?: number) => {
      const t = await filterFan("switch", onSpeed, onPercent);
      t.telemetry.filters[0]!.filterState = 0;
      t.telemetry.filters[0]!.filterSpeed = 0;
      t.telemetry.filters[0]!.lastSpeed = 73;
      await t.session.refresh();
      await set(t.service, Characteristic.On, true);
      return t.sent.at(-1)?.params.isOn;
    };
    expect(await stopped("last")).toBe(73);
    expect(await stopped("low")).toBe(58);
    expect(await stopped("medium")).toBe(80);
    expect(await stopped("high")).toBe(100);
    expect(await stopped("custom", 65)).toBe(65);
    expect(await stopped("custom", 40)).toBe(58);
    expect(await stopped("custom", 120)).toBe(100);
    expect(await stopped("custom")).toBe(73);
  });

  it("turns a single-speed pump on at its maximum, whatever its last speed", async () => {
    const t = testSession({
      config: () =>
        configXml().replace(
          "<Filter-Type>FMT_VARIABLE_SPEED_PUMP</Filter-Type>",
          "<Filter-Type>FMT_SINGLE_SPEED</Filter-Type>",
        ),
    });
    t.telemetry.filters[0]!.filterState = 0;
    t.telemetry.filters[0]!.filterSpeed = 0;
    t.telemetry.filters[0]!.lastSpeed = 73;
    await t.session.refresh();
    const service = new Service.Switch("Pool Filter Pump");
    attachFilter(attachment(service, t.session), {
      bodyId: 1,
      speedMode: "switch",
      onSpeed: "last",
    }).update();

    await set(service, Characteristic.On, true);
    expect(t.sent.at(-1)?.params.isOn).toBe(100);
  });

  it("as a fan ignores the entry's chosen speed and resumes the last", async () => {
    const { service, sent, telemetry, session } = await filterFan(
      "percent",
      "high",
    );
    telemetry.filters[0]!.filterState = 0;
    telemetry.filters[0]!.filterSpeed = 0;
    telemetry.filters[0]!.lastSpeed = 73;
    await session.refresh();
    await set(service, Characteristic.On, true);
    expect(sent.at(-1)?.params.isOn).toBe(73);
  });

  it("snaps a speed to the nearest preset and sends it", async () => {
    const { service, sent } = await filterFan();
    await set(service, Characteristic.RotationSpeed, 70);
    expect(sent.at(-1)).toMatchObject({
      name: "SetUIEquipmentCmd",
      params: { poolId: 1, equipmentId: 3, isOn: 80 },
    });
    expect(read(service, Characteristic.RotationSpeed)).toBe(80);
  });

  it("snaps a dual-speed pump to its two speeds, and starts it at its maximum with no last speed", async () => {
    const t = testSession({
      config: () =>
        configXml().replace(
          "<Filter-Type>FMT_VARIABLE_SPEED_PUMP</Filter-Type>",
          "<Filter-Type>FMT_DUAL_SPEED</Filter-Type>",
        ),
    });
    await t.session.refresh();
    const service = new Service.Fan("Pool Filter Pump");
    attachFilter(attachment(service, t.session), {
      bodyId: 1,
      speedMode: "presets",
    }).update();

    await set(service, Characteristic.RotationSpeed, 80);
    expect(t.sent.at(-1)?.params.isOn).toBe(100);
    await set(service, Characteristic.RotationSpeed, 60);
    expect(t.sent.at(-1)?.params.isOn).toBe(50);

    t.telemetry.filters[0]!.filterState = 0;
    t.telemetry.filters[0]!.filterSpeed = 0;
    t.telemetry.filters[0]!.lastSpeed = 0;
    await t.session.refresh();
    await set(service, Characteristic.On, true);
    expect(t.sent.at(-1)?.params.isOn).toBe(100);
  });

  it("sends a clamped percent in percent mode", async () => {
    const { service, sent } = await filterFan("percent");
    await set(service, Characteristic.RotationSpeed, 40);
    expect(sent.at(-1)?.params.isOn).toBe(58);
    await set(service, Characteristic.RotationSpeed, 73);
    expect(sent.at(-1)?.params.isOn).toBe(73);
  });

  it("off sends the pump's off; on resumes the last speed", async () => {
    const { service, sent, telemetry } = await filterFan();
    await set(service, Characteristic.On, false);
    expect(sent.at(-1)).toMatchObject({
      name: "SetUIEquipmentCmd",
      params: { equipmentId: 3, isOn: 0 },
    });
    telemetry.filters[0]!.filterState = 0;
    telemetry.filters[0]!.filterSpeed = 0;
    await set(service, Characteristic.On, true);
    expect(sent.at(-1)?.params.isOn).toBe(80);
  });

  it("is off while the pump reports a state but no speed, and on resumes the last speed", async () => {
    const { service, handle, sent, telemetry, session } = await filterFan();
    telemetry.filters[0]!.filterState = 11;
    telemetry.filters[0]!.filterSpeed = 0;
    await session.refresh();
    handle.update();
    expect(read(service, Characteristic.On)).toBe(false);
    await set(service, Characteristic.On, true);
    expect(sent.at(-1)?.params).toMatchObject({ equipmentId: 3, isOn: 80 });
  });

  it("shows on while the pump primes and refuses commands for the priming duration plus thirty seconds", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    const { service, handle, sent, telemetry, session } = await filterFan();
    telemetry.filters[0]!.filterState = 2;
    telemetry.filters[0]!.filterSpeed = 0;
    await session.refresh();
    handle.update();
    expect(read(service, Characteristic.On)).toBe(true);
    const before = sent.length;
    await expect(
      set(service, Characteristic.RotationSpeed, 80),
    ).rejects.toBeDefined();
    telemetry.filters[0]!.filterState = 1;
    telemetry.filters[0]!.filterSpeed = 58;
    await session.refresh();
    handle.update();
    // the fixture's pool primes for 120 s
    await vi.advanceTimersByTimeAsync(100_000);
    await expect(
      set(service, Characteristic.RotationSpeed, 80),
    ).rejects.toBeDefined();
    expect(sent.length).toBe(before);
    await vi.advanceTimersByTimeAsync(50_000);
    await set(service, Characteristic.RotationSpeed, 80);
    expect(sent.length).toBe(before + 1);
  });

  it("a started pump shows on until the controller reports it priming or running", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    const { service, handle, telemetry, session } = await filterFan();
    telemetry.filters[0]!.filterState = 0;
    telemetry.filters[0]!.filterSpeed = 0;
    await session.refresh();
    handle.update();
    expect(read(service, Characteristic.On)).toBe(false);
    await set(service, Characteristic.On, true);
    // the valve is still turning: the controller reports nothing yet
    await session.refresh();
    handle.update();
    expect(read(service, Characteristic.On)).toBe(true);
    expect(read(service, Characteristic.RotationSpeed)).toBe(80);
    telemetry.filters[0]!.filterState = 2;
    await session.refresh();
    handle.update();
    expect(read(service, Characteristic.On)).toBe(true);
    telemetry.filters[0]!.filterState = 0;
    await session.refresh();
    handle.update();
    expect(read(service, Characteristic.On)).toBe(false);
  });

  it("a pump that does not prime, stopped inside its start window, shows off", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    const t = await readySession();
    // the spa's pump
    t.omni.config.backyard.bodiesOfWater[1]!.filter!.primingEnabled = false;
    const service = new Service.Fan("Spa Filter Pump");
    const handle = attachFilter(attachment(service, t.session), {
      bodyId: 2,
      speedMode: "presets",
    });
    handle.update();
    await set(service, Characteristic.On, true);
    await set(service, Characteristic.On, false);
    await t.session.refresh();
    handle.update();
    expect(read(service, Characteristic.On)).toBe(false);
  });

  it("a started pump the controller never reports shows off once its window passes", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    const { service, handle, telemetry, session } = await filterFan();
    telemetry.filters[0]!.filterState = 0;
    telemetry.filters[0]!.filterSpeed = 0;
    await session.refresh();
    handle.update();
    await set(service, Characteristic.On, true);
    await vi.advanceTimersByTimeAsync(151_000);
    handle.update();
    expect(read(service, Characteristic.On)).toBe(false);
  });

  it("starting a stopped pump locks both pumps for the priming duration plus thirty seconds", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    const { service, handle, sent, telemetry, session } = await filterFan();
    telemetry.filters[0]!.filterState = 0;
    telemetry.filters[0]!.filterSpeed = 0;
    await session.refresh();
    handle.update();
    await set(service, Characteristic.On, true);
    const before = sent.length;
    await expect(
      set(service, Characteristic.RotationSpeed, 100),
    ).rejects.toBeDefined();
    expect(sent.length).toBe(before);
    await vi.advanceTimersByTimeAsync(150_000);
    await set(service, Characteristic.RotationSpeed, 100);
    expect(sent.length).toBe(before + 1);
  });

  it("a slider drag on a stopped pump, On and RotationSpeed in one write, sends one start at the slider's speed", async () => {
    const { service, sent, telemetry, session } = await filterFan("percent");
    telemetry.filters[0]!.filterState = 0;
    telemetry.filters[0]!.filterSpeed = 0;
    await session.refresh();
    const before = sent.length;
    await Promise.all([
      set(service, Characteristic.On, true),
      set(service, Characteristic.RotationSpeed, 65),
    ]);
    expect(sent.slice(before)).toEqual([
      expect.objectContaining({
        name: "SetUIEquipmentCmd",
        params: expect.objectContaining({ equipmentId: 3, isOn: 65 }),
      }),
    ]);
    expect(read(service, Characteristic.On)).toBe(true);
    expect(read(service, Characteristic.RotationSpeed)).toBe(65);
  });

  it("refuses a command to one pump while the other body's pump primes", async () => {
    const { service, sent, telemetry, session } = await filterFan();
    telemetry.filters[1]!.filterState = 10;
    await session.refresh();
    const before = sent.length;
    await expect(set(service, Characteristic.On, false)).rejects.toBeDefined();
    expect(sent.length).toBe(before);
  });

  it("follows the controller after a refresh", async () => {
    const { service, handle, telemetry, session } = await filterFan();
    telemetry.filters[0]!.filterSpeed = 100;
    await session.refresh();
    handle.update();
    expect(read(service, Characteristic.RotationSpeed)).toBe(100);
  });
});

describe("aux pump switch", () => {
  it("reads the pump from telemetry and writes it with its body's id", async () => {
    const t = testSession({ config: extraConfigXml });
    t.telemetry.pumps[0]!.systemId = 25;
    t.telemetry.pumps[0]!.lastSpeed = 50;
    await t.session.refresh();
    const service = new Service.Switch("Jet Pump");
    const handle = attachPump(attachment(service, t.session), {
      pumpId: 25,
    });
    handle.update();
    expect(read(service, Characteristic.On)).toBe(false);

    await set(service, Characteristic.On, true);
    expect(t.sent.at(-1)).toMatchObject({
      name: "SetUIEquipmentCmd",
      params: { poolId: 2, equipmentId: 25, isOn: 50 },
    });

    // off while its valves change, though the state is not 0
    t.telemetry.pumps[0]!.pumpState = 3;
    await t.session.refresh();
    handle.update();
    expect(read(service, Characteristic.On)).toBe(false);

    t.telemetry.pumps[0]!.pumpState = 1;
    t.telemetry.pumps[0]!.pumpSpeed = 100;
    await t.session.refresh();
    handle.update();
    expect(read(service, Characteristic.On)).toBe(true);
  });

  it("turns the pump on and off and reads its state", async () => {
    const t = testSession({ config: extraConfigXml });
    t.telemetry.pumps[0]!.systemId = 25;
    await t.session.refresh();
    const service = new Service.Switch("Jet Pump");
    const handle = attachPump(attachment(service, t.session), {
      pumpId: 25,
    });
    handle.update();
    expect(read(service, Characteristic.On)).toBe(false);

    await set(service, Characteristic.On, true);
    expect(t.sent.at(-1)).toMatchObject({
      name: "SetUIEquipmentCmd",
      params: { poolId: 2, equipmentId: 25, isOn: 100 },
    });
    await set(service, Characteristic.On, false);
    expect(t.sent.at(-1)?.params.isOn).toBe(0);

    t.telemetry.pumps[0]!.pumpState = 1;
    t.telemetry.pumps[0]!.pumpSpeed = 100;
    await t.session.refresh();
    handle.update();
    expect(read(service, Characteristic.On)).toBe(true);
  });
});

describe("spillover", () => {
  it("as a fan sends the spillover command with the slider's speed, 0 for off", async () => {
    const t = await readySession();
    const service = new Service.Fan("Pool Spillover");
    const handle = attachSpilloverFan(attachment(service, t.session), {
      bodyId: 1,
      speedMode: "percent",
    });
    handle.update();
    expect(read(service, Characteristic.On)).toBe(false);
    await set(service, Characteristic.RotationSpeed, 73);
    expect(t.sent.at(-1)).toMatchObject({
      name: "SetUISpilloverCmd",
      params: { poolId: 1, data: 73, isCountDownTimer: 0 },
    });
    expect(read(service, Characteristic.RotationSpeed)).toBe(73);
    await set(service, Characteristic.On, false);
    expect(t.sent.at(-1)?.params).toMatchObject({ data: 0 });
    expect(read(service, Characteristic.On)).toBe(false);
  });

  it("as a fan snaps the slider to a preset in presets mode", async () => {
    const t = await readySession();
    const service = new Service.Fan("Pool Spillover");
    attachSpilloverFan(attachment(service, t.session), {
      bodyId: 1,
      speedMode: "presets",
    });
    await set(service, Characteristic.RotationSpeed, 70);
    expect(t.sent.at(-1)?.params).toMatchObject({ data: 80 });
  });

  it("as a fan sends one command for a slider drag", async () => {
    const t = await readySession();
    const service = new Service.Fan("Pool Spillover");
    attachSpilloverFan(attachment(service, t.session), {
      bodyId: 1,
      speedMode: "percent",
    });
    const before = t.sent.length;
    await Promise.all([
      set(service, Characteristic.On, true),
      set(service, Characteristic.RotationSpeed, 65),
    ]);
    expect(t.sent.slice(before)).toEqual([
      expect.objectContaining({
        name: "SetUISpilloverCmd",
        params: expect.objectContaining({ poolId: 1, data: 65 }),
      }),
    ]);
  });

  it("as a fan turned on without a speed starts at the pump's last speed", async () => {
    const t = await readySession();
    t.telemetry.filters[0]!.lastSpeed = 73;
    await t.session.refresh();
    const service = new Service.Fan("Pool Spillover");
    attachSpilloverFan(attachment(service, t.session), {
      bodyId: 1,
      speedMode: "percent",
    });
    await set(service, Characteristic.On, true);
    expect(t.sent.at(-1)?.params).toMatchObject({ data: 73 });
  });

  it("as a switch turns on at the chosen speed with the countdown", async () => {
    const t = await readySession();
    const service = new Service.Switch("Pool Spillover High");
    attachSpilloverSwitch(attachment(service, t.session), {
      bodyId: 1,
      onSpeed: "high",
      offAfter: 90,
    });
    await set(service, Characteristic.On, true);
    expect(t.sent.at(-1)).toMatchObject({
      name: "SetUISpilloverCmd",
      params: {
        poolId: 1,
        data: 100,
        isCountDownTimer: 1,
        endTimeHours: 1,
        endTimeMinutes: 30,
      },
    });
    await set(service, Characteristic.On, false);
    expect(t.sent.at(-1)?.params).toMatchObject({
      data: 0,
      isCountDownTimer: 0,
    });
  });

  it("as a switch with no chosen speed turns on at the pump's last speed", async () => {
    const t = await readySession();
    const service = new Service.Switch("Pool Spillover");
    attachSpilloverSwitch(attachment(service, t.session), { bodyId: 1 });
    await set(service, Characteristic.On, true);
    expect(t.sent.at(-1)?.params).toMatchObject({ data: 80 });
  });

  it("shows on from the moment it is sent until the start window passes", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    const t = await readySession();
    const service = new Service.Fan("Pool Spillover");
    const handle = attachSpilloverFan(attachment(service, t.session), {
      bodyId: 1,
      speedMode: "percent",
    });
    await set(service, Characteristic.On, true);
    // the valve is still turning: the controller reports nothing yet
    await t.session.refresh();
    handle.update();
    expect(read(service, Characteristic.On)).toBe(true);
    // the fixture's pool primes for 120 s
    await vi.advanceTimersByTimeAsync(151_000);
    handle.update();
    expect(read(service, Characteristic.On)).toBe(false);
  });

  it("waits no priming time when the filter pump is already running", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    const t = await readySession();
    t.telemetry.filters[0]!.filterSpeed = 50;
    t.telemetry.filters[0]!.filterState = 1;
    await t.session.refresh();
    const service = new Service.Fan("Pool Spillover");
    const handle = attachSpilloverFan(attachment(service, t.session), {
      bodyId: 1,
      speedMode: "percent",
    });
    await set(service, Characteristic.On, true);
    await t.session.refresh();
    handle.update();
    expect(read(service, Characteristic.On)).toBe(true);
    await vi.advanceTimersByTimeAsync(61_000);
    handle.update();
    expect(read(service, Characteristic.On)).toBe(false);
  });

  it("shows off as soon as a stop is sent inside the start window", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    const t = await readySession();
    t.omni.config.backyard.bodiesOfWater[0]!.filter!.primingEnabled = false;
    const service = new Service.Switch("Pool Spillover");
    const handle = attachSpilloverSwitch(attachment(service, t.session), {
      bodyId: 1,
    });
    await set(service, Characteristic.On, true);
    handle.update();
    expect(read(service, Characteristic.On)).toBe(true);
    await set(service, Characteristic.On, false);
    handle.update();
    expect(read(service, Characteristic.On)).toBe(false);
  });

  it("is refused while a pump primes, and sends nothing", async () => {
    const t = await readySession();
    const service = new Service.Fan("Pool Spillover");
    attachSpilloverFan(attachment(service, t.session), {
      bodyId: 1,
      speedMode: "percent",
    });
    t.telemetry.filters[1]!.filterState = 10;
    await t.session.refresh();
    const before = t.sent.length;
    await expect(
      set(service, Characteristic.RotationSpeed, 73),
    ).rejects.toBeDefined();
    expect(t.sent.length).toBe(before);
  });

  it("reads on and the speed from the filter while the valves are in spillover", async () => {
    const t = await readySession();
    const service = new Service.Fan("Pool Spillover");
    const handle = attachSpilloverFan(attachment(service, t.session), {
      bodyId: 1,
      speedMode: "percent",
    });
    t.telemetry.filters[0]!.valvePosition = 3;
    t.telemetry.filters[0]!.filterSpeed = 80;
    await t.session.refresh();
    handle.update();
    expect(read(service, Characteristic.On)).toBe(true);
    expect(read(service, Characteristic.RotationSpeed)).toBe(80);
  });
});

it("a tap after the filter leaves the controller is logged and reverts the tile", async () => {
  const t = await readySession();
  const { lines, log } = recordingLog();
  const service = new Service.Switch("Pool Filter Pump");
  attachFilter(attachment(service, t.session, log), {
    bodyId: 1,
    speedMode: "switch",
  });
  vi.spyOn(t.omni.backyard, "body").mockReturnValue(undefined);
  await expect(set(service, Characteristic.On, true)).rejects.toBeDefined();
  expect(lines.at(-1)).toBe(
    "Pool Filter Pump failed, the tile reverts: Error: no filter on body 1",
  );
});
