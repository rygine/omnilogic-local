import { Characteristic, Service } from "@homebridge/hap-nodejs";
import {
  LIGHT_BRIGHTNESS,
  type LightWriteOptions,
} from "@rygine/omnilogic-local-sdk";

import {
  attachLight,
  attachLightDimmer,
  attachLightSwitch,
} from "@/accessories/light";

import { omniDirectConfigXml } from "./fixtures";
import { attachment, read, recordingLog, set } from "./hap";
import { readySession, testSession } from "./session";

const light = async (
  setup?: (t: ReturnType<typeof testSession>) => void,
  offAfter?: number,
  config?: () => string,
) => {
  const t = testSession({ config });
  setup?.(t);
  await t.session.refresh();
  const service = new Service.Lightbulb("Pool Light");
  const handle = attachLight(attachment(service, t.session), {
    lightId: 8,
    offAfter,
  });
  handle.update();
  return { ...t, service, handle };
};

describe("light", () => {
  it("reads off with the current show's color", async () => {
    // Deep Blue Sea, a color unlike hap-nodejs's defaults
    const { service } = await light((t) => {
      t.telemetry.colorLogicLights[0]!.currentShow = 1;
    });
    expect(read(service, Characteristic.On)).toBe(false);
    expect(read(service, Characteristic.Hue)).toBe(240);
    expect(read(service, Characteristic.Saturation)).toBe(100);
  });

  it("on and off send the light's own commands", async () => {
    const { service, handle, sent, telemetry, session } = await light();
    await set(service, Characteristic.On, true);
    expect(sent.at(-1)?.name).toBe("SetUIEquipmentCmd");
    expect(sent.at(-1)?.params).toMatchObject({
      poolId: 1,
      equipmentId: 8,
      isOn: 1,
    });
    telemetry.colorLogicLights[0]!.lightState = 6;
    await session.refresh();
    handle.update();
    await set(service, Characteristic.On, false);
    expect(sent.at(-1)?.params).toMatchObject({ equipmentId: 8, isOn: 0 });
  });

  it("with a turn-off time, on carries the controller's countdown and off does not", async () => {
    const { service, handle, sent, telemetry, session } = await light(
      undefined,
      45,
    );
    await set(service, Characteristic.On, true);
    expect(sent.at(-1)?.params).toMatchObject({
      equipmentId: 8,
      isOn: 1,
      isCountDownTimer: 1,
      endTimeHours: 0,
      endTimeMinutes: 45,
      daysActive: 127,
    });
    telemetry.colorLogicLights[0]!.lightState = 6;
    await session.refresh();
    handle.update();
    await set(service, Characteristic.On, false);
    expect(sent.at(-1)?.params).toMatchObject({ isOn: 0, isCountDownTimer: 0 });
  });

  it("refuses a set while the light is still changing, sending nothing", async () => {
    const { service, sent } = await light((t) => {
      t.telemetry.colorLogicLights[0]!.lightState = 4;
    });
    const before = sent.length;
    await expect(set(service, Characteristic.On, false)).rejects.toBeDefined();
    expect(sent.length).toBe(before);
  });

  it("counts as changing from a send until the next read", async () => {
    const { service, handle, sent, session } = await light();
    await set(service, Characteristic.On, true);
    const before = sent.length;
    await expect(set(service, Characteristic.Hue, 240)).rejects.toBeDefined();
    expect(sent.length).toBe(before);
    await session.refresh();
    handle.update();
    await set(service, Characteristic.On, false);
    expect(sent.length).toBe(before + 1);
  });

  it("a real write failure reaches HomeKit", async () => {
    const { service, omni } = await light();
    const original = omni.command.bind(omni);
    omni.command = ((name: string, params?: unknown, options?: unknown) =>
      name === "SetUIEquipmentCmd"
        ? Promise.reject(new Error("boom"))
        : original(name as never, params as never, options as never)) as never;
    await expect(set(service, Characteristic.On, true)).rejects.toBeDefined();
  });

  it("a color snaps to the nearest solid show and reports that show's color", async () => {
    // hue and saturation arrive together and go out as one command
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { service, sent, telemetry } = await light();
    telemetry.colorLogicLights[0]!.lightState = 6;
    const hueSet = set(service, Characteristic.Hue, 235);
    const satSet = set(service, Characteristic.Saturation, 90);
    await vi.advanceTimersByTimeAsync(200);
    await Promise.all([hueSet, satSet]);
    // Deep Blue Sea is show 1 on a UCL light
    expect(sent.at(-1)).toMatchObject({
      name: "SetStandAloneLightShow",
      params: { equipmentId: 8, data: 1 },
    });
    expect(read(service, Characteristic.Hue)).toBe(240);
    expect(read(service, Characteristic.Saturation)).toBe(100);
    vi.useRealTimers();
  });

  it("an OmniDirect light dims in steps of 20 and keeps its speed and brightness on a color change", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { service, handle, sent, session } = await light(
      (t) => {
        // 2x at 60%
        Object.assign(t.telemetry.colorLogicLights[0]!, {
          speed: 5,
          brightness: 2,
        });
      },
      undefined,
      omniDirectConfigXml,
    );
    expect(read(service, Characteristic.Brightness)).toBe(60);

    const brightnessSet = set(service, Characteristic.Brightness, 80);
    await vi.advanceTimersByTimeAsync(200);
    await brightnessSet;
    expect(sent.at(-1)).toMatchObject({
      name: "SetStandAloneLightShow",
      params: { data: 6, field19: 5, field1a: 3 },
    });
    await session.refresh();
    handle.update();

    const hueSet = set(service, Characteristic.Hue, 235);
    const satSet = set(service, Characteristic.Saturation, 90);
    await vi.advanceTimersByTimeAsync(200);
    await Promise.all([hueSet, satSet]);
    expect(sent.at(-1)?.params).toMatchObject({
      data: 1,
      field19: 5,
      field1a: 2,
    });
    vi.useRealTimers();
  });

  it("on and a brightness in the same moment go out as one show write, with the turn-off time", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { service, sent } = await light(undefined, 45, omniDirectConfigXml);
    const before = sent.length;
    const onSet = set(service, Characteristic.On, true);
    const brightnessSet = set(service, Characteristic.Brightness, 40);
    await vi.advanceTimersByTimeAsync(200);
    await Promise.all([onSet, brightnessSet]);
    expect(sent.length).toBe(before + 1);
    expect(sent.at(-1)).toMatchObject({
      name: "SetStandAloneLightShow",
      params: { data: 6, field1a: 1, isCountDownTimer: 1, endTimeMinutes: 45 },
    });
    vi.useRealTimers();
  });

  it("a light without OmniDirect has no brightness", async () => {
    const { service } = await light();
    expect(
      service.characteristics.some(
        (c) => c.UUID === Characteristic.Brightness.UUID,
      ),
    ).toBe(false);
  });

  it("an animated show reports on with the last mapped color", async () => {
    const { service, handle, telemetry, session } = await light((t) => {
      t.telemetry.colorLogicLights[0]!.currentShow = 1;
    });
    telemetry.colorLogicLights[0]!.lightState = 6;
    telemetry.colorLogicLights[0]!.currentShow = 11;
    await session.refresh();
    handle.update();
    expect(read(service, Characteristic.On)).toBe(true);
    expect(read(service, Characteristic.Hue)).toBe(240);
    expect(read(service, Characteristic.Saturation)).toBe(100);
  });
});

const lightSwitch = async (
  offAfter?: number,
  options: Pick<LightWriteOptions, "speed" | "brightness"> = {},
  config?: () => string,
) => {
  const t =
    config === undefined ? await readySession() : testSession({ config });
  if (config !== undefined) {
    await t.session.refresh();
  }
  const service = new Service.Switch("Pool Light");
  const handle = attachLightSwitch(attachment(service, t.session), {
    lightId: 8,
    show: 6,
    offAfter,
    ...options,
  });
  handle.update();
  return { ...t, service, handle };
};

describe("light switch", () => {
  it("reads on while the light is lit", async () => {
    const { service, handle, telemetry, session } = await lightSwitch();
    expect(read(service, Characteristic.On)).toBe(false);
    telemetry.colorLogicLights[0]!.lightState = 6;
    await session.refresh();
    handle.update();
    expect(read(service, Characteristic.On)).toBe(true);
  });

  it("on sends the chosen show, off sends the light's off", async () => {
    const { service, handle, sent, telemetry, session } = await lightSwitch();
    await set(service, Characteristic.On, true);
    expect(sent.at(-1)).toMatchObject({
      name: "SetStandAloneLightShow",
      params: { poolId: 1, equipmentId: 8, data: 6, isCountDownTimer: 0 },
    });
    telemetry.colorLogicLights[0]!.lightState = 6;
    await session.refresh();
    handle.update();
    await set(service, Characteristic.On, false);
    expect(sent.at(-1)).toMatchObject({
      name: "SetUIEquipmentCmd",
      params: { equipmentId: 8, isOn: 0 },
    });
  });

  it("keeps the light's speed and brightness, or sends the chosen ones", async () => {
    // a light outside OmniDirect takes none
    const standalone = await lightSwitch();
    await set(standalone.service, Characteristic.On, true);
    expect(standalone.sent.at(-1)?.params).toMatchObject({
      field19: 0,
      field1a: 0,
    });

    // the fixture's 1x at 100%
    const kept = await lightSwitch(undefined, {}, omniDirectConfigXml);
    await set(kept.service, Characteristic.On, true);
    expect(kept.sent.at(-1)?.params).toMatchObject({ field19: 4, field1a: 4 });

    const chosen = await lightSwitch(
      undefined,
      { speed: "2x", brightness: 60 },
      omniDirectConfigXml,
    );
    await set(chosen.service, Characteristic.On, true);
    expect(chosen.sent.at(-1)?.params).toMatchObject({
      data: 6,
      field19: 5,
      field1a: 2,
      field1b: 0,
    });
  });

  it("refuses a set while the light is still changing, sending nothing", async () => {
    const { service, sent, telemetry, session } = await lightSwitch();
    telemetry.colorLogicLights[0]!.lightState = 3;
    await session.refresh();
    const before = sent.length;
    await expect(set(service, Characteristic.On, true)).rejects.toBeDefined();
    expect(sent.length).toBe(before);
  });

  it("refuses a second set before the next read, then sends after it", async () => {
    const { service, handle, sent, session } = await lightSwitch();
    await set(service, Characteristic.On, true);
    const before = sent.length;
    await expect(set(service, Characteristic.On, false)).rejects.toBeDefined();
    expect(sent.length).toBe(before);
    await session.refresh();
    handle.update();
    await set(service, Characteristic.On, false);
    expect(sent.at(-1)?.name).toBe("SetUIEquipmentCmd");
  });

  it("with a turn-off time, the show carries the controller's countdown", async () => {
    const { service, sent } = await lightSwitch(45);
    await set(service, Characteristic.On, true);
    expect(sent.at(-1)?.params).toMatchObject({
      data: 6,
      isCountDownTimer: 1,
      endTimeHours: 0,
      endTimeMinutes: 45,
      daysActive: 127,
    });
  });
});

// the brightness code the controller takes for a percent
const codeOf = (percent: number) =>
  Number(Object.entries(LIGHT_BRIGHTNESS).find(([, p]) => p === percent)?.[0]);

const dimmer = async (offAfter?: number) => {
  const t = testSession({ config: omniDirectConfigXml });
  await t.session.refresh();
  const service = new Service.Lightbulb("Pool Color Lights Deep Blue Sea");
  const handle = attachLightDimmer(attachment(service, t.session), {
    lightId: 8,
    show: 1,
    offAfter,
  });
  handle.update();
  return { ...t, service, handle };
};

describe("one-color light", () => {
  it("reads on and the brightness from telemetry", async () => {
    const { service, handle, telemetry, session } = await dimmer();
    expect(read(service, Characteristic.On)).toBe(false);
    expect(read(service, Characteristic.Brightness)).toBe(100);
    telemetry.colorLogicLights[0]!.lightState = 6;
    telemetry.colorLogicLights[0]!.brightness = codeOf(60);
    await session.refresh();
    handle.update();
    expect(read(service, Characteristic.On)).toBe(true);
    expect(read(service, Characteristic.Brightness)).toBe(60);
  });

  it("on sends the chosen show at the current brightness, with the countdown", async () => {
    const { service, sent } = await dimmer(90);
    await set(service, Characteristic.On, true);
    expect(sent.at(-1)).toMatchObject({
      name: "SetStandAloneLightShow",
      params: {
        poolId: 1,
        equipmentId: 8,
        data: 1,
        field1a: codeOf(100),
        isCountDownTimer: 1,
        endTimeHours: 1,
        endTimeMinutes: 30,
      },
    });
    expect(read(service, Characteristic.On)).toBe(true);
  });

  it("a brightness set sends the show at that brightness and keeps it", async () => {
    const { service, sent } = await dimmer();
    await set(service, Characteristic.Brightness, 60);
    expect(sent.at(-1)).toMatchObject({
      name: "SetStandAloneLightShow",
      params: { data: 1, field1a: codeOf(60), isCountDownTimer: 0 },
    });
    expect(read(service, Characteristic.Brightness)).toBe(60);
    expect(read(service, Characteristic.On)).toBe(true);
  });

  it("off sends the light's off", async () => {
    const { service, sent } = await dimmer();
    await set(service, Characteristic.On, false);
    expect(sent.at(-1)).toMatchObject({
      name: "SetUIEquipmentCmd",
      params: { equipmentId: 8, isOn: 0 },
    });
    expect(read(service, Characteristic.On)).toBe(false);
  });
});

it("a color after the light leaves the controller is logged and reverts the tile", async () => {
  const t = await readySession();
  const { lines, log } = recordingLog();
  const service = new Service.Lightbulb("Pool Light");
  attachLight(attachment(service, t.session, log), { lightId: 8 });
  vi.spyOn(t.omni.backyard, "bodies", "get").mockReturnValue([]);
  await expect(set(service, Characteristic.Hue, 240)).rejects.toBeDefined();
  expect(lines.at(-1)).toBe(
    "Pool Light failed, the tile reverts: Error: no light 8",
  );
});
