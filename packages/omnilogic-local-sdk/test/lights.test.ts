import { ColorLogicPowerState as P } from "@/constants/lightShows";
import { Light } from "@/equipment/light";
import { CommandFailedError, OmniValidationError } from "@/utils/errors";

import { makeRecorder, valuesOf } from "./mocks";

// a scripted light that steps its state toward a target on each refresh and can ignore a show
const lightStub = (
  opts: {
    state?: number;
    show?: number;
    speed?: number;
    brightness?: number;
    // the writes whose speed and brightness the light ignores
    dropDimming?: number;
    omniDirect?: boolean;
    settleTo?: number[];
    drop?: number;
  } = {},
) => {
  let lightState = opts.state ?? P.ACTIVE;
  let currentShow = opts.show ?? 2;
  const queue = [...(opts.settleTo ?? [])];
  let drop = opts.drop ?? 0;
  let dropDimming = opts.dropDimming ?? 0;
  let speed = opts.speed ?? 4;
  let brightness = opts.brightness ?? 4;
  const sends: { name: string; params: Record<string, number | string> }[] = [];
  let refreshes = 0;

  const { omni, sent } = makeRecorder({
    onSend: (name, params) => {
      sends.push({ name, params });
      if (name === "SetStandAloneLightShow") {
        if (drop > 0) {
          drop--;
        } else {
          currentShow = Number(params.data);
          if (dropDimming > 0) {
            dropDimming--;
          } else {
            speed = Number(params.field19);
            brightness = Number(params.field1a);
          }
        }
      } else if (name === "SetUIEquipmentCmd") {
        lightState = params.isOn ? P.ACTIVE : P.OFF;
      }
    },
    telemetry: () => {
      refreshes++;
      if (queue.length) {
        lightState = queue.shift()!;
      }
      return {
        backyard: { configChksum: refreshes, state: 1 },
        colorLogicLights: [
          {
            systemId: 8,
            lightState,
            currentShow,
            brightness,
            specialEffect: 0,
            speed,
          },
        ],
      };
    },
    config: () => ({
      backyard: {
        bodiesOfWater: [
          {
            systemId: 1,
            relays: [],
            sensors: [],
            colorLogicLights: [
              {
                systemId: 8,
                type: "COLOR_LOGIC_UCL",
                v2Active: opts.omniDirect === true,
              },
            ],
          },
        ],
      },
    }),
  });

  return {
    light: new Light(omni, 1, 8, "Pool Light"),
    sent,
    fast: { pollMs: 0, timeoutMs: 50 },
    shows: () => sends.filter((s) => s.name === "SetStandAloneLightShow"),
    power: () =>
      sends
        .filter((s) => s.name === "SetUIEquipmentCmd")
        .map((s) => Number(s.params.isOn)),
    show: () => currentShow,
    get refreshes() {
      return refreshes;
    },
  };
};

describe("Light.setShow", () => {
  it("sends the whole command once from a stable state and verifies the show", async () => {
    const s = lightStub({ state: P.ACTIVE, show: 2 });
    await s.light.setShow(8, s.fast);
    expect(s.shows()).toHaveLength(1);
    expect(Number(s.shows()[0]!.params.data)).toBe(8);
    // poolId, equipmentId, data, field19/1a/1b, and the 7-field timer block
    expect(valuesOf(s.sent.find((x) => x.opcode === 308)!.xml)).toHaveLength(
      13,
    );
    expect(s.show()).toBe(8);
    expect(s.light.show).toBe("FLAMINGO");
    expect(s.light.isOn).toBe(true);
  });

  it("keeps the current speed and brightness unless given, and refuses values the light has no code for", async () => {
    // 2x at 60%
    const s = lightStub({
      state: P.ACTIVE,
      show: 15,
      speed: 5,
      brightness: 2,
      omniDirect: true,
    });
    const fields = (i: number) => {
      const p = s.shows()[i]!.params;
      return [p.field19, p.field1a, p.field1b].map(Number);
    };

    await s.light.setShow(2, s.fast);
    expect(fields(0)).toEqual([5, 2, 0]);
    expect(s.light.speed).toBe("2x");
    expect(s.light.brightness).toBe(60);

    await s.light.setShow(0, { ...s.fast, speed: "16x", brightness: 20 });
    expect(fields(1)).toEqual([8, 0, 0]);

    await expect(s.light.setShow(0, { speed: "3x" })).rejects.toBeInstanceOf(
      OmniValidationError,
    );
    await expect(s.light.setShow(0, { brightness: 50 })).rejects.toBeInstanceOf(
      OmniValidationError,
    );
    expect(s.shows()).toHaveLength(2);
  });

  it("fails a brightness the light never applied, even on the show it already runs", async () => {
    const stub = lightStub({
      state: P.ACTIVE,
      show: 2,
      omniDirect: true,
      dropDimming: 2,
    });
    await stub.light.omni.refresh();
    await expect(
      stub.light.setShow(2, { brightness: 40, attempts: 2, ...stub.fast }),
    ).rejects.toBeInstanceOf(CommandFailedError);
    expect(stub.shows()).toHaveLength(2);
    expect(stub.light.brightness).toBe(100);

    await stub.light.setShow(2, { brightness: 40, ...stub.fast });
    expect(stub.light.brightness).toBe(40);
  });

  it("refuses a speed or brightness for a light outside OmniDirect before reading or sending, and falls back on a code outside the steps", async () => {
    const standalone = lightStub({ state: P.ACTIVE, speed: 5, brightness: 2 });
    await standalone.light.omni.refresh();
    const reads = standalone.refreshes;
    const sends = standalone.sent.length;
    await expect(standalone.light.setShow(2, { speed: "2x" })).rejects.toThrow(
      /not in OmniDirect mode/,
    );
    await expect(
      standalone.light.setShow(2, { brightness: 60 }),
    ).rejects.toBeInstanceOf(OmniValidationError);
    expect(standalone.refreshes).toBe(reads);
    expect(standalone.sent.length).toBe(sends);

    await standalone.light.setShow(2, standalone.fast);
    const sent = standalone.shows()[0]!.params;
    expect([sent.field19, sent.field1a].map(Number)).toEqual([0, 0]);

    const odd = lightStub({
      state: P.ACTIVE,
      brightness: 9,
      omniDirect: true,
      dropDimming: 1,
    });
    await odd.light.setShow(2, odd.fast);
    expect(odd.light.brightness).toBeUndefined();
    expect(Number(odd.shows()[0]!.params.field1a)).toBe(4);
  });

  it("waits for the light to settle before sending, or throws with wait off", async () => {
    const s = lightStub({
      state: P.CHANGING_SHOW,
      show: 2,
      settleTo: [P.CHANGING_SHOW, P.CHANGING_SHOW, P.ACTIVE],
    });
    await s.light.setShow(8, s.fast);
    expect(s.shows()).toHaveLength(1);
    expect(s.show()).toBe(8);
    expect(s.refreshes).toBeGreaterThanOrEqual(3);

    const cooling = lightStub({ state: P.COOLDOWN, show: 2 });
    await expect(
      cooling.light.setShow(8, { ...cooling.fast, wait: false }),
    ).rejects.toThrow(/transitioning/);
    expect(cooling.shows()).toHaveLength(0);
  });

  it("fails after one dropped send by default, resends only when asked", async () => {
    const once = lightStub({ state: P.ACTIVE, show: 2, drop: 1 });
    const error = await once.light
      .setShow(8, once.fast)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(CommandFailedError);
    expect((error as Error).message).toBe(
      'Unable to set "Pool Light" to show 8',
    );
    expect(once.shows()).toHaveLength(1);

    const twice = lightStub({ state: P.ACTIVE, show: 2, drop: 1 });
    await twice.light.setShow(8, { ...twice.fast, attempts: 2 });
    expect(twice.shows()).toHaveLength(2);
    expect(twice.show()).toBe(8);

    const never = lightStub({ state: P.ACTIVE, show: 2, drop: 5 });
    await expect(
      never.light.setShow(8, { ...never.fast, attempts: 2 }),
    ).rejects.toThrow(/Unable to set "Pool Light" to show 8/);
  });
});

describe("Light.on() and off()", () => {
  it("switch through SetUIEquipmentCmd after the light is stable", async () => {
    const s = lightStub({
      state: P.CHANGING_SHOW,
      settleTo: [P.CHANGING_SHOW, P.CHANGING_SHOW, P.ACTIVE],
    });
    await s.light.off(s.fast);
    expect(s.refreshes).toBeGreaterThanOrEqual(3);
    await s.light.on(s.fast);
    expect(s.power()).toEqual([0, 1]);
  });
});
