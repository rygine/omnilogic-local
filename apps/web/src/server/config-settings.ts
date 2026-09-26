import type { OmniLogic } from "@rygine/omnilogic-local-sdk";

import { formatTemp } from "@/shared/temperature";

export type SettingRow = { label: string; value: string };
export type SettingsGroup = { title: string; rows: SettingRow[] };
export type ControllerSettings = { groups: SettingsGroup[] };

type Config = NonNullable<OmniLogic["config"]>;
type Body = Config["backyard"]["bodiesOfWater"][number];

// constants with a name of their own
const HUMAN: Record<string, string> = {
  // shown under a "Pump type" label
  FMT_VARIABLE_SPEED_PUMP: "Variable Speed",
  FMT_SINGLE_SPEED_PUMP: "Single Speed",
  FMT_DUAL_SPEED_PUMP: "Dual Speed",
  CHLOR_OP_MODE_TIMED: "Timed",
  CHLOR_OP_MODE_ORP: "ORP",
  CHLOR_TYPE_MAIN_PANEL: "Main panel",
  SALT_DISPENSING: "Salt",
  HTR_GAS: "Gas",
  HTR_HEAT_PUMP: "Heat pump",
  HTR_SOLAR: "Solar",
  RLY_BLOWER: "Blower",
  RLY_VALVE_ACTUATOR: "Valve actuator",
  RLY_HIGH_VOLTAGE_RELAY: "High-voltage relay",
  RLY_LOW_VOLTAGE_RELAY: "Low-voltage relay",
  BOW_POOL: "Pool",
  BOW_SPA: "Spa",
  CELL_TYPE_T3: "T-CELL-3",
  CELL_TYPE_T5: "T-CELL-5",
  CELL_TYPE_T9: "T-CELL-9",
  CELL_TYPE_T15: "T-CELL-15",
  CELL_TYPE_TCELLS340: "TCELLS340",
  CELL_TYPE_TCELLS325: "TCELLS325",
  CELL_TYPE_TCELLS315: "TCELLS315",
};

const KNOWN_PREFIX =
  /^(FMT_|CHLOR_OP_MODE_|CHLOR_TYPE_|CELL_TYPE_|HTR_|RLY_|BOW_|ACT_FNC_|SENSOR_|UNITS_)/;

// "on" → "On", undefined for an empty string
const capitalize = (s: string | undefined): string | undefined =>
  s === undefined || s === ""
    ? undefined
    : s.charAt(0).toUpperCase() + s.slice(1);

// strip a known prefix, then sentence-case the rest
const prettify = (s: string): string =>
  capitalize(
    s.replace(KNOWN_PREFIX, "").replace(/_/g, " ").trim().toLowerCase(),
  ) ?? "";

const str = (s: string | undefined): string | undefined =>
  s === undefined || s === "" ? undefined : s;

export const humanize = (s: string | undefined): string | undefined => {
  const v = str(s);
  return v === undefined ? undefined : (HUMAN[v] ?? prettify(v));
};

// the formatters return undefined for a missing field

const onOff = (b: boolean | undefined): string | undefined =>
  b === undefined ? undefined : b ? "On" : "Off";

const percent = (n: number | undefined): string | undefined =>
  n === undefined ? undefined : `${n}%`;

const temp = (n: number | undefined): string | undefined =>
  n === undefined ? undefined : formatTemp(n);

// "35 sec", "30 min", "2 hr 5 min"
const duration = (secs: number | undefined): string | undefined => {
  if (secs === undefined) {
    return undefined;
  }
  if (secs < 60) {
    return `${secs} sec`;
  }
  if (secs < 3600) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return s ? `${m} min ${s} sec` : `${m} min`;
  }
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return m ? `${h} hr ${m} min` : `${h} hr`;
};

const range = (
  a: string | undefined,
  b: string | undefined,
): string | undefined =>
  a === undefined || b === undefined ? undefined : `${a} – ${b}`;

// the controller keeps the offset in minutes
const utcOffset = (tz: number | undefined): string | undefined => {
  if (tz === undefined) {
    return undefined;
  }
  const h = Math.trunc(Math.abs(tz) / 60);
  const m = Math.abs(tz) % 60;
  const sign = tz < 0 ? "-" : "+";
  return `UTC${sign}${h}${m ? `:${String(m).padStart(2, "0")}` : ""}`;
};

// the temperature scale for each units setting
const UNITS_LABEL: Record<string, string> = {
  Standard: "Fahrenheit",
  Metric: "Celsius",
};

// label/value entries as rows, dropping undefined values
const toRows = (entries: [string, string | undefined][]): SettingRow[] =>
  entries
    .filter((e): e is [string, string] => e[1] !== undefined)
    .map(([label, value]) => ({ label, value }));

const group = (
  title: string,
  entries: [string, string | undefined][],
): SettingsGroup => ({ title, rows: toRows(entries) });

// one body's rows for a piece of equipment
type BodyRows = { bodyName: string; rows: SettingRow[] };

// fields every body shares go in one table titled by the equipment, the rest per body
const splitShared = (
  equipment: string,
  perBody: BodyRows[],
): SettingsGroup[] => {
  if (perBody.length === 0) {
    return [];
  }
  if (perBody.length === 1) {
    const only = perBody[0]!;
    return [{ title: `${only.bodyName} · ${equipment}`, rows: only.rows }];
  }
  // every label any body has, in first-appearance order
  const labels = [
    ...new Set(perBody.flatMap((b) => b.rows.map((r) => r.label))),
  ];
  const shared: SettingRow[] = [];
  const diffs = new Map<string, SettingRow[]>(
    perBody.map((b) => [b.bodyName, []]),
  );
  for (const label of labels) {
    const values = perBody.map(
      (b) => b.rows.find((r) => r.label === label)?.value,
    );
    if (values.every((v) => v !== undefined && v === values[0])) {
      shared.push({ label, value: values[0]! });
    } else {
      for (const b of perBody) {
        const v = b.rows.find((r) => r.label === label)?.value;
        if (v !== undefined) {
          diffs.get(b.bodyName)!.push({ label, value: v });
        }
      }
    }
  }
  const groups: SettingsGroup[] = [];
  if (shared.length) {
    groups.push({ title: equipment, rows: shared });
  }
  for (const b of perBody) {
    const rows = diffs.get(b.bodyName)!;
    if (rows.length) {
      groups.push({ title: `${b.bodyName} · ${equipment}`, rows });
    }
  }
  return groups;
};

const systemGroup = (config: Config): SettingsGroup => {
  const s = config.system;
  return group("System", [
    [
      "Temperature units",
      s?.units ? (UNITS_LABEL[s.units] ?? s.units) : undefined,
    ],
    ["Time zone", utcOffset(s?.timeZone)],
    ["Daylight saving", onOff(s?.dst)],
    ["Internet time", capitalize(s?.internetTime)],
    ["Time format", str(s?.mspTimeFormat)],
    ["Language", str(s?.mspLanguage)],
    ["Service mode timeout", duration(config.backyard?.serviceModeTimeout)],
  ]);
};

const filterRows = (f: NonNullable<Body["filter"]>): SettingRow[] =>
  // only what the Settings page cannot edit
  toRows([
    ["Pump type", humanize(f.filterType)],
    ["Priming", onOff(f.primingEnabled)],
    ["Min priming interval", duration(f.minPrimingInterval)],
    ["No-flow timeout", duration(f.noWaterFlowTimeoutTimeout)],
    ["Valve-change off duration", duration(f.valveChangeOffDuration)],
    ["Shutdown request timeout", duration(f.shutdownRequestTimeout)],
    [
      "RPM range",
      f.minPumpRpm === undefined || f.maxPumpRpm === undefined
        ? undefined
        : `${f.minPumpRpm} – ${f.maxPumpRpm} RPM`,
    ],
    ["Low speed", percent(f.vspLowPumpSpeed)],
    ["Medium speed", percent(f.vspMediumPumpSpeed)],
    ["High speed", percent(f.vspHighPumpSpeed)],
    // written by the firmware whenever a non-preset speed is sent
    ["Last custom speed", percent(f.vspCustomPumpSpeed)],
  ]);

const heaterRows = (h: NonNullable<Body["heater"]>): SettingRow[] =>
  toRows([
    ["Current setpoint", temp(h.currentSetPoint)],
    [
      "Settable range",
      range(temp(h.minSettableWaterTemp), temp(h.maxSettableWaterTemp)),
    ],
    ["Max water temp", temp(h.maxWaterTemp)],
    ["Boost interval", duration(h.boostTimeInterval)],
  ]);

const chlorinatorRows = (c: NonNullable<Body["chlorinator"]>): SettingRow[] =>
  toRows([
    ["Cell type", humanize(c.cellType)],
    ["Dispenser", humanize(c.dispenserType)],
    ["Mode", humanize(c.mode)],
    ["Timed output", percent(c.timedPercent)],
    ["ORP timeout", duration(c.orpTimeout)],
    ["Superchlorinate timeout", duration(c.superChlorTimeout)],
  ]);

// a relay's group, named for what it drives
const relayGroup = (
  bodyName: string,
  r: Body["relays"][number],
): SettingsGroup =>
  group(`${bodyName} · ${humanize(r.function) ?? "Relay"}`, [
    ["Freeze protection", r.freezeProtectEnable ? "On" : undefined],
    ["Valve cycle", r.valveCycleEnable ? "On" : undefined],
    [
      "Valve cycle time",
      r.valveCycleEnable ? duration(r.valveCycleTime) : undefined,
    ],
  ]);

// every config setting the Settings page does not edit, grouped for display
export const serializeSettings = (omni: OmniLogic): ControllerSettings => {
  const config = omni.config;
  const bodies = config.backyard.bodiesOfWater;

  const perBody = <T>(
    pick: (b: Body) => T | undefined,
    build: (device: T) => SettingRow[],
  ): BodyRows[] =>
    bodies.flatMap((b) => {
      const device = pick(b);
      return device ? [{ bodyName: b.name, rows: build(device) }] : [];
    });

  const groups: SettingsGroup[] = [systemGroup(config)];
  groups.push(
    ...splitShared(
      "Filter",
      perBody(
        (b) => b.filter,
        (f) => filterRows(f),
      ),
    ),
    ...splitShared(
      "Heater",
      perBody((b) => b.heater, heaterRows),
    ),
    ...splitShared(
      "Chlorinator",
      perBody((b) => b.chlorinator, chlorinatorRows),
    ),
  );
  // relays stay per body
  for (const body of bodies) {
    for (const relay of body.relays) {
      groups.push(relayGroup(body.name, relay));
    }
  }
  return { groups: groups.filter((g) => g.rows.length > 0) };
};
