import {
  SCHEDULE_EVERY_DAY,
  timerParams,
  type Filter,
  type Heater,
  type OmniLogic,
} from "@rygine/omnilogic-local-sdk";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { withinBounds, type BoundedDuration } from "@/shared/duration-bounds";

import { readController, writeController } from "../controller-cache";
import { WebAppError } from "../errors";
import { requireBody, requireDevice, requireLight } from "../require";
import { readStoredSetting, storeSetting, type Stored } from "../stored";
import {
  clearStart,
  controllerKey,
  lockPumps,
  noteStart,
  primingSeconds,
  requireIdlePumps,
  requireSettledLight,
} from "../transitions";
import { withBowId, withEquipmentId, withRefresh } from "./_validators";

const setOn = withEquipmentId.extend({ on: z.boolean() });
const speed = z.number().int().min(0).max(100);
const setSpeed = withBowId.extend({ speed });
const setTemp = withEquipmentId.extend({ temperature: z.number().int() });
const setEnabled = withEquipmentId.extend({ enabled: z.boolean() });
const setLight = withEquipmentId.extend({
  show: z.number().int(),
  speed: z.string().optional(),
  brightness: z.number().int().optional(),
});
const setChlorEnabled = withBowId.extend({ enabled: z.boolean() });
const setChlorOutput = withBowId.extend({
  percent: z.number().int().min(0).max(100),
});
const startSuper = withBowId.extend({
  // whole hours
  hours: z.number().int().min(1).max(96),
});
// refuses a busy pump or light and returns what to record after the send
const guardEquipment = (
  omni: OmniLogic,
  key: string,
  bowId: number,
  equipmentId: number,
): ((on: boolean) => void) => {
  const body = requireBody(omni, bowId);
  if (body.filter?.equipmentId === equipmentId) {
    requireIdlePumps(key, omni);
    const wasStopped = !body.filter.isOn;
    const seconds = primingSeconds(omni, equipmentId);
    return (on) => {
      if (!on) {
        clearStart(key);
      } else if (wasStopped) {
        noteStart(key, equipmentId, seconds);
        if (seconds > 0) {
          lockPumps(key, seconds);
        }
      }
    };
  }
  const light = body.lights.find((l) => l.equipmentId === equipmentId);
  if (light !== undefined) {
    requireSettledLight(light);
  }
  return () => {};
};

export const setEquipmentOn = createServerFn({ method: "POST" })
  .validator(setOn)
  .handler(({ data }) =>
    writeController(
      data.host,
      data.port,
      async (omni) => {
        const key = controllerKey(data.host, data.port);
        const started = guardEquipment(omni, key, data.bowId, data.equipmentId);
        const body = requireBody(omni, data.bowId);
        // an auxiliary pump turns on at its last speed, or full
        const pump =
          body.filter?.equipmentId === data.equipmentId
            ? undefined
            : body.pumps.find((p) => p.equipmentId === data.equipmentId);
        await omni.command("SetUIEquipmentCmd", {
          poolId: data.bowId,
          equipmentId: data.equipmentId,
          isOn: !data.on ? 0 : pump ? pump.lastSpeed || 100 : 1,
          ...timerParams(),
        });
        started(data.on);
      },
      "setEquipmentOn",
    ),
  );

export const setFilterSpeed = createServerFn({ method: "POST" })
  .validator(setSpeed)
  .handler(({ data }) =>
    writeController(
      data.host,
      data.port,
      async (omni) => {
        const filter = requireDevice(omni, data.bowId, "filter");
        const key = controllerKey(data.host, data.port);
        const started = guardEquipment(
          omni,
          key,
          data.bowId,
          filter.equipmentId,
        );
        if (data.speed > 0) {
          await omni.command("SetUIFilterSpeedCmd", {
            poolId: data.bowId,
            equipmentId: filter.equipmentId,
            data: data.speed,
          });
          started(true);
          return;
        }
        // a 0 speed would leave the filter reporting On
        await omni.command("SetUIEquipmentCmd", {
          poolId: data.bowId,
          equipmentId: filter.equipmentId,
          isOn: 0,
          ...timerParams(),
        });
        started(false);
      },
      "setFilterSpeed",
    ),
  );

const startCountdownInput = withEquipmentId.extend({
  target: z.enum(["equipment", "spillover"]),
  // 1 for a relay or a light, the speed for a pump or spillover
  value: z.number().int().min(1).max(100),
  hours: z.number().int().min(0).max(23),
  minutes: z.number().int().min(0).max(59),
});

// a countdown in the panel's own shape, canceled by the ordinary off
export const startCountdown = createServerFn({ method: "POST" })
  .validator(startCountdownInput)
  .handler(({ data }) =>
    writeController(
      data.host,
      data.port,
      async (omni) => {
        if (data.hours === 0 && data.minutes === 0) {
          throw new WebAppError("ERROR", "a countdown needs a duration");
        }
        const key = controllerKey(data.host, data.port);
        const started = guardEquipment(omni, key, data.bowId, data.equipmentId);
        const timer = timerParams({
          isCountdownTimer: true,
          endTimeHours: data.hours,
          endTimeMinutes: data.minutes,
          daysActive: SCHEDULE_EVERY_DAY,
        });
        if (data.target === "spillover") {
          await omni.command("SetUISpilloverCmd", {
            poolId: data.bowId,
            data: data.value,
            ...timer,
          });
        } else {
          await omni.command("SetUIEquipmentCmd", {
            poolId: data.bowId,
            equipmentId: data.equipmentId,
            isOn: data.value,
            ...timer,
          });
        }
        started(true);
      },
      "startCountdown",
    ),
  );

// seconds left on a device's countdown, 0 when none
export const getCountdownRemaining = createServerFn({ method: "POST" })
  .validator(withEquipmentId)
  .handler(({ data }): Promise<{ seconds: number }> =>
    readController(
      data.host,
      data.port,
      async (omni) => {
        const r = await omni.command("GetRemainingCountdownTime", {
          poolId: data.bowId,
          equipmentId: data.equipmentId,
        });
        return { seconds: r.hour * 3600 + r.minute * 60 + r.second };
      },
      "getCountdownRemaining",
    ),
  );

// off ignores the speed
const setSpilloverInput = z.discriminatedUnion("on", [
  withBowId.extend({ on: z.literal(true), speed: speed.min(1) }),
  withBowId.extend({ on: z.literal(false), speed: speed.optional() }),
]);

// the speed turns spillover on and 0 turns it off
export const setSpillover = createServerFn({ method: "POST" })
  .validator(setSpilloverInput)
  .handler(({ data }) =>
    writeController(
      data.host,
      data.port,
      async (omni) => {
        const filter = requireDevice(omni, data.bowId, "filter");
        const key = controllerKey(data.host, data.port);
        const started = guardEquipment(
          omni,
          key,
          data.bowId,
          filter.equipmentId,
        );
        await omni.command("SetUISpilloverCmd", {
          poolId: data.bowId,
          data: data.on ? data.speed : 0,
          ...timerParams(),
        });
        started(data.on);
      },
      "setSpillover",
    ),
  );

// SetUIHeaterCmd on the body's thermostat
export const setHeaterTemperature = createServerFn({ method: "POST" })
  .validator(setTemp)
  .handler(({ data }) =>
    writeController(
      data.host,
      data.port,
      (omni) =>
        requireDevice(omni, data.bowId, "heater").setSetPoint(data.temperature),
      "setHeaterTemperature",
    ),
  );

// SetHeaterEnable on the body's thermostat
export const setHeaterEnable = createServerFn({ method: "POST" })
  .validator(setEnabled)
  .handler(({ data }) =>
    writeController(
      data.host,
      data.port,
      (omni) =>
        requireDevice(omni, data.bowId, "heater").setEnabled(data.enabled),
      "setHeaterEnable",
    ),
  );

// a device method that writes one setting
type Setter<T> = (device: T, value: number | boolean) => Promise<void>;

// one schema per setting, its value typed for that setting
const setting = <K extends string, V extends z.ZodType>(name: K, value: V) =>
  withBowId.extend({ setting: z.literal(name), value });
const int = z.number().int();
// any setting and value, checked by that setting's schema
type LooseSetting<S> = z.input<typeof withBowId> & {
  setting: S;
  value: boolean | number;
};
const duration = <K extends BoundedDuration>(name: K) =>
  setting(
    name,
    int.refine((v) => withinBounds(name, v), "duration out of bounds"),
  );

const heaterSetters = {
  heaterMode: (h, v) => h.setMode(Number(v)),
  heaterSilentMode: (h, v) => h.setSilentMode(Boolean(v)),
  heaterCooldown: (h, v) => h.setCooldown(Boolean(v)),
  heaterExtend: (h, v) => h.setExtend(Boolean(v)),
  heaterAutoDifferential: (h, v) => h.setAutoDifferential(Number(v)),
  heaterAllowLowSpeed: (h, v) => h.setAllowLowSpeed(Boolean(v)),
  heaterLowSpeed: (h, v) => h.setLowSpeed(Number(v)),
} satisfies Record<string, Setter<Heater>>;
export type HeaterSetting = keyof typeof heaterSetters;

const setSetting = z.discriminatedUnion(
  "setting",
  [
    setting("heaterMode", int),
    setting("heaterSilentMode", z.boolean()),
    setting("heaterCooldown", z.boolean()),
    setting("heaterExtend", z.boolean()),
    setting("heaterAutoDifferential", int),
    setting("heaterAllowLowSpeed", z.boolean()),
    setting("heaterLowSpeed", int),
  ],
  { error: "unknown setting" },
);

const differentialKey = (bowId: number) => `heaterAutoDifferential:${bowId}`;

// one write path for every heater setting, and the stored auto-differential follows the write
export const setHeaterSetting = createServerFn({ method: "POST" })
  .validator((d: LooseSetting<HeaterSetting>) => setSetting.parse(d))
  .handler(async ({ data }): Promise<void> => {
    await writeController(
      data.host,
      data.port,
      (omni) =>
        heaterSetters[data.setting](
          requireDevice(omni, data.bowId, "heater"),
          data.value,
        ),
      "setHeaterSetting",
    );
    if (data.setting === "heaterAutoDifferential") {
      await storeSetting(data, differentialKey(data.bowId), data.value);
    }
  });

// in the Settings page's order, without the vsp presets, priming enable, or minimum priming interval
const filterSetters = {
  pumpMinSpeed: (f, v) => f.setMinSpeed(Number(v)),
  pumpMaxSpeed: (f, v) => f.setMaxSpeed(Number(v)),
  primingDuration: (f, v) => f.setPrimingDuration(Number(v)),
  freezeProtect: (f, v) => f.setFreezeProtect(Boolean(v)),
  freezeProtectTemp: (f, v) => f.setFreezeProtectTemp(Number(v)),
  freezeProtectSpeed: (f, v) => f.setFreezeProtectSpeed(Number(v)),
  freezeProtectOverrideInterval: (f, v) =>
    f.setFreezeProtectOverrideInterval(Number(v)),
  sharedFilterTimeout: (f, v) => f.setSharedFilterTimeout(Number(v)),
  filterOffDuringValveChange: (f, v) => f.setOffDuringValveChange(Boolean(v)),
  flowMonitor: (f, v) => f.setFlowMonitor(Boolean(v)),
  cooldownDuration: (f, v) => f.setCooldownDuration(Number(v)),
} satisfies Record<string, Setter<Filter>>;
export type FilterSetting = keyof typeof filterSetters;

// the app bounds the four durations, the firmware accepts any value
const setFilterSettingInput = z.discriminatedUnion(
  "setting",
  [
    setting("pumpMinSpeed", int),
    setting("pumpMaxSpeed", int),
    duration("primingDuration"),
    setting("freezeProtect", z.boolean()),
    setting("freezeProtectTemp", int),
    setting("freezeProtectSpeed", int),
    duration("freezeProtectOverrideInterval"),
    duration("sharedFilterTimeout"),
    setting("filterOffDuringValveChange", z.boolean()),
    setting("flowMonitor", z.boolean()),
    duration("cooldownDuration"),
  ],
  { error: "unknown setting" },
);

// one write path for every filter setting
export const setFilterSetting = createServerFn({ method: "POST" })
  .validator((d: LooseSetting<FilterSetting>) => setFilterSettingInput.parse(d))
  .handler(({ data }) =>
    writeController(
      data.host,
      data.port,
      (omni) =>
        filterSetters[data.setting](
          requireDevice(omni, data.bowId, "filter"),
          data.value,
        ),
      "setFilterSetting",
    ),
  );

// stored once read, re-read on refresh
export const getHeaterAutoDifferential = createServerFn({ method: "POST" })
  .validator(withBowId.extend(withRefresh.shape))
  .handler(({ data }): Promise<Stored<number>> =>
    readStoredSetting(
      data,
      differentialKey(data.bowId),
      data.refresh === true,
      "getHeaterAutoDifferential",
      (omni) => requireDevice(omni, data.bowId, "heater").autoDifferential(),
    ),
  );

export const setLightShow = createServerFn({ method: "POST" })
  .validator(setLight)
  .handler(({ data }) =>
    writeController(
      data.host,
      data.port,
      (omni) => {
        const light = requireLight(omni, data.bowId, data.equipmentId);
        requireSettledLight(light);
        return light.setShow(data.show, {
          speed: data.speed,
          brightness: data.brightness,
        });
      },
      "setLightShow",
    ),
  );

export const setChlorinatorEnable = createServerFn({ method: "POST" })
  .validator(setChlorEnabled)
  .handler(({ data }) =>
    writeController(
      data.host,
      data.port,
      async (omni) => {
        await requireDevice(omni, data.bowId, "chlorinator").setEnabled(
          data.enabled,
        );
      },
      "setChlorinatorEnable",
    ),
  );

export const setChlorinatorOutput = createServerFn({ method: "POST" })
  .validator(setChlorOutput)
  .handler(({ data }) =>
    writeController(
      data.host,
      data.port,
      // the configured timed percent
      (omni) =>
        requireDevice(omni, data.bowId, "chlorinator").setTimedPercent(
          data.percent,
        ),
      "setChlorinatorOutput",
    ),
  );

// set the timeout (hours), then turn it on
export const startSuperchlorinate = createServerFn({ method: "POST" })
  .validator(startSuper)
  .handler(({ data }) =>
    writeController(
      data.host,
      data.port,
      async (omni) => {
        const chlorinator = requireDevice(omni, data.bowId, "chlorinator");
        // the run does not start without a non-zero timeout
        await chlorinator.setSuperchlorinateHours(data.hours);
        await chlorinator.superchlorinate();
      },
      "startSuperchlorinate",
    ),
  );

// the firmware also stops the filter pump
export const stopSuperchlorinate = createServerFn({ method: "POST" })
  .validator(withBowId)
  .handler(({ data }) =>
    writeController(
      data.host,
      data.port,
      (omni) =>
        requireDevice(omni, data.bowId, "chlorinator").superchlorinate(false),
      "stopSuperchlorinate",
    ),
  );

// minutes left on the active run
export const getSuperchlorinateRemaining = createServerFn({ method: "POST" })
  .validator(withBowId)
  .handler(({ data }) =>
    readController(
      data.host,
      data.port,
      async (omni) => ({
        minutes: await requireDevice(
          omni,
          data.bowId,
          "chlorinator",
        ).superchlorinateMinutesRemaining(),
      }),
      "getSuperchlorinateRemaining",
    ),
  );
