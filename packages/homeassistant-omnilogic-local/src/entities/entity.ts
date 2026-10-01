import { OmniLogicError } from "@rygine/omnilogic-local-sdk";

import { slug } from "@/utils";

export type Platform =
  | "binary_sensor"
  | "button"
  | "climate"
  | "light"
  | "number"
  | "select"
  | "sensor"
  | "switch"
  | "valve";

type Topics = {
  state: string;
  command: (field?: string) => string;
  availability: { topic: string }[];
};

export type Entity = {
  platform: Platform;
  // unique on the device, and the entity's field in the device's state
  key: string;
  // shown after the device name, null for the device's main entity
  name: string | null;
  config?: Record<string, unknown>;
  // discovery fields that name topics
  topics?: (t: Topics) => Record<string, unknown>;
  value?: () => unknown;
  commandRead?: boolean;
  command?: (payload: string, field?: string) => Promise<unknown>;
};

// a Home Assistant action on one of the device's entities
export type Step = {
  key: string;
  action: string;
  data?: Record<string, number | string>;
};

export type ScheduleSteps = { start: Step[]; end: Step[] };

export type DeviceSpec = {
  // the equipment's system id, or "controller"
  id: string;
  name: string;
  model?: string;
  area?: string;
  entities: Entity[];
  schedule?: (data: number) => ScheduleSteps;
};

// the entity id Home Assistant gives an entity the bridge discovers
export const entityIdOf = (
  device: Pick<DeviceSpec, "name">,
  e: Pick<Entity, "platform" | "key" | "name">,
) => `${e.platform}.${slug(device.name)}${e.name === null ? "" : `_${e.key}`}`;

export const nameInArea = (area: string, name: string) =>
  name.toLowerCase().startsWith(area.toLowerCase()) ? name : `${area} ${name}`;

// a read, or undefined when the SDK has nothing to report
export const tryRead = <T>(read: () => T): T | undefined => {
  try {
    return read();
  } catch (error) {
    if (error instanceof OmniLogicError) {
      return undefined;
    }
    throw error;
  }
};

export const toNumber = (payload: string) => {
  const n = Number(payload);
  if (payload.trim() === "" || !Number.isFinite(n)) {
    throw new Error(`"${payload}" is not a number`);
  }
  return n;
};

export const toBoolean = (payload: string) => {
  if (payload === "ON") {
    return true;
  }
  if (payload === "OFF") {
    return false;
  }
  throw new Error(`"${payload}" is not ON or OFF`);
};

export const oneOf = <T extends string>(options: T[], payload: string) => {
  const found = options.find((o) => o === payload);
  if (found === undefined) {
    throw new Error(`"${payload}" is not one of ${options.join(", ")}`);
  }
  return found;
};

// a field of a command read's object
export const fieldTemplate = (key: string, field: string) =>
  `{{ value_json.${key}.${field} if value_json.${key} else None }}`;

export const temperature = {
  device_class: "temperature",
  unit_of_measurement: "°F",
  state_class: "measurement",
};

export const percent = { min: 0, max: 100, step: 1, unit_of_measurement: "%" };

export const setting = { entity_category: "config" };

export const diagnostic = { entity_category: "diagnostic" };

export const seconds = (max: number) => ({
  ...setting,
  mode: "box",
  min: 0,
  max,
  step: 1,
  unit_of_measurement: "s",
  device_class: "duration",
});

// an enumerated sensor over the SDK's labels and the fallbacks its getters return
export const enumOf = (labels: Record<number, string>, ...extra: string[]) => ({
  device_class: "enum",
  options: [...new Set([...Object.values(labels), ...extra, "Unknown"])],
});

// an entity Home Assistant shows as unavailable while it is not usable
export const availableWhile = (e: Entity, usable: () => boolean): Entity => ({
  ...e,
  value: () => ({ value: e.value?.(), usable: usable() }),
  topics: (t) => ({
    ...e.topics?.(t),
    value_template: `{{ value_json.${e.key}.value }}`,
    availability: [
      ...t.availability,
      {
        topic: t.state,
        value_template: `{{ 'online' if value_json.${e.key}.usable else 'offline' }}`,
      },
    ],
    availability_mode: "all",
  }),
});

export const switchSetting = (
  key: string,
  name: string,
  read: () => unknown,
  write: (on: boolean) => Promise<unknown>,
): Entity => ({
  platform: "switch",
  key,
  name,
  config: setting,
  value: read,
  command: async (payload) => write(toBoolean(payload)),
});

export const numberSetting = (
  key: string,
  name: string,
  config: Record<string, unknown>,
  read: () => unknown,
  write: (value: number) => Promise<unknown>,
): Entity => ({
  platform: "number",
  key,
  name,
  config: { ...setting, mode: "box", ...config },
  value: read,
  command: async (payload) => write(toNumber(payload)),
});
