import { notifications } from "@mantine/notifications";
import type { ScheduleType } from "@rygine/omnilogic-local-sdk";
import {
  useMutation,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";

import { UNREACHABLE } from "@/components/LoadError/LoadError";
import {
  getHeaterAutoDifferential,
  setChlorinatorEnable,
  setChlorinatorOutput,
  setEquipmentOn,
  setFilterSetting,
  setFilterSpeed,
  setHeaterEnable,
  setHeaterSetting,
  setHeaterTemperature,
  setLightShow,
  setSpillover,
  startCountdown,
  startSuperchlorinate,
  stopSuperchlorinate,
  type FilterSetting,
  type HeaterSetting,
} from "@/server/fns/bow";
import { addFavorite, removeFavorite } from "@/server/fns/favorites";
import {
  getPanelSettings,
  setPanelSetting,
  type PanelSetting,
  type PanelSettings,
} from "@/server/fns/panel";
import {
  createSchedule,
  deleteSchedule,
  editSchedule,
  setScheduleEnabled,
} from "@/server/fns/schedules";
import {
  getCoordinates,
  renameConfigObject,
  setCoordinates,
  type Coordinates,
} from "@/server/fns/system";
import { getWorld } from "@/server/fns/world";
import type {
  BowDetail,
  FilterDetail,
  HeaterDetail,
  WorldData,
  LightDetail,
} from "@/server/serializers";
import type { Stored } from "@/server/stored";
import { PRIMING_GRACE_MS } from "@/shared/priming";

import { scheduleCountdownTimers } from "./countdown-timers";
import { countdownQueryKey, queryKeys, refreshWorldFresh } from "./queries";
import { useSettings, type Connection } from "./settings";

// patches the cached world
const useUpdateWorld = () => {
  const qc = useQueryClient();
  const { host, port } = useSettings();
  return (updater: (world: WorldData) => WorldData) => {
    qc.setQueryData<WorldData>(queryKeys.world(host, port), (old) =>
      old ? updater(old) : old,
    );
  };
};

const patchBow = (
  world: WorldData,
  bowId: number,
  patch: (bow: BowDetail) => BowDetail,
): WorldData => {
  return {
    ...world,
    bows: world.bows.map((b) => (b.id === bowId ? patch(b) : b)),
  };
};

// a refusal for equipment between states in its own words, anything else as one line
const notifyError = (error: unknown): void => {
  const busy =
    error instanceof Error &&
    "code" in error &&
    error.code === "BUSY" &&
    error.message !== "";
  notifications.show({
    color: "red",
    message: busy ? error.message : UNREACHABLE,
  });
};

// when to re-read the world after a write, a valve or a light can take a minute to move
const SETTLE_MS = [2_000, 12_000, 30_000, 60_000];

const useSettleReads = () => {
  const qc = useQueryClient();
  const { host, port } = useSettings();
  return () => {
    const key = queryKeys.world(host, port);
    scheduleCountdownTimers(
      ["settle", ...key],
      SETTLE_MS.map((at) => ({
        at,
        run: () => void qc.invalidateQueries({ queryKey: key }),
      })),
    );
  };
};

// a write that patches the cached world on success
const useWorldWrite = <V>(
  write: (settings: Connection, vars: V) => Promise<void>,
  patch: (world: WorldData, vars: V) => WorldData,
) => {
  const settings = useSettings();
  const updateWorld = useUpdateWorld();
  const settle = useSettleReads();
  return useMutation({
    mutationFn: (vars: V) => write(settings, vars),
    onSuccess: (_, vars) => {
      updateWorld((world) => patch(world, vars));
      settle();
    },
    onError: notifyError,
  });
};

// a write after which the world is refetched
const useWorldRefetch = <V>(
  write: (settings: Connection, vars: V) => Promise<void>,
) => {
  const settings = useSettings();
  const qc = useQueryClient();
  const settle = useSettleReads();
  return useMutation({
    mutationFn: (vars: V) => write(settings, vars),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: queryKeys.world(settings.host, settings.port),
      });
      settle();
    },
    onError: notifyError,
  });
};

// a pump started from stopped is busy for its priming duration plus the grace
const startedFilter = (f: FilterDetail, on: boolean): FilterDetail =>
  on && !f.on
    ? {
        ...f,
        on: true,
        status: "Starting",
        busyForMs:
          f.settings.primingDuration > 0
            ? f.settings.primingDuration * 1000 + PRIMING_GRACE_MS
            : f.busyForMs,
      }
    : { ...f, on };

// a light refuses commands while it comes on or goes off
const switchedLight = (l: LightDetail, on: boolean): LightDetail =>
  on
    ? { ...l, on: true, state: "Warm-up", busy: "warming up" }
    : { ...l, on: false, state: "Powering off", busy: "powering off" };

export const useSetEquipmentOn = (bowId: number) =>
  useWorldWrite(
    (settings, vars: { equipmentId: number; on: boolean }) =>
      setEquipmentOn({ data: { ...settings, bowId, ...vars } }),
    (world, vars) =>
      patchBow(world, bowId, (bow) => {
        return {
          ...bow,
          filters: bow.filters.map((f) =>
            f.id === vars.equipmentId ? startedFilter(f, vars.on) : f,
          ),
          lights: bow.lights.map((l) =>
            l.id === vars.equipmentId ? switchedLight(l, vars.on) : l,
          ),
          // the world reports no speed for a pump that is off
          pumps: bow.pumps.map((p) =>
            p.id === vars.equipmentId
              ? { ...p, on: vars.on, speed: vars.on ? p.speed : null }
              : p,
          ),
          relays: bow.relays.map((r) =>
            r.id === vars.equipmentId ? { ...r, on: vars.on } : r,
          ),
        };
      }),
  );

export const useSetFilterSpeed = (bowId: number) =>
  useWorldWrite(
    (settings, vars: { equipmentId: number; speed: number }) =>
      setFilterSpeed({ data: { ...settings, bowId, speed: vars.speed } }),
    (world, vars) =>
      patchBow(world, bowId, (bow) => ({
        ...bow,
        filters: bow.filters.map((f) =>
          f.id === vars.equipmentId
            ? {
                ...startedFilter(f, vars.speed > 0),
                speed: vars.speed,
                // the last speed follows a non-zero speed at once
                lastSpeed: vars.speed > 0 ? vars.speed : f.lastSpeed,
              }
            : f,
        ),
      })),
  );

export const useSetHeaterTemperature = (bowId: number) =>
  useWorldWrite(
    (settings, vars: { equipmentId: number; temperature: number }) =>
      setHeaterTemperature({ data: { ...settings, bowId, ...vars } }),
    (world, vars) =>
      patchBow(world, bowId, (bow) => ({
        ...bow,
        heaters: bow.heaters.map((h) =>
          h.id === vars.equipmentId ? { ...h, setPoint: vars.temperature } : h,
        ),
      })),
  );

export const useSetHeaterEnable = (bowId: number) =>
  useWorldWrite(
    (settings, vars: { equipmentId: number; enabled: boolean }) =>
      setHeaterEnable({ data: { ...settings, bowId, ...vars } }),
    (world, vars) =>
      patchBow(world, bowId, (bow) => ({
        ...bow,
        heaters: bow.heaters.map((h) =>
          h.id === vars.equipmentId
            ? {
                ...h,
                enabled: vars.enabled,
                state: vars.enabled ? "idle" : "off",
              }
            : h,
        ),
      })),
  );

// auto-differential has no patch: it is its own query
const patchHeaterSetting = (
  h: HeaterDetail,
  setting: HeaterSetting,
  value: boolean | number,
): HeaterDetail => {
  switch (setting) {
    case "heaterMode":
      return { ...h, mode: Number(value) };
    case "heaterSilentMode":
      return { ...h, silentMode: Boolean(value) };
    case "heaterCooldown":
      return { ...h, cooldown: Boolean(value) };
    case "heaterExtend":
      return { ...h, extend: Boolean(value) };
    case "heaterAllowLowSpeed":
      return h.lowSpeed
        ? { ...h, lowSpeed: { ...h.lowSpeed, allow: Boolean(value) } }
        : h;
    case "heaterLowSpeed":
      return h.lowSpeed
        ? { ...h, lowSpeed: { ...h.lowSpeed, minSpeed: Number(value) } }
        : h;
    case "heaterAutoDifferential":
      return h;
    default:
      throw new Error(
        `patchHeaterSetting: unhandled setting ${String(setting)}`,
      );
  }
};

export const useSetHeaterSetting = (bowId: number) => {
  const settings = useSettings();
  const updateWorld = useUpdateWorld();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { setting: HeaterSetting; value: boolean | number }) =>
      setHeaterSetting({ data: { ...settings, bowId, ...vars } }),
    onSuccess: (_, vars) => {
      updateWorld((world) =>
        patchBow(world, bowId, (bow) => ({
          ...bow,
          heaters: bow.heaters.map((h) =>
            patchHeaterSetting(h, vars.setting, vars.value),
          ),
        })),
      );
      // the server stored the written value
      if (vars.setting === "heaterAutoDifferential") {
        void qc.invalidateQueries({
          queryKey: queryKeys.heaterDifferential(
            settings.host,
            settings.port,
            bowId,
          ),
        });
      }
    },
    onError: notifyError,
  });
};

// the pump's minimum and maximum speed also move its operating range
const patchFilterSetting = (
  f: FilterDetail,
  setting: FilterSetting,
  value: boolean | number,
): FilterDetail => {
  const typed =
    typeof f.settings[setting] === "boolean" ? Boolean(value) : Number(value);
  const patched = { ...f, settings: { ...f.settings, [setting]: typed } };
  if (setting === "pumpMinSpeed") {
    return { ...patched, speedRange: { ...f.speedRange, min: Number(value) } };
  }
  if (setting === "pumpMaxSpeed") {
    return { ...patched, speedRange: { ...f.speedRange, max: Number(value) } };
  }
  return patched;
};

// writes a setting on any body's filter
export const useSetFilterSettingOn = () =>
  useWorldWrite(
    (
      settings,
      vars: {
        bowId: number;
        filterId: number;
        setting: FilterSetting;
        value: boolean | number;
      },
    ) =>
      setFilterSetting({
        data: {
          ...settings,
          bowId: vars.bowId,
          setting: vars.setting,
          value: vars.value,
        },
      }),
    (world, vars) =>
      patchBow(world, vars.bowId, (bow) => ({
        ...bow,
        filters: bow.filters.map((f) =>
          f.id === vars.filterId
            ? patchFilterSetting(f, vars.setting, vars.value)
            : f,
        ),
      })),
  );

export const useSetLightShow = (bowId: number) =>
  useWorldWrite(
    (
      settings,
      vars: {
        equipmentId: number;
        show: number;
        speed?: string;
        brightness?: number;
      },
    ) => setLightShow({ data: { ...settings, bowId, ...vars } }),
    (world, vars) =>
      patchBow(world, bowId, (bow) => ({
        ...bow,
        lights: bow.lights.map((l) =>
          l.id === vars.equipmentId
            ? {
                ...l,
                show: l.shows.find((s) => s.value === vars.show)?.name ?? null,
                speed: vars.speed ?? l.speed,
                brightness: vars.brightness ?? l.brightness,
                // a show write leaves the light on and changing, and 0 is a show, not off
                on: true,
                state: "Changing show",
                busy: "changing show",
              }
            : l,
        ),
      })),
  );

// patches the body's spillover and its filter's speed, then re-reads the world
export const useSetSpillover = (bowId: number) => {
  const { host, port } = useSettings();
  const updateWorld = useUpdateWorld();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { on: boolean; speed: number }) =>
      setSpillover({ data: { host, port, bowId, ...vars } }),
    onSuccess: (_, vars) => {
      updateWorld((world) =>
        patchBow(world, bowId, (bow) =>
          bow.spillover
            ? {
                ...bow,
                // off keeps the last speed
                spillover: {
                  ...bow.spillover,
                  on: vars.on,
                  speed: vars.on ? vars.speed : bow.spillover.speed,
                },
                filters: bow.filters.map((f) =>
                  vars.on ? { ...f, on: true, speed: vars.speed } : f,
                ),
              }
            : bow,
        ),
      );
      void qc.invalidateQueries({ queryKey: queryKeys.world(host, port) });
    },
    onError: notifyError,
  });
};

export const useSetChlorinatorEnable = (bowId: number) =>
  useWorldWrite(
    (settings, vars: { enabled: boolean }) =>
      setChlorinatorEnable({ data: { ...settings, bowId, ...vars } }),
    (world, vars) =>
      patchBow(world, bowId, (bow) => ({
        ...bow,
        chlorinators: bow.chlorinators.map((c) => ({
          ...c,
          active: vars.enabled,
        })),
      })),
  );

export const useSetChlorinatorOutput = (bowId: number) =>
  useWorldWrite(
    (settings, vars: { percent: number }) =>
      setChlorinatorOutput({ data: { ...settings, bowId, ...vars } }),
    (world, vars) =>
      patchBow(world, bowId, (bow) => ({
        ...bow,
        chlorinators: bow.chlorinators.map((c) => ({
          ...c,
          outputPercent: vars.percent,
        })),
      })),
  );

// a body with one device under or out of a countdown, spillover marking its filter too
const patchCountdown = (
  bow: BowDetail,
  target: "equipment" | "spillover",
  equipmentId: number,
  running: boolean,
): BowDetail => {
  const mark = <T extends { id: number; on: boolean; countdown?: boolean }>(
    arr: T[],
  ): T[] =>
    arr.map((d) =>
      d.id === equipmentId ? { ...d, on: running, countdown: running } : d,
    );
  if (target === "spillover") {
    return {
      ...bow,
      spillover: bow.spillover
        ? { ...bow.spillover, on: running, countdown: running }
        : bow.spillover,
      filters: bow.filters.map((f) =>
        f.id === equipmentId ? { ...f, on: running } : f,
      ),
    };
  }
  return {
    ...bow,
    filters: mark(bow.filters),
    lights: bow.lights.map((l) =>
      l.id === equipmentId
        ? { ...l, on: running, state: running ? "On" : "Off" }
        : l,
    ),
    relays: mark(bow.relays),
  };
};

// seeds the cached world and the remaining time, then confirms from the controller
export const useStartCountdown = (bowId: number) => {
  const { host, port } = useSettings();
  const qc = useQueryClient();
  const updateWorld = useUpdateWorld();
  return useMutation({
    mutationFn: (vars: {
      equipmentId: number;
      target: "equipment" | "spillover";
      value: number;
      hours: number;
      minutes: number;
    }) => startCountdown({ data: { host, port, bowId, ...vars } }),
    onSuccess: (_, vars) => {
      const countdownKey = countdownQueryKey(
        host,
        port,
        bowId,
        vars.equipmentId,
      );
      const durationMs = (vars.hours * 60 + vars.minutes) * 60_000;

      updateWorld((world) =>
        patchBow(world, bowId, (bow) =>
          patchCountdown(bow, vars.target, vars.equipmentId, true),
        ),
      );
      qc.setQueryData(countdownKey, { seconds: durationMs / 1000 });

      const refresh = () => void refreshWorldFresh(qc, host, port);
      const reread = () => {
        refresh();
        void qc.invalidateQueries({ queryKey: countdownKey });
      };
      // the remaining time is re-read once the equipment has surely started
      scheduleCountdownTimers(countdownKey, [
        { at: 3_000, run: refresh },
        { at: 12_000, run: reread },
        {
          at: durationMs,
          run: () => {
            updateWorld((world) =>
              patchBow(world, bowId, (bow) =>
                patchCountdown(bow, vars.target, vars.equipmentId, false),
              ),
            );
            qc.setQueryData(countdownKey, { seconds: 0 });
          },
        },
        { at: durationMs + 2_000, run: reread },
        { at: durationMs + 8_000, run: refresh },
      ]);
    },
    onError: notifyError,
  });
};

export const useStartSuperchlorinate = (bowId: number) =>
  useWorldRefetch((settings, vars: { hours: number }) =>
    startSuperchlorinate({ data: { ...settings, bowId, ...vars } }),
  );

// the firmware also stops the filter pump
export const useStopSuperchlorinate = (bowId: number) =>
  useWorldRefetch((settings, _vars: void) =>
    stopSuperchlorinate({ data: { ...settings, bowId } }),
  );

// the controller assigns the id
export const useCreateSchedule = () =>
  useWorldRefetch(
    (
      settings,
      vars: {
        equipmentId: number;
        // the kind of schedule, unset for a plain equipment schedule
        type?: ScheduleType;
        data: number;
        startHour: number;
        startMinute: number;
        endHour: number;
        endMinute: number;
        daysActive: number;
        enabled: boolean;
        recurring: boolean;
      },
    ) => createSchedule({ data: { ...settings, ...vars } }),
  );

// SetUIScheduleEnableCmd, not a full edit
export const useSetScheduleEnabled = () =>
  useWorldWrite(
    (settings, vars: { scheduleId: number; enabled: boolean }) =>
      setScheduleEnabled({ data: { ...settings, ...vars } }),
    (world, vars) => ({
      ...world,
      schedules: world.schedules.map((s) =>
        s.id === vars.scheduleId ? { ...s, enabled: vars.enabled } : s,
      ),
    }),
  );

export const useEditSchedule = () =>
  useWorldWrite(
    (
      settings,
      vars: {
        scheduleId: number;
        startHour?: number;
        startMinute?: number;
        endHour?: number;
        endMinute?: number;
        daysActive?: number;
        enabled?: boolean;
        recurring?: boolean;
        data?: number;
      },
    ) => editSchedule({ data: { ...settings, ...vars } }),
    (world, vars) => ({
      ...world,
      schedules: world.schedules.map((s) =>
        s.id === vars.scheduleId
          ? {
              ...s,
              startHour: vars.startHour ?? s.startHour,
              startMinute: vars.startMinute ?? s.startMinute,
              endHour: vars.endHour ?? s.endHour,
              endMinute: vars.endMinute ?? s.endMinute,
              daysActive: vars.daysActive ?? s.daysActive,
              enabled: vars.enabled ?? s.enabled,
              recurring: vars.recurring ?? s.recurring,
              data: vars.data ?? s.data,
            }
          : s,
      ),
    }),
  );

// the controller assigns the ids
export const useAddFavorite = () =>
  useWorldRefetch((settings, vars: { equipmentId: number; data: number }) =>
    addFavorite({ data: { ...settings, ...vars } }),
  );

export const useRemoveFavorite = () =>
  useWorldRefetch((settings, vars: { indexId: number }) =>
    removeFavorite({ data: { ...settings, ...vars } }),
  );

export const useSetPanelSetting = () => {
  const { host, port } = useSettings();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { setting: PanelSetting; value: boolean | number }) =>
      setPanelSetting({ data: { host, port, ...vars } }),
    onSuccess: (_, vars) => {
      qc.setQueryData<Stored<PanelSettings>>(
        queryKeys.panel(host, port),
        (prev) =>
          prev === undefined
            ? prev
            : {
                ...prev,
                value: { ...prev.value, [vars.setting]: vars.value },
              },
      );
    },
    onError: notifyError,
  });
};

// stores what the controller reports after the write
export const useSetCoordinates = () => {
  const { host, port } = useSettings();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: Coordinates) =>
      setCoordinates({ data: { host, port, ...vars } }),
    onSuccess: (reported) => {
      qc.setQueryData<Stored<Coordinates>>(
        queryKeys.coordinates(host, port),
        reported,
      );
      notifications.show({ message: "Location saved", color: "green" });
    },
    onError: notifyError,
  });
};

// asks the controller for a stored setting again and puts the reply in the key
const useRefreshStored = <T>(key: QueryKey, read: () => Promise<Stored<T>>) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: read,
    onSuccess: (stored) => qc.setQueryData(key, stored),
    onError: notifyError,
  });
};

export const useRefreshCoordinates = () => {
  const { host, port } = useSettings();
  return useRefreshStored(queryKeys.coordinates(host, port), () =>
    getCoordinates({ data: { host, port, refresh: true } }),
  );
};

export const useRefreshPanelSettings = () => {
  const { host, port } = useSettings();
  return useRefreshStored(queryKeys.panel(host, port), () =>
    getPanelSettings({ data: { host, port, refresh: true } }),
  );
};

// re-reads the configuration and telemetry now, past the server's cache window
export const useRefreshWorld = () => {
  const { host, port } = useSettings();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => getWorld({ data: { host, port, fresh: true } }),
    onSuccess: (world) => qc.setQueryData(queryKeys.world(host, port), world),
    onError: notifyError,
  });
};

// the Heater section: the configuration and telemetry, then each body's stored differential
export const useRefreshHeaterSection = (bowIds: number[]) => {
  const { host, port } = useSettings();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const world = await getWorld({ data: { host, port, fresh: true } });
      const differentials: [number, Stored<number>][] = [];
      for (const bowId of bowIds) {
        differentials.push([
          bowId,
          await getHeaterAutoDifferential({
            data: { host, port, bowId, refresh: true },
          }),
        ]);
      }
      return { world, differentials };
    },
    onSuccess: ({ world, differentials }) => {
      qc.setQueryData(queryKeys.world(host, port), world);
      for (const [bowId, stored] of differentials) {
        qc.setQueryData(
          queryKeys.heaterDifferential(host, port, bowId),
          stored,
        );
      }
    },
    onError: notifyError,
  });
};

// a renamed body or device, applied everywhere the world carries the name
const patchName = <W extends { bows: BowDetail[] }>(
  world: W,
  equipmentId: number,
  name: string,
): W => {
  const rename = <T extends { id: number; name: string }>(arr: T[]): T[] =>
    arr.map((item) => (item.id === equipmentId ? { ...item, name } : item));
  return {
    ...world,
    bows: world.bows.map((bow) => ({
      ...(bow.id === equipmentId ? { ...bow, name } : bow),
      filters: rename(bow.filters),
      heaters: rename(bow.heaters),
      lights: rename(bow.lights),
      pumps: rename(bow.pumps),
      relays: rename(bow.relays),
    })),
  };
};

// renames in the world at once, then refetches for schedules and favorites
export const useRenameEquipment = () => {
  const { host, port } = useSettings();
  const updateWorld = useUpdateWorld();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { equipmentId: number; name: string }) =>
      renameConfigObject({ data: { host, port, ...vars } }),
    onSuccess: (_, vars) => {
      updateWorld((world) => patchName(world, vars.equipmentId, vars.name));
      void qc.invalidateQueries({ queryKey: queryKeys.world(host, port) });
    },
    onError: notifyError,
  });
};

export const useDeleteSchedule = () => {
  const settings = useSettings();
  const updateWorld = useUpdateWorld();
  return useMutation({
    mutationFn: (vars: { scheduleId: number }) =>
      deleteSchedule({ data: { ...settings, ...vars } }),
    onSuccess: (_, vars) =>
      updateWorld((world) => ({
        ...world,
        schedules: world.schedules.filter((s) => s.id !== vars.scheduleId),
      })),
    onError: notifyError,
  });
};
