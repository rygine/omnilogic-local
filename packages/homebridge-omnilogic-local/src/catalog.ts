import { colorForShow } from "@/colors";
import type { Exposable } from "@/discovery";
import { type Presets, startSpeed, type Range } from "@/helpers";

export type Options = Record<string, string | number | undefined>;

// choices with a group are listed under it
export type Choice = [value: string, text: string, group?: string];

export type Field = {
  key: string;
  label: string;
  // the turn-off timer is a checkbox and a minutes box, absent when unchecked
  control: "select" | "number" | "offTimer";
  value: "string" | "number";
  choices?: (eq: Exposable) => Choice[];
  range?: (eq: Exposable) => Range;
  default?: (eq: Exposable) => string | number | undefined;
  visible?: (eq: Exposable) => boolean;
  enabled?: (options: Options, eq: Exposable) => boolean;
  required?: true;
};

export type Service =
  | "Fan"
  | "Switch"
  | "Thermostat"
  | "Lightbulb"
  | "TemperatureSensor";

export type Definition = {
  label: string;
  fits: Exposable["kind"];
  offered?: (eq: Exposable) => boolean;
  service: Service;
  fields: Field[];
  note?: (eq: Exposable, o: Options) => string;
  // the name the form suggests, in place of the equipment's own
  defaultName?: (eq: Exposable, o: Options) => string;
  summary: (eq: Exposable, o: Options) => string;
};

const lower = (s: string) => s.toLowerCase();
const showName = (name: string) =>
  name
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
const minutes = (n: number) =>
  n % 60 === 0
    ? `${n / 60} hour${n === 60 ? "" : "s"}`
    : `${n} minute${n === 1 ? "" : "s"}`;
const offTail = (o: Options) =>
  typeof o.offAfter === "number"
    ? ` · turns off after ${minutes(o.offAfter)}`
    : "";

const OFF_TIMER: Field = {
  key: "offAfter",
  label: "Automatically turn off in",
  control: "offTimer",
  value: "number",
  range: () => ({ min: 5, max: 1439 }),
  default: () => 60,
};

const speedRange = (eq: Exposable) => ({
  min: eq.minSpeed ?? 0,
  max: eq.maxSpeed ?? 100,
});
const presetList = (p: Presets) =>
  new Intl.ListFormat("en-US", { type: "conjunction" }).format([
    `Low ${p.low}%`,
    ...(p.medium === undefined ? [] : [`Medium ${p.medium}%`]),
    `High ${p.high}%`,
  ]);
// the presets the slider snaps to, none when it moves to any percent
const sliderPresets = (eq: Exposable, o: Options) =>
  o.fanSpeed === "percent" ? undefined : eq.presets;
const onSpeedOf = (o: Options) =>
  typeof o.onSpeed === "string" ? o.onSpeed : undefined;
const isPreset = (w: string | undefined) =>
  w === "low" || w === "medium" || w === "high";
// the pump speed, in percent, when a switch turns it on
const onPercentOf = (eq: Exposable, o: Options) =>
  startSpeed(
    onSpeedOf(o),
    typeof o.onPercent === "number" ? o.onPercent : undefined,
    eq.presets,
  ) ?? (o.onSpeed === "custom" ? undefined : eq.lastSpeed);
const onSpeedWord = (eq: Exposable, o: Options) => {
  if (eq.speedType === "single") {
    return `its maximum speed, ${speedRange(eq).max}%`;
  }
  const percent = onPercentOf(eq, o);
  if (o.onSpeed === "custom") {
    return `${percent ?? "?"}%`;
  }
  const word = onSpeedOf(o);
  return `${isPreset(word) ? word : "the last speed"}${percent === undefined ? "" : `, ${percent}%`}`;
};
const onSpeedName = (eq: Exposable, o: Options) => {
  const word = onSpeedOf(o);
  return o.onSpeed === "custom"
    ? `${onPercentOf(eq, o) ?? ""}%`
    : isPreset(word)
      ? `${word[0]!.toUpperCase()}${word.slice(1)}`
      : "";
};
const fanSummary = (eq: Exposable, o: Options) => {
  const r = speedRange(eq);
  const p = sliderPresets(eq, o);
  return p === undefined
    ? `slider moves across ${r.min}% to ${r.max}%`
    : `slider snaps to ${presetList(p).toLowerCase()}`;
};
const fanNote = (eq: Exposable, o: Options) => {
  const r = speedRange(eq);
  const p = sliderPresets(eq, o);
  if (p === undefined) {
    return `The slider moves to any percent, held to the pump's minimum and maximum speed in the controller's configuration: ${r.min}% to ${r.max}%.`;
  }
  return eq.speedType === "dual"
    ? `This pump runs at two speeds, so the slider snaps to ${presetList(p)}.`
    : `The slider snaps to the presets in the controller's configuration: ${presetList(p)}.`;
};
const switchNote = (eq: Exposable) =>
  eq.speedType === "single"
    ? `This pump runs at one speed, so the switch turns it on at its maximum speed, ${speedRange(eq).max}%.`
    : "";

const FAN_SPEED: Field = {
  key: "fanSpeed",
  label: "Speed slider",
  control: "select",
  value: "string",
  choices: () => [
    ["presets", "Low, Medium, High"],
    ["percent", "Any percent"],
  ],
  default: () => "presets",
  visible: (eq) => eq.speedType === "variable",
};
const MEDIUM: Choice = ["medium", "Medium"];
const CUSTOM: Choice = ["custom", "Custom"];
const ON_SPEED: Field = {
  key: "onSpeed",
  label: "Speed when turned on",
  control: "select",
  value: "string",
  choices: (eq) => [
    ["last", "Last speed"],
    ["low", "Low"],
    ...(eq.presets?.medium === undefined ? [] : [MEDIUM]),
    ["high", "High"],
    ...(eq.speedType === "variable" ? [CUSTOM] : []),
  ],
  default: () => "last",
  visible: (eq) => eq.presets !== undefined,
};
const ON_PERCENT: Field = {
  key: "onPercent",
  label: "Percentage",
  control: "number",
  value: "number",
  range: speedRange,
  default: (eq) => eq.minSpeed ?? 0,
  enabled: (o) => o.onSpeed === "custom",
  visible: (eq) => eq.speedType === "variable",
  required: true,
};

const showOf = (eq: Exposable, o: Options) =>
  eq.shows?.find((s) => s.value === o.show)?.name;

const LIGHT_SHOW: Field = {
  key: "show",
  label: "Color",
  control: "select",
  value: "number",
  choices: (eq) =>
    (eq.shows ?? []).map((s) => [
      String(s.value),
      showName(s.name),
      colorForShow(s.name) === undefined ? "Light shows" : "Colors",
    ]),
  default: (eq) => eq.show ?? eq.shows?.[0]?.value,
  required: true,
};
const LIGHT_SPEED: Field = {
  key: "speed",
  label: "Speed",
  control: "select",
  value: "string",
  // no speed for a solid color
  enabled: (o, eq) => colorForShow(showOf(eq, o) ?? "") === undefined,
  choices: (eq) => [
    ["", "Current"],
    ...(eq.speeds ?? []).map((s): Choice => [s, s]),
  ],
  default: () => "",
  visible: (eq) => eq.omniDirect === true,
};

const withName = (eq: Exposable, tail: string) =>
  tail === "" ? eq.defaultName : `${eq.defaultName} ${tail}`;

const DEFINITIONS = {
  filterFan: {
    label: "Fan",
    fits: "filter",
    offered: (eq) => eq.speedType !== "single",
    service: "Fan",
    fields: [FAN_SPEED],
    note: fanNote,
    summary: (eq, o) => fanSummary(eq, o),
  },
  filterSwitch: {
    label: "Switch",
    fits: "filter",
    service: "Switch",
    fields: [ON_SPEED, ON_PERCENT],
    note: switchNote,
    defaultName: (eq, o) => withName(eq, onSpeedName(eq, o)),
    summary: (eq, o) => `turns on at ${onSpeedWord(eq, o)}`,
  },
  pumpSwitch: {
    label: "Switch",
    fits: "pump",
    service: "Switch",
    fields: [],
    summary: () => "on and off",
  },
  heaterThermostat: {
    label: "Thermostat",
    fits: "heater",
    service: "Thermostat",
    fields: [OFF_TIMER],
    note: (eq) =>
      [
        `The set point in the Home app is limited to this heater's range, ${eq.minSetPoint ?? 55}°F to ${eq.maxSetPoint ?? 104}°F.`,
        ...(eq.cooling
          ? [
              "This heat source can cool, so the thermostat also offers Cool and Auto. In Auto the current state shows Cool while the water is above the set point.",
            ]
          : []),
        "The timer starts when the heater is turned on from HomeKit.",
        "Changing the temperature or the mode, or turning it on again, does not restart it; the heater turning off, from anywhere, cancels it.",
      ].join("\n"),
    summary: (eq, o) =>
      `off, heat${eq.cooling ? ", cool, and auto" : ""}${offTail(o)}`,
  },
  heaterSwitch: {
    label: "Switch",
    fits: "heater",
    service: "Switch",
    fields: [
      {
        key: "setPoint",
        label: "Set point (°F)",
        control: "number",
        value: "number",
        range: (eq) => ({
          min: eq.minSetPoint ?? 55,
          max: eq.maxSetPoint ?? 104,
        }),
        default: (eq) => eq.setPoint ?? eq.minSetPoint ?? 55,
      },
      OFF_TIMER,
    ],
    note: () =>
      "The timer starts when the heater is turned on from HomeKit. Turning it on again does not restart it; the heater turning off, from anywhere, cancels it.",
    defaultName: (eq, o) =>
      withName(eq, typeof o.setPoint === "number" ? `${o.setPoint}°F` : ""),
    summary: (_eq, o) =>
      `turns on at ${typeof o.setPoint === "number" ? `${o.setPoint}°F` : "the current set point"}${offTail(o)}`,
  },
  chlorinatorFan: {
    label: "Fan",
    fits: "chlorinator",
    service: "Fan",
    fields: [],
    note: () => "The slider in the Home app sets the output percentage.",
    summary: () => "slider is the output percentage",
  },
  chlorinatorSwitch: {
    label: "Switch",
    fits: "chlorinator",
    service: "Switch",
    fields: [
      {
        key: "onPercent",
        label: "Output percentage",
        control: "number",
        value: "number",
        range: () => ({ min: 1, max: 100 }),
        default: (eq) => eq.output ?? 50,
      },
    ],
    defaultName: (eq, o) =>
      withName(eq, typeof o.onPercent === "number" ? `${o.onPercent}%` : ""),
    summary: (_eq, o) =>
      `turns on at ${typeof o.onPercent === "number" ? `${o.onPercent}%` : "the current output"}`,
  },
  spilloverFan: {
    label: "Fan",
    fits: "spillover",
    offered: (eq) => eq.speedType !== "single",
    service: "Fan",
    fields: [FAN_SPEED, OFF_TIMER],
    note: fanNote,
    summary: (eq, o) => `${fanSummary(eq, o)}${offTail(o)}`,
  },
  spilloverSwitch: {
    label: "Switch",
    fits: "spillover",
    service: "Switch",
    fields: [ON_SPEED, ON_PERCENT, OFF_TIMER],
    note: switchNote,
    defaultName: (eq, o) => withName(eq, onSpeedName(eq, o)),
    summary: (eq, o) => `turns on at ${onSpeedWord(eq, o)}${offTail(o)}`,
  },
  light: {
    label: "Light",
    fits: "light",
    service: "Lightbulb",
    fields: [OFF_TIMER],
    note: () =>
      "HomeKit's color picker snaps to the nearest solid color the light supports. Light shows are not available.",
    summary: (eq, o) =>
      `color picker${eq.omniDirect ? " and brightness" : ""}${offTail(o)}`,
  },
  lightSwitch: {
    label: "Switch",
    fits: "light",
    service: "Switch",
    fields: [
      LIGHT_SHOW,
      LIGHT_SPEED,
      {
        key: "brightness",
        label: "Brightness",
        control: "select",
        value: "number",
        choices: (eq) => [
          ["", "Current"],
          ...(eq.brightnesses ?? []).map((b): Choice => [String(b), `${b}%`]),
        ],
        default: () => "",
        visible: (eq) => eq.omniDirect === true,
      },
      OFF_TIMER,
    ],
    defaultName: (eq, o) => withName(eq, showName(showOf(eq, o) ?? "")),
    summary: (eq, o) => {
      const show = showOf(eq, o);
      const extras = [
        typeof o.speed === "string" && o.speed !== "" ? `${o.speed} speed` : "",
        typeof o.brightness === "number" ? `${o.brightness}% brightness` : "",
      ].filter(Boolean);
      return `${show === undefined ? "a show" : lower(showName(show))}${extras.length === 0 ? "" : `, ${extras.join(", ")}`}${offTail(o)}`;
    },
  },
  lightDimmer: {
    label: "Light (one color)",
    fits: "light",
    // only an OmniDirect light has brightness
    offered: (eq) => eq.omniDirect === true,
    service: "Lightbulb",
    fields: [LIGHT_SHOW, LIGHT_SPEED, OFF_TIMER],
    note: () =>
      "The light turns on to this color or show and the slider in the Home app sets its brightness.",
    defaultName: (eq, o) => withName(eq, showName(showOf(eq, o) ?? "")),
    summary: (eq, o) => {
      const show = showOf(eq, o);
      const speed =
        typeof o.speed === "string" && o.speed !== ""
          ? `, ${o.speed} speed`
          : "";
      return `${show === undefined ? "a show" : lower(showName(show))}${speed}, brightness slider${offTail(o)}`;
    },
  },
  relaySwitch: {
    label: "Switch",
    fits: "relay",
    service: "Switch",
    fields: [OFF_TIMER],
    summary: (_eq, o) => `on and off${offTail(o)}`,
  },
  themeSwitch: {
    label: "Switch",
    fits: "theme",
    service: "Switch",
    fields: [OFF_TIMER],
    defaultName: (eq) => `${eq.defaultName} Theme`,
    summary: (_eq, o) => `runs and stops the theme${offTail(o)}`,
  },
  waterTemp: {
    label: "Temperature sensor",
    fits: "waterTemp",
    service: "TemperatureSensor",
    fields: [],
    summary: () => "",
  },
  airTemp: {
    label: "Temperature sensor",
    fits: "airTemp",
    service: "TemperatureSensor",
    fields: [],
    summary: () => "",
  },
} satisfies Record<string, Definition>;

export type TypeKey = keyof typeof DEFINITIONS;
export const CATALOG: Record<TypeKey, Definition> = DEFINITIONS;

export const nameFor = (type: TypeKey, eq: Exposable, o: Options): string =>
  CATALOG[type].defaultName?.(eq, o) ?? eq.defaultName;

export const isTypeKey = (v: unknown): v is TypeKey =>
  typeof v === "string" && Object.hasOwn(CATALOG, v);

// the types that fit a piece of equipment, in catalog order
export const fitting = (eq: Exposable): TypeKey[] =>
  Object.keys(CATALOG)
    .filter(isTypeKey)
    .filter(
      (k) => CATALOG[k].fits === eq.kind && (CATALOG[k].offered?.(eq) ?? true),
    );
