import { OmniLogic } from "@rygine/omnilogic-local-sdk";
import {
  callServerFn,
  makeRecorder,
  validateServerFn,
  valuesOf,
} from "@tests/server/support";
import { vi } from "vitest";

// every send goes through the SDK's real encoder
const { omni, sent, protocol } = makeRecorder();

// a real OmniLogic over the same recording transport, with a filter (3), a thermostat (heater 4), and its appliance (heater-equipment 5) on body 1
const heaterOmni = new OmniLogic({ host: "127.0.0.1", port: 10444, protocol });
heaterOmni.fetchTelemetry = () =>
  Promise.resolve({
    backyard: { configChksum: 0, state: 1 },
    heaters: [],
  } as never);
heaterOmni.fetchConfig = () =>
  Promise.resolve({
    backyard: {
      bodiesOfWater: [
        {
          systemId: 1,
          name: "Pool",
          type: "BOW_POOL",
          sensors: [],
          relays: [],
          pumps: [],
          colorLogicLights: [],
          filter: { systemId: 3, minPumpSpeed: 18, maxPumpSpeed: 100 },
          heater: {
            systemId: 4,
            name: "Heater",
            operations: [
              {
                heaterEquipment: {
                  systemId: 5,
                  heaterType: "HTR_GAS",
                  operations: [],
                },
              },
            ],
          },
        },
      ],
    },
  } as never);
await heaterOmni.refresh({ refetch: true });
const heaterDevice = heaterOmni.backyard.body(1)?.heater;

// the body requireDevice() resolves against: the filter by id, the real heater device above
const filterStub = { equipmentId: 3, name: "Filter Pump", isOn: false };
const bodyStub = {
  filter: filterStub,
  // the filter pump first, then two auxiliary pumps: one with a last speed, one without
  pumps: [
    filterStub,
    { equipmentId: 11, lastSpeed: 65 },
    { equipmentId: 12, lastSpeed: 0 },
  ],
  lights: [{ equipmentId: 8, name: "Lights" }],
  heater: heaterDevice,
};

// the setting store, empty
const { storeUpsert } = vi.hoisted(() => ({ storeUpsert: vi.fn() }));
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    storedSetting: {
      findUnique: () => Promise.resolve(null),
      upsert: (...args: unknown[]) => {
        storeUpsert(...args);
        return Promise.resolve(undefined);
      },
    },
  },
}));

const { idlePumps, settledLight, locked, cleared } = vi.hoisted(() => ({
  idlePumps: vi.fn(),
  settledLight: vi.fn(),
  locked: vi.fn(),
  cleared: vi.fn(),
}));
vi.mock("../transitions", () => ({
  controllerKey: (h: string, p: number) => `${h}:${p}`,
  requireIdlePumps: idlePumps,
  requireSettledLight: settledLight,
  lockPumps: locked,
  noteStart: vi.fn(),
  clearStart: cleared,
  primingSeconds: () => 120,
}));

vi.mock("../controller-cache", () => ({
  writeController: (
    _h: string,
    _p: number,
    fn: (o: unknown) => Promise<unknown>,
  ) =>
    fn({
      command: omni.command.bind(omni),
      backyard: { body: () => bodyStub },
    }),
}));

import {
  setEquipmentOn,
  setFilterSetting,
  setFilterSpeed,
  setHeaterSetting,
  setSpillover,
  startCountdown,
} from "./bow";

const base = { host: "h", port: 1, bowId: 1 };

const validate = (data: unknown) => validateServerFn(startCountdown, data);
const validateFilterSetting = (setting: string, value: number | boolean) =>
  validateServerFn(setFilterSetting, { ...base, setting, value });

beforeEach(() => {
  sent.length = 0;
  storeUpsert.mockClear();
  idlePumps.mockClear();
  settledLight.mockClear();
  locked.mockClear();
  cleared.mockClear();
});

describe("transitions", () => {
  it("a filter speed waits for idle pumps and, starting from stopped, locks them for its priming run", async () => {
    await callServerFn(setFilterSpeed, { ...base, speed: 75 });
    expect(idlePumps).toHaveBeenCalledWith("h:1", expect.anything());
    expect(locked).toHaveBeenCalledWith("h:1", 120);
  });

  it("a filter off waits for idle pumps, locks nothing, and ends a start", async () => {
    await callServerFn(setFilterSpeed, { ...base, speed: 0 });
    expect(idlePumps).toHaveBeenCalled();
    expect(locked).not.toHaveBeenCalled();
    expect(cleared).toHaveBeenCalledWith("h:1");
  });

  it("a refused guard sends nothing", async () => {
    idlePumps.mockImplementationOnce(() => {
      throw new Error("busy");
    });
    await expect(
      callServerFn(setFilterSpeed, { ...base, speed: 75 }),
    ).rejects.toThrow("busy");
    expect(sent).toHaveLength(0);
  });

  it("a light on waits for the light to settle; a relay waits for nothing", async () => {
    await callServerFn(setEquipmentOn, { ...base, equipmentId: 8, on: true });
    expect(settledLight).toHaveBeenCalled();
    expect(idlePumps).not.toHaveBeenCalled();
    settledLight.mockClear();
    await callServerFn(setEquipmentOn, { ...base, equipmentId: 9, on: true });
    expect(settledLight).not.toHaveBeenCalled();
    expect(idlePumps).not.toHaveBeenCalled();
  });
});

// a speed above 0 is the speed-only command: three parameters, no timer block, no config save
it("setFilterSpeed sends SetUIFilterSpeedCmd for a speed above 0", async () => {
  await callServerFn(setFilterSpeed, { ...base, speed: 75 });
  expect(sent).toHaveLength(1);
  expect(sent[0]!.opcode).toBe(9);
  // poolId, equipmentId, data
  expect(valuesOf(sent[0]!.xml)).toEqual(["1", "3", "75"]);
});

// the write takes no equipment id, the body's filter is the target
it("setFilterSpeed guards and sends the body's filter", async () => {
  await callServerFn(setFilterSpeed, { ...base, speed: 75 });
  expect(idlePumps).toHaveBeenCalledWith("h:1", expect.anything());
  expect(valuesOf(sent[0]!.xml)).toEqual(["1", "3", "75"]);
});

// off is SetUIEquipmentCmd with the full timer block, a 0 speed would leave the filter reporting On
it("setFilterSpeed sends SetUIEquipmentCmd isOn 0 for a speed of 0", async () => {
  await callServerFn(setFilterSpeed, { ...base, speed: 0 });
  expect(sent).toHaveLength(1);
  expect(sent[0]!.opcode).toBe(164);
  // poolId, equipmentId, isOn, isCountDownTimer, startTimeHours,
  // startTimeMinutes, endTimeHours, endTimeMinutes, daysActive, recurring
  expect(valuesOf(sent[0]!.xml)).toEqual([
    "1",
    "3",
    "0",
    "0",
    "0",
    "0",
    "0",
    "0",
    "0",
    "0",
  ]);
});

// spillover sends the speed, 0 for off, and a zero countdown block
describe("setSpillover", () => {
  it("sends SetUISpilloverCmd with the speed and a zero countdown block", async () => {
    await callServerFn(setSpillover, { ...base, on: true, speed: 58 });
    expect(sent).toHaveLength(1);
    expect(sent[0]!.opcode).toBe(311);
    // poolId, data, isCountDownTimer, startTimeHours, startTimeMinutes,
    // endTimeHours, endTimeMinutes, daysActive, recurring
    expect(valuesOf(sent[0]!.xml)).toEqual([
      "1",
      "58",
      "0",
      "0",
      "0",
      "0",
      "0",
      "0",
      "0",
    ]);
  });

  it("sends data 0 for off, whatever speed the control holds", async () => {
    await callServerFn(setSpillover, { ...base, on: false, speed: 80 });
    expect(valuesOf(sent[0]!.xml)[1]).toBe("0");
  });

  it("takes any speed, or none, with off", async () => {
    await expect(
      validateServerFn(setSpillover, { ...base, on: false, speed: 0 }),
    ).resolves.toBeUndefined();
    await expect(
      validateServerFn(setSpillover, { ...base, on: false }),
    ).resolves.toBeUndefined();
  });

  it("refuses a speed of 0 — off is `on: false`, not a zero speed", async () => {
    await expect(
      validateServerFn(setSpillover, { ...base, on: true, speed: 0 }),
    ).rejects.toThrow(/speed/i);
    await expect(
      validateServerFn(setSpillover, { ...base, on: true, speed: 58 }),
    ).resolves.toBeUndefined();
  });
});

// a countdown in the panel's own shape: flag set, start 0:00, end at the duration, every day, not recurring
describe("startCountdown", () => {
  it("sends SetUIEquipmentCmd with the countdown block for a relay", async () => {
    await callServerFn(startCountdown, {
      ...base,
      equipmentId: 9,
      target: "equipment",
      value: 1,
      hours: 1,
      minutes: 0,
    });
    expect(sent).toHaveLength(1);
    expect(sent[0]!.opcode).toBe(164);
    // poolId, equipmentId, isOn, isCountDownTimer, startTimeHours,
    // startTimeMinutes, endTimeHours, endTimeMinutes, daysActive, recurring
    expect(valuesOf(sent[0]!.xml)).toEqual([
      "1",
      "9",
      "1",
      "1",
      "0",
      "0",
      "1",
      "0",
      "127",
      "0",
    ]);
  });

  it("carries the filter's speed as isOn", async () => {
    await callServerFn(startCountdown, {
      ...base,
      equipmentId: 3,
      target: "equipment",
      value: 80,
      hours: 0,
      minutes: 30,
    });
    expect(valuesOf(sent[0]!.xml)).toEqual([
      "1",
      "3",
      "80",
      "1",
      "0",
      "0",
      "0",
      "30",
      "127",
      "0",
    ]);
  });

  it("sends SetUISpilloverCmd with the same block for spillover", async () => {
    await callServerFn(startCountdown, {
      ...base,
      equipmentId: 3,
      target: "spillover",
      value: 58,
      hours: 2,
      minutes: 15,
    });
    expect(sent[0]!.opcode).toBe(311);
    // poolId, data, isCountDownTimer, startTimeHours, startTimeMinutes,
    // endTimeHours, endTimeMinutes, daysActive, recurring
    expect(valuesOf(sent[0]!.xml)).toEqual([
      "1",
      "58",
      "1",
      "0",
      "0",
      "2",
      "15",
      "127",
      "0",
    ]);
  });

  it("bounds the duration to under a day and the value to 1–100", async () => {
    const ok = { ...base, equipmentId: 9, target: "equipment", value: 1 };
    await expect(
      validate({ ...ok, hours: 23, minutes: 59 }),
    ).resolves.toBeUndefined();
    await expect(validate({ ...ok, hours: 24, minutes: 0 })).rejects.toThrow(
      /hours/i,
    );
    await expect(validate({ ...ok, hours: 0, minutes: 60 })).rejects.toThrow(
      /minutes/i,
    );
    await expect(
      validate({ ...ok, value: 0, hours: 1, minutes: 0 }),
    ).rejects.toThrow(/value/i);
  });
});

it("setEquipmentOn sends SetUIEquipmentCmd with the full timer param set through the real encoder", async () => {
  await callServerFn(setEquipmentOn, { ...base, equipmentId: 9, on: true });
  expect(sent).toHaveLength(1);
  const values = valuesOf(sent[0]!.xml);
  expect(values).toEqual(["1", "9", "1", "0", "0", "0", "0", "0", "0", "0"]);
});

// an auxiliary pump's isOn value is its speed
describe("setEquipmentOn for an auxiliary pump", () => {
  const isOn = async (equipmentId: number, on: boolean) => {
    await callServerFn(setEquipmentOn, { ...base, equipmentId, on });
    return valuesOf(sent.at(-1)!.xml)[2];
  };

  it("turns on at its last speed, or 100 without one", async () => {
    expect(await isOn(11, true)).toBe("65");
    expect(await isOn(12, true)).toBe("100");
  });

  it("turns off with 0", async () => {
    expect(await isOn(11, false)).toBe("0");
  });
});

describe("setHeaterSetting", () => {
  it("refuses a setting outside the verified list", async () => {
    await expect(
      validateServerFn(setHeaterSetting, {
        ...base,
        setting: "heaterSetPoint",
        value: 90,
      }),
    ).rejects.toThrow(/setting/i);
  });

  it("refuses a non-integer number", async () => {
    await expect(
      validateServerFn(setHeaterSetting, {
        ...base,
        setting: "heaterLowSpeed",
        value: 60.5,
      }),
    ).rejects.toThrow(/value/i);
  });

  it("refuses a value of the wrong type for the setting", async () => {
    await expect(
      validateServerFn(setHeaterSetting, {
        ...base,
        setting: "heaterCooldown",
        value: 1,
      }),
    ).rejects.toThrow(/value/i);
    await expect(
      validateServerFn(setHeaterSetting, {
        ...base,
        setting: "heaterLowSpeed",
        value: true,
      }),
    ).rejects.toThrow(/value/i);
  });

  it("sends SetHeaterCoolDown to the thermostat for heaterCooldown", async () => {
    await callServerFn(setHeaterSetting, {
      ...base,
      setting: "heaterCooldown",
      value: true,
    });
    const frame = sent.at(-1)!;
    expect(frame.xml).toContain("SetHeaterCoolDown");
    expect(valuesOf(frame.xml)).toEqual(["1", "4", "1"]); // poolId, thermostat id, data
  });

  it("addresses the appliance for heaterLowSpeed", async () => {
    await callServerFn(setHeaterSetting, {
      ...base,
      setting: "heaterLowSpeed",
      value: 60,
    });
    expect(valuesOf(sent.at(-1)!.xml)).toEqual(["1", "5", "60"]);
    expect(storeUpsert).not.toHaveBeenCalled();
  });

  it("stores the auto-differential it wrote, under the body's key", async () => {
    await callServerFn(setHeaterSetting, {
      ...base,
      setting: "heaterAutoDifferential",
      value: 4,
    });
    expect(storeUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          host_port_key: {
            host: "h",
            port: 1,
            key: "heaterAutoDifferential:1",
          },
        },
        update: expect.objectContaining({ json: "4" }),
      }),
    );
  });
});

describe("setFilterSetting", () => {
  it("refuses a setting outside the verified list", async () => {
    await expect(
      validateFilterSetting("vspCustomPumpSpeed", 90),
    ).rejects.toThrow(/setting/i);
  });

  it("refuses a non-integer number", async () => {
    await expect(
      validateFilterSetting("primingDuration", 60.5),
    ).rejects.toThrow(/value/i);
  });

  it("refuses a value of the wrong type for the setting", async () => {
    await expect(validateFilterSetting("pumpMinSpeed", true)).rejects.toThrow(
      /value/i,
    );
    await expect(validateFilterSetting("flowMonitor", 1)).rejects.toThrow(
      /value/i,
    );
    await expect(
      validateFilterSetting("flowMonitor", false),
    ).resolves.toBeUndefined();
  });

  it("refuses a duration outside the app's bounds", async () => {
    // priming: whole minutes, 1–10
    await expect(validateFilterSetting("primingDuration", 90)).rejects.toThrow(
      /bounds/,
    );
    await expect(validateFilterSetting("primingDuration", 660)).rejects.toThrow(
      /bounds/,
    );
    await expect(
      validateFilterSetting("primingDuration", 180),
    ).resolves.toBeUndefined();
    // the others: 1 s to a day
    await expect(validateFilterSetting("cooldownDuration", 0)).rejects.toThrow(
      /bounds/,
    );
    await expect(
      validateFilterSetting("sharedFilterTimeout", 86401),
    ).rejects.toThrow(/bounds/);
    await expect(
      validateFilterSetting("freezeProtectOverrideInterval", 7200),
    ).resolves.toBeUndefined();
    // unbounded settings are untouched
    await expect(
      validateFilterSetting("freezeProtectTemp", 0),
    ).resolves.toBeUndefined();
  });
});
