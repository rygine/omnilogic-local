import {
  HEATER_MODE,
  LIGHT_BRIGHTNESS,
  LIGHT_SPEED,
  getAvailableShows,
  scheduleTypeOf,
  type LightShowInfo,
  type OmniLogic,
  type ScheduleType,
  type ThemeCommand,
} from "@rygine/omnilogic-local-sdk";

import { lightBusyWord } from "@/server/transitions";
import { sentenceCase } from "@/shared/sentence-case";
import {
  formatSpeed,
  presetOf,
  type Range,
  type SpeedPresets,
} from "@/shared/speed";
import { formatTemp } from "@/shared/temperature";

type BackyardSummary = {
  airTemp: number | null;
  // the controller's mode outside normal operation, such as "Config Mode", when all equipment is off
  systemState: string | null;
};

type Config = NonNullable<OmniLogic["config"]>;

// the appliance's own state, by its label
const HEATER_STATES: Record<string, HeaterState> = {
  Off: "idle",
  On: "heating",
  Pause: "paused",
};

const heaterState = (enabled: boolean, applianceState: string): HeaterState =>
  enabled ? (HEATER_STATES[applianceState] ?? "idle") : "off";

// the heater mode code the browser writes back, from the SDK's label
const heaterModeCode = (label: string): number =>
  Number(
    Object.entries(HEATER_MODE).find(([, name]) => name === label)?.[0] ?? 0,
  );

// a reading, or the fallback when the controller sent no row for the device
const readOr = <T>(read: () => T, fallback: T): T => {
  try {
    return read();
  } catch {
    return fallback;
  }
};

// whether the controller sent a telemetry row for the device
const reported = (state: () => unknown): boolean =>
  readOr(() => {
    state();
    return true;
  }, false);

// the first <Heater-Equipment> under a config <Heater>
const heaterAppliance = (
  heater: Config["backyard"]["bodiesOfWater"][number]["heater"] | undefined,
) =>
  (heater?.operations ?? [])
    .map((o) => o?.heaterEquipment)
    .find((e) => e !== undefined);

type FilterConfig = Config["backyard"]["bodiesOfWater"][number]["filter"];
// the speed ranges a filter and an auxiliary pump share
type PumpRanges = Pick<
  NonNullable<FilterConfig>,
  "minPumpSpeed" | "maxPumpSpeed" | "minPumpRpm" | "maxPumpRpm"
>;

// the pump's operating percent range, or the full 0–100 write domain without config
const filterSpeedRange = (config: PumpRanges | undefined): Range => {
  if (config && config.maxPumpSpeed > config.minPumpSpeed) {
    return { min: config.minPumpSpeed, max: config.maxPumpSpeed };
  }
  return { min: 0, max: 100 };
};

// the pump's rpm operating range, or null when the config lacks it
const filterRpmRange = (config: PumpRanges | undefined): Range | null => {
  if (config && config.maxPumpRpm > config.minPumpRpm) {
    return { min: config.minPumpRpm, max: config.maxPumpRpm };
  }
  return null;
};

// the vsp presets in percent, or null without config
const filterPresets = (
  config: FilterConfig | undefined,
): SpeedPresets | null =>
  config
    ? {
        low: config.vspLowPumpSpeed,
        medium: config.vspMediumPumpSpeed,
        high: config.vspHighPumpSpeed,
      }
    : null;

const filterSettings = (f: NonNullable<FilterConfig>): FilterSettings => ({
  pumpMinSpeed: f.minPumpSpeed,
  pumpMaxSpeed: f.maxPumpSpeed,
  primingDuration: f.primingDuration,
  freezeProtect: f.freezeProtectEnable,
  freezeProtectTemp: f.freezeProtectTemp,
  freezeProtectSpeed: f.freezeProtectSpeed,
  freezeProtectOverrideInterval: f.freezeProtectOverrideInterval,
  sharedFilterTimeout: f.sharedFilterTimeout,
  filterOffDuringValveChange: f.valveChangeOffEnable,
  flowMonitor: f.noWaterFlowTimeoutEnable,
  cooldownDuration: f.cooldownDuration,
});

// the body's config counterpart, by systemId
const configBodyFor = (
  config: Config,
  systemId: number,
): Config["backyard"]["bodiesOfWater"][number] | undefined => {
  return config.backyard.bodiesOfWater.find((b) => b.systemId === systemId);
};

const lightShowName = (
  light: { type: string; v2Active?: boolean } | undefined,
  currentShow: number | undefined,
): string | null => {
  if (currentShow === undefined) {
    return null;
  }
  return (
    getAvailableShows(light?.type ?? "", light?.v2Active === true).find(
      (s) => s.value === currentShow,
    )?.name ?? null
  );
};

// a light's power state in words
export type LightState =
  | "Off"
  | "Powering off"
  | "Changing show"
  | "Warm-up"
  | "On"
  | "Cooldown";

const LIGHT_STATE_LABEL: Record<string, LightState> = {
  OFF: "Off",
  POWERING_OFF: "Powering off",
  CHANGING_SHOW: "Changing show",
  FIFTEEN_SECONDS_WHITE: "Warm-up",
  ACTIVE: "On",
  COOLDOWN: "Cooldown",
};

// the filter settings the Settings page edits
export type FilterSettings = {
  pumpMinSpeed: number;
  pumpMaxSpeed: number;
  primingDuration: number;
  freezeProtect: boolean;
  freezeProtectTemp: number;
  freezeProtectSpeed: number;
  freezeProtectOverrideInterval: number;
  sharedFilterTimeout: number;
  filterOffDuringValveChange: boolean;
  flowMonitor: boolean;
  // edited in the Heater section
  cooldownDuration: number;
};

export type FilterDetail = {
  id: number;
  name: string;
  // running or priming
  on: boolean;
  // the controller's word for the filter state, such as On, Priming, or Cooldown
  status: string;
  // how long the pumps refuse commands from this read, null when they accept them
  busyForMs: number | null;
  // the speed in percent
  speed: number;
  // the speed a bare turn-on resumes, 0 when the controller has none
  lastSpeed: number;
  // running under a countdown
  countdown?: boolean;
  // the pump's operating range in percent, 0–100 without config
  speedRange: Range;
  // null when off or without an rpm range
  rpm: number | null;
  // the pump's operating range in rpm, null without config
  rpmRange: Range | null;
  // the vsp presets in percent, or null
  presets: SpeedPresets | null;
  settings: FilterSettings;
};

// off when heating is disabled, otherwise the appliance's own state
export type HeaterState = "off" | "idle" | "heating" | "paused";

export type HeaterDetail = {
  // the thermostat id every heater write addresses
  id: number;
  name: string;
  // the first appliance's heater type, such as HTR_GAS, HTR_HEAT_PUMP, or HTR_SOLAR
  type: string | undefined;
  enabled: boolean;
  setPoint: number;
  // the firmware clamps a set point outside this range silently
  setPointRange: Range;
  state: HeaterState;
  // 0 heat, 1 cool, 2 auto, ignored by a gas heater
  mode: number;
  silentMode: boolean;
  cooldown: boolean;
  extend: boolean;
  // the appliance's low-speed rules, absent without a heater appliance
  lowSpeed?: {
    allow: boolean;
    // the firmware rejects a speed outside the pump's operating range
    minSpeed: number;
    // the pump's operating range in percent
    speedRange: Range;
    // the vsp presets in percent, or null
    presets: SpeedPresets | null;
    // the pump's operating range in rpm, or null
    rpmRange: Range | null;
  };
};

export type LightDetail = {
  id: number;
  name: string;
  // lit or lighting up, off while powering off or cooling down
  on: boolean;
  state: LightState;
  // what the light is doing between off and on, in words, null once settled
  busy: string | null;
  show: string | null;
  shows: LightShowInfo[];
  // OmniDirect mode adds speed and brightness
  omniDirect: boolean;
  // "1/16x" to "16x", or null without OmniDirect or outside normal operation
  speed: string | null;
  // 20 to 100 percent, or null without OmniDirect or outside normal operation
  brightness: number | null;
  // every speed from slowest to fastest
  speeds: string[];
  // every brightness from dimmest to brightest, in percent
  brightnesses: number[];
};

export type ChlorinatorDetail = {
  id: number;
  // the chlorinator is enabled
  active: boolean;
  // producing chlorine now, on and off with the duty cycle
  generating: boolean;
  outputPercent: number;
  // trailing-average salt, ppm
  avgSalt: number;
  // latest instantaneous salt, ppm
  instantSalt: number;
  // a superchlorination run is active
  superchlorinating: boolean;
};

export type PumpDetail = {
  id: number;
  name: string;
  on: boolean;
  // the speed in percent, null when off
  speed: number | null;
  // the pump's operating range in percent, 0–100 without config
  speedRange: Range;
  // the pump's operating range in rpm, null without config
  rpmRange: Range | null;
};

export type RelayDetail = {
  id: number;
  name: string;
  on: boolean;
  // running under a countdown
  countdown?: boolean;
};

// the pool's filter sending water to the spa, addressed by the body id
export type SpilloverDetail = {
  on: boolean;
  // running under a countdown
  countdown?: boolean;
  // the filter's speed in percent
  speed: number;
  // the filter speed a turn-on resumes
  lastSpeed: number;
  speedRange: Range;
  rpmRange: Range | null;
  presets: SpeedPresets | null;
};

export type BowDetail = {
  id: number;
  name: string;
  waterTemp: number | null;
  filters: FilterDetail[];
  heaters: HeaterDetail[];
  lights: LightDetail[];
  chlorinators: ChlorinatorDetail[];
  pumps: PumpDetail[];
  relays: RelayDetail[];
  // only on a pool that shares its filter pump with a spa
  spillover?: SpilloverDetail;
};

export type ScheduleSummary = {
  id: number;
  equipmentId: number;
  // the id of the body the equipment belongs to
  bodyId: number;
  bodyName: string;
  equipmentName: string;
  // the kind of equipment, when resolved
  kind?:
    | "filter"
    | "chlorinator"
    | "light"
    | "heater"
    | "pump"
    | "relay"
    | "spillover"
    | "theme";
  // undefined for a schedule type the SDK does not name
  type: ScheduleType | undefined;
  // the action value: a filter percent, a chlorinator percent, a light show, 1 or 0, or a set point
  data: number;
  // the setting in words: a preset or speed, a percent, a show, a set point, or On
  value: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  daysActive: number;
  enabled: boolean;
  recurring: boolean;
};

const scheduleValue = (
  kind: ScheduleSummary["kind"],
  data: number,
  configBody: Config["backyard"]["bodiesOfWater"][number] | undefined,
  equipmentId?: number,
): string => {
  switch (kind) {
    case "filter":
    case "spillover":
      return (
        presetOf(data, filterPresets(configBody?.filter)) ??
        formatSpeed(data, filterRpmRange(configBody?.filter))
      );
    case "pump": {
      const pump = configBody?.pumps.find((p) => p.systemId === equipmentId);
      return formatSpeed(data, filterRpmRange(pump));
    }
    case "chlorinator":
      return `${data}%`;
    case "light": {
      const light = configBody?.colorLogicLights.find(
        (l) => l.systemId === equipmentId,
      );
      const show = lightShowName(light, data);
      return show === null ? `Show ${String(data)}` : sentenceCase(show);
    }
    case "heater":
      return formatTemp(data);
    case "relay":
      return "On";
    default:
      return String(data);
  }
};

const summarizeSchedules = (omni: OmniLogic): ScheduleSummary[] => {
  const schedules = omni.backyard.schedules
    .list()
    .map((s) => ({ ...s, type: scheduleTypeOf(s.event) }));
  // the theme list is only needed when a schedule runs one
  const themes = schedules.some((s) => s.type === "theme")
    ? omni.backyard.themes.list()
    : [];
  return schedules.map((s) => {
    // a theme's schedule carries the theme's id and belongs to no body
    if (s.type === "theme") {
      const theme = themes.find((g) => g.systemId === s.equipmentId);
      return {
        id: s.scheduleSystemId,
        equipmentId: s.equipmentId,
        bodyId: -1,
        bodyName: "Themes",
        equipmentName: theme?.name ?? `Theme ${String(s.equipmentId)}`,
        kind: "theme" as const,
        type: s.type,
        data: s.data,
        value: "Run",
        startHour: s.startHour,
        startMinute: s.startMinute,
        endHour: s.endHour,
        endMinute: s.endMinute,
        daysActive: s.daysActive,
        enabled: s.enabled !== 0,
        recurring: s.recurring !== 0,
      };
    }
    const resolved = scheduleTargetName(omni, s.equipmentId);
    // a spillover schedule is stored against the filter with the spillover type
    const isSpillover = s.type === "spillover" && resolved.kind === "filter";
    const kind = isSpillover ? "spillover" : resolved.kind;
    const { bodyId, bodyName, configBody } = resolved;
    return {
      id: s.scheduleSystemId,
      equipmentId: s.equipmentId,
      bodyId,
      bodyName,
      equipmentName: isSpillover ? "Spillover" : resolved.equipmentName,
      kind,
      type: s.type,
      data: s.data,
      value: scheduleValue(kind, s.data, configBody, s.equipmentId),
      startHour: s.startHour,
      startMinute: s.startMinute,
      endHour: s.endHour,
      endMinute: s.endMinute,
      daysActive: s.daysActive,
      enabled: s.enabled !== 0,
      recurring: s.recurring !== 0,
    };
  });
};

const scheduleTargetName = (
  omni: OmniLogic,
  equipmentId: number,
): {
  bodyId: number;
  bodyName: string;
  equipmentName: string;
  kind?: ScheduleSummary["kind"];
  configBody?: Config["backyard"]["bodiesOfWater"][number];
} => {
  const config = omni.config;
  for (const body of omni.backyard.bodies) {
    const devices: {
      device: { equipmentId: number; name: string } | undefined;
      label: string;
      kind: NonNullable<ScheduleSummary["kind"]>;
    }[] = [
      { device: body.filter, label: "Filter", kind: "filter" },
      { device: body.heater, label: "Heater", kind: "heater" },
      { device: body.chlorinator, label: "Chlorinator", kind: "chlorinator" },
      ...body.lights.map((device) => ({
        device,
        label: "Light",
        kind: "light" as const,
      })),
      ...body.relays.map((device) => ({
        device,
        label: "Relay",
        kind: "relay" as const,
      })),
      ...(configBodyFor(config, body.systemId)?.pumps ?? []).map((p) => ({
        device: { equipmentId: p.systemId, name: p.name },
        label: "Pump",
        kind: "pump" as const,
      })),
    ];
    for (const { device, label, kind } of devices) {
      if (device && device.equipmentId === equipmentId) {
        return {
          bodyId: body.systemId,
          bodyName: body.name,
          equipmentName: device.name || label,
          kind,
          configBody: configBodyFor(config, body.systemId),
        };
      }
    }
  }
  return {
    bodyId: -1,
    bodyName: "—",
    equipmentName: `Equipment ${equipmentId}`,
  };
};

export type FavoriteSummary = {
  // the display-slot id a removal needs, not the system id
  indexId: number;
  // the equipment or theme id
  equipmentId: number;
  // the action value, 0 for a plain bookmark
  data: number;
};

export type WorldData = {
  backyard: BackyardSummary;
  // full detail per body of water
  bows: BowDetail[];
  schedules: ScheduleSummary[];
  favorites: FavoriteSummary[];
};

export const serializeWorld = (
  omni: OmniLogic,
  pumpsBusyForMs: number | null = null,
  startingFilterId: number | null = null,
): WorldData => {
  const bows: BowDetail[] = [];
  for (const body of omni.backyard.bodies) {
    const detail = detailFor(
      omni,
      body.systemId,
      pumpsBusyForMs,
      startingFilterId,
    );
    if (detail) {
      bows.push(detail);
    }
  }
  return {
    backyard: {
      airTemp: omni.backyard.airTemp ?? null,
      systemState: omni.backyard.running ? null : omni.backyard.systemState,
    },
    bows,
    schedules: summarizeSchedules(omni),
    favorites: omni.backyard.favorites.list().map((f) => ({
      indexId: f.indexId,
      equipmentId: f.equipmentIdOrThemeId,
      data: f.data,
    })),
  };
};

export const detailFor = (
  omni: OmniLogic,
  bowId: number,
  pumpsBusyForMs: number | null = null,
  startingFilterId: number | null = null,
): BowDetail | null => {
  const body = omni.backyard.bodies.find((b) => b.systemId === bowId);
  if (!body) {
    return null;
  }

  const config = omni.config;
  const running = omni.backyard.running;
  const configBody = configBodyFor(config, body.systemId);

  const filter =
    body.filter && reported(() => body.filter?.state) ? body.filter : undefined;
  const filterConfig = configBody?.filter;
  // the controller reports the pump moving water
  const filterReported =
    filter !== undefined && (filter.speed > 0 || filter.isPriming);
  const filterStarting =
    !filterReported && filter?.equipmentId === startingFilterId;

  const heaterConfig = configBody?.heater;
  const appliance = heaterAppliance(heaterConfig);
  // a heater's and chlorinator's settings are not reported outside normal operation
  const heater =
    running && body.heater && reported(() => body.heater?.state)
      ? body.heater
      : undefined;
  const chlorinator =
    running && body.chlorinator && reported(() => body.chlorinator?.state)
      ? body.chlorinator
      : undefined;
  const lights = body.lights.filter((l) => l.state !== undefined);

  // both bodies share the pump, but spillover is the pool's feature
  const inventoryBody = omni.inventory.bodies.find(
    (b) => b.systemId === body.systemId,
  );
  const spillover: SpilloverDetail | undefined =
    inventoryBody !== undefined &&
    inventoryBody.spillover &&
    body.type === "BOW_POOL" &&
    filter &&
    filterConfig
      ? {
          on: body.spilloverOn,
          countdown: body.spilloverOnCountdown,
          speed: filter.speed,
          lastSpeed: filter.lastSpeed,
          speedRange: filterSpeedRange(filterConfig),
          rpmRange: filterRpmRange(filterConfig),
          presets: filterPresets(filterConfig),
        }
      : undefined;

  return {
    id: body.systemId,
    name: body.name,
    waterTemp: readOr(() => body.waterTemp, undefined) ?? null,
    filters:
      filter && filterConfig
        ? [
            {
              id: filter.equipmentId,
              name: filter.name,
              on: filterReported || filterStarting,
              // a pump started here reads as Starting until the controller has a word for it
              status: filterStarting ? "Starting" : filter.status,
              busyForMs: pumpsBusyForMs,
              speed: filter.speed,
              lastSpeed: filter.lastSpeed,
              countdown: filter.onCountdown,
              speedRange: filterSpeedRange(filterConfig),
              rpm: filterRpmRange(filterConfig) ? (filter.rpm ?? null) : null,
              rpmRange: filterRpmRange(filterConfig),
              presets: filterPresets(filterConfig),
              settings: filterSettings(filterConfig),
            },
          ]
        : [],
    heaters: heater
      ? [
          {
            id: heater.equipmentId,
            name: heater.name,
            type: appliance?.heaterType,
            enabled: heater.enabled,
            setPoint: heater.setPoint,
            setPointRange: {
              min: heaterConfig?.minSettableWaterTemp ?? 55,
              max: heaterConfig?.maxSettableWaterTemp ?? 104,
            },
            state: heaterState(heater.enabled, heater.applianceState),
            mode: heaterModeCode(heater.mode),
            silentMode: heater.silentMode,
            cooldown: heaterConfig?.cooldownEnabled === true,
            extend: heaterConfig?.extendEnabled === true,
            ...(appliance
              ? {
                  lowSpeed: {
                    allow: appliance.allowLowSpeedOperation,
                    minSpeed: appliance.minSpeedForOperation,
                    speedRange: filterSpeedRange(configBody?.filter),
                    presets: filterPresets(configBody?.filter),
                    rpmRange: filterRpmRange(configBody?.filter),
                  },
                }
              : {}),
          },
        ]
      : [],
    lights: lights.map((light) => {
      const show = running ? light.show : null;
      return {
        id: light.equipmentId,
        name: light.name,
        on: light.isOn,
        state: LIGHT_STATE_LABEL[light.powerState] ?? "On",
        busy: lightBusyWord(light.powerState),
        show: show === "Unknown" ? null : show,
        shows: light.shows,
        omniDirect: light.omniDirect,
        speed: light.omniDirect && running ? light.speed : null,
        brightness:
          light.omniDirect && running ? (light.brightness ?? null) : null,
        speeds: Object.values(LIGHT_SPEED),
        brightnesses: Object.values(LIGHT_BRIGHTNESS),
      };
    }),
    chlorinators: chlorinator
      ? [
          {
            id: chlorinator.equipmentId,
            active: chlorinator.enabled,
            generating: chlorinator.operatingState === "Generating",
            outputPercent: chlorinator.timedPercent,
            avgSalt: chlorinator.averageSalt,
            instantSalt: chlorinator.instantSalt,
            superchlorinating: chlorinator.isSuperchlorinating,
          },
        ]
      : [],
    // the body's auxiliary pumps, off outside normal operation
    pumps: (configBody?.pumps ?? []).flatMap((pump) => {
      const row = omni.telemetry.pumps.find(
        (r) => r.systemId === pump.systemId,
      );
      if (!row) {
        return [];
      }
      const on = running && row.pumpState !== 0;
      return [
        {
          id: pump.systemId,
          name: pump.name,
          on,
          speed: on && row.pumpSpeed !== 0 ? row.pumpSpeed : null,
          speedRange: filterSpeedRange(pump),
          rpmRange: filterRpmRange(pump),
        },
      ];
    }),
    relays: body.relays.flatMap((relay) =>
      reported(() => relay.state)
        ? [
            {
              id: relay.equipmentId,
              name: relay.name,
              on: relay.isOn,
              countdown: relay.onCountdown,
            },
          ]
        : [],
    ),
    ...(spillover ? { spillover } : {}),
  };
};

export type SystemInfo = {
  configChecksum: number | undefined;
  backyard: {
    name: string | undefined;
    airTemp: number | null;
  };
};

// read-only controller facts
export const serializeSystem = (omni: OmniLogic): SystemInfo => {
  const config = omni.config;
  return {
    configChecksum: omni.configChecksum,
    backyard: {
      name: config.backyard.name,
      airTemp: omni.backyard.airTemp ?? null,
    },
  };
};

// a device and its state in words, one row of the flat equipment listing
export type EquipmentRow = {
  body: string;
  kind: string;
  name: string;
  state: string;
};

export type ThemeSummary = {
  id: number;
  name: string;
  // the theme is running
  active: boolean;
  equipment: EquipmentRow[];
};

// a stored command's parameters by name
const paramsOf = (r: ThemeCommand): Record<string, number> =>
  Object.fromEntries(r.parameters.map((p) => [p.name, Number(p.value)]));

// the devices a theme sets and their settings, worded as a schedule's value
const themeEquipment = (
  omni: OmniLogic,
  commands: ThemeCommand[],
): EquipmentRow[] => {
  const rows: EquipmentRow[] = [];
  const heaterSetPoint = new Map<number, number>();
  const heaterEnabled = new Map<number, boolean>();
  for (const r of commands) {
    const p = paramsOf(r);
    if (r.name === "SetHeaterScheduleAltCmd") {
      heaterSetPoint.set(p.HeaterID ?? -1, p.Data1 ?? 0);
    } else if (r.name === "SetUITemporaryHeaterEnable") {
      heaterEnabled.set(p.HeaterID ?? -1, (p.Enabled ?? 0) !== 0);
    } else if (r.name === "TurnOnOffForGroup") {
      const target = scheduleTargetName(omni, p.EquipmentID ?? -1);
      const data = p.Data ?? 0;
      if (target.kind === undefined) {
        continue;
      }
      rows.push({
        body: target.bodyName,
        kind: target.kind,
        name: target.equipmentName,
        state:
          data === 0
            ? "Off"
            : scheduleValue(
                target.kind,
                // the low byte of a light's word is its show
                target.kind === "light" ? data & 0xff : data,
                target.configBody,
                p.EquipmentID,
              ),
      });
    }
  }
  // a heater's row comes from either of its two commands
  for (const id of new Set([
    ...heaterSetPoint.keys(),
    ...heaterEnabled.keys(),
  ])) {
    const target = scheduleTargetName(omni, id);
    if (target.kind !== "heater") {
      continue;
    }
    const setPoint = heaterSetPoint.get(id);
    rows.push({
      body: target.bodyName,
      kind: "heater",
      name: target.equipmentName,
      state: !(heaterEnabled.get(id) ?? false)
        ? "Off"
        : setPoint === undefined
          ? "On"
          : `On · ${formatTemp(setPoint)}`,
    });
  }
  return rows;
};

export const serializeThemes = (omni: OmniLogic): ThemeSummary[] => {
  const activeIds = new Set(omni.backyard.themes.activeIds);
  return omni.backyard.themes.list().map((g) => ({
    id: g.systemId,
    name: g.name,
    active: activeIds.has(g.systemId),
    equipment: themeEquipment(omni, g.commands),
  }));
};
