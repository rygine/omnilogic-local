import { CATALOG, isTypeKey, type Options, type TypeKey } from "@/catalog";
import type { Exposable } from "@/discovery";
import { isRecord, stringOf } from "@/helpers";

export type Accessory = {
  id: string;
  type: TypeKey;
  equipment: number;
  name: string;
} & Options;

export type ControllerConfig = {
  host: string;
  port: number;
  pollInterval: number;
  accessories: Accessory[];
};

// an IPv4 address or a host name
export const validHost = (value: string) =>
  /^\d{1,3}(\.\d{1,3}){3}$/.test(value)
    ? value.split(".").every((octet) => Number(octet) <= 255)
    : /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i.test(
        value,
      );

const shown = (v: unknown) => JSON.stringify(v) ?? String(v);

// one accessory entry, or what is wrong with it
export const accessoryOf = (raw: unknown): Accessory | string => {
  if (!isRecord(raw)) {
    return "not an accessory entry";
  }
  const { id, type, equipment, name } = raw;
  if (typeof id !== "string" || id === "") {
    return "it has no id";
  }
  if (!isTypeKey(type)) {
    return `type ${shown(type)} is not one the plugin knows`;
  }
  if (typeof equipment !== "number" || !Number.isInteger(equipment)) {
    return `equipment ${shown(equipment)} is not an equipment id`;
  }
  if (typeof name !== "string" || name.trim() === "") {
    return "it has no name";
  }
  const entry: Accessory = { id, type, equipment, name };
  for (const [key, v] of Object.entries(raw)) {
    if (key in entry) {
      continue;
    }
    const field = CATALOG[type].fields.find((f) => f.key === key);
    if (field === undefined) {
      return `${key} is not a setting of a ${type}`;
    }
    if (field.value === "string" && typeof v === "string") {
      entry[key] = v;
    } else if (
      field.value === "number" &&
      typeof v === "number" &&
      Number.isInteger(v)
    ) {
      entry[key] = v;
    } else {
      return `${key} ${shown(v)} is not ${field.value === "string" ? "text" : "a whole number"}`;
    }
  }
  return entry;
};

// the equipment an entry attaches to
export const equipmentFor = (
  a: Accessory,
  found: Exposable[],
): Exposable | undefined =>
  found.find((f) => f.id === a.equipment && f.kind === CATALOG[a.type].fits);

// what is wrong with an entry, checked against the equipment the controller reports
export const fitProblem = (
  a: Accessory,
  found: Exposable[],
): string | undefined => {
  const def = CATALOG[a.type];
  const eq = equipmentFor(a, found);
  if (eq === undefined) {
    return `${def.fits} ${a.equipment} is not on the controller`;
  }
  if (def.offered?.(eq) === false) {
    return `this ${def.fits} cannot be a ${a.type}`;
  }
  for (const f of def.fields) {
    const v = a[f.key];
    const applies = f.visible?.(eq) !== false && f.enabled?.(a, eq) !== false;
    if (v === undefined) {
      if (applies && f.required === true) {
        return `${f.key} is missing`;
      }
      continue;
    }
    if (!applies) {
      // a default saved before the field stopped applying
      if (v === f.default?.(eq)) {
        continue;
      }
      return `${f.key} does not apply to this ${def.fits}`;
    }
    if (f.choices !== undefined) {
      const allowed = f.choices(eq).map(([value]) => value);
      if (v === "" || !allowed.includes(String(v))) {
        return `${f.key} ${shown(v)} is not one of ${allowed.filter((c) => c !== "").join(", ")}`;
      }
      continue;
    }
    const r = f.range?.(eq);
    if (r !== undefined && (Number(v) < r.min || Number(v) > r.max)) {
      return `${f.key} ${v} is outside ${r.min} to ${r.max}`;
    }
  }
  return undefined;
};

const wholeIn = (v: unknown, min: number, max: number) =>
  Number.isInteger(v) && Number(v) >= min && Number(v) <= max;

// one controller block with its defaults filled, or what is wrong with it
export const controllerConfig = (
  raw: unknown,
  warn: (message: string) => void,
): ControllerConfig | string => {
  const r = isRecord(raw) ? raw : {};
  if (typeof r.host !== "string" || !validHost(r.host)) {
    return `host ${shown(r.host)} is not an IPv4 address or a host name`;
  }
  if (r.port !== undefined && !wholeIn(r.port, 1, 65535)) {
    return `port ${shown(r.port)} is outside 1 to 65535`;
  }
  // seconds
  if (r.pollInterval !== undefined && !wholeIn(r.pollInterval, 30, 86400)) {
    return `pollInterval ${shown(r.pollInterval)} is outside 30 to 86400`;
  }
  const accessories: Accessory[] = [];
  for (const entry of Array.isArray(r.accessories) ? r.accessories : []) {
    const a = accessoryOf(entry);
    if (typeof a === "string") {
      const e = isRecord(entry) ? entry : {};
      const name = typeof e.name === "string" ? e.name.trim() : "";
      warn(dropped(name || (stringOf(e.id) ?? "an accessory"), a));
    } else {
      accessories.push(a);
    }
  }
  return {
    host: r.host,
    port: typeof r.port === "number" ? r.port : 10444,
    pollInterval: typeof r.pollInterval === "number" ? r.pollInterval : 300,
    accessories,
  };
};

export const dropped = (label: string, why: string) =>
  `${label}: dropped, ${why}; re-add it on the settings page`;
