import Builder from "fast-xml-builder";
import { XMLParser } from "fast-xml-parser";

import type {
  Action,
  Backyard,
  BodyOfWater,
  Chlorinator,
  ChlorinatorEquipment,
  ColorLogicLight,
  CSAD,
  CSADEquipment,
  Device,
  Favorite,
  Filter,
  Heater,
  HeaterEquipment,
  MSPConfig,
  Operation,
  Pump,
  Relay,
  Schedule,
  Sensor,
  Theme,
  ThemeCommand,
} from "@/types/config";
import type * as telemetry from "@/types/telemetry";
import { OmniLogicError, OmniValidationError } from "@/utils/errors";
import { isRecord } from "@/utils/helpers";

// illegal XML 1.0 characters
const ILLEGAL =
  /[\0-\x08\x0B\f\x0E-\x1F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
const legal = (value: string) => {
  const hit = ILLEGAL.exec(value);
  if (hit !== null) {
    throw new OmniValidationError(
      `Invalid character in string: ${value} at index ${hit.index}`,
    );
  }
  return value;
};

const checked = (value: unknown) =>
  typeof value === "string" ? legal(value) : value;

const builder = new Builder({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  textNodeName: "_",
  suppressEmptyNode: true,
  tagValueProcessor: (_name, value) => checked(value),
  attributeValueProcessor: (_name, value) => checked(value),
});

type XMLBody = {
  Request: {
    "@xmlns": string;
    Name: string;
    Parameters?: {
      Parameter: {
        "@name": string;
        "@dataType": DataType;
        _: string;
      }[];
    };
  };
};

export type DataType = "int" | "bool" | "byte" | "float" | "string";

export type Parameter = {
  name: string;
  dataType: DataType;
  value: string;
};

export const buildMessageXml = (name: string, parameters?: Parameter[]) => {
  const body: XMLBody = {
    Request: { "@xmlns": "http://nextgen.hayward.com/api", Name: name },
  };
  if (parameters && parameters.length > 0) {
    body.Request.Parameters = {
      Parameter: parameters.map(({ name: n, dataType, value }) => ({
        "@name": n,
        "@dataType": dataType,
        _: value,
      })),
    };
  }
  return `<?xml version="1.0" encoding="UTF-8"?>${builder.build(body)}`;
};

const coerceText = (value: string) => {
  if (value === "yes") {
    return true;
  }
  if (value === "no") {
    return false;
  }
  const num = parseInt(value, 10);
  return !Number.isNaN(num) && num.toString() === value ? num : value;
};

const CONFIG_LISTS = new Set([
  "action",
  "bodyOfWater",
  "colorLogicLight",
  "component",
  "device",
  "favorite",
  "group",
  "operation",
  "parameter",
  "pump",
  "relay",
  "request",
  "sche",
  "sensor",
]);

const TELEMETRY_LISTS = new Set([
  "bodyOfWater",
  "chlorinator",
  "colorLogicLight",
  "csad",
  "filter",
  "group",
  "heater",
  "pump",
  "relay",
  "smartValveActuator",
  "valveActuator",
  "virtualHeater",
]);

const toCamelCase = (str: string) =>
  str
    .trim()
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .split(/[\s_-]+/)
    .map((word, index) => {
      const lower = word.toLowerCase();
      return index === 0
        ? lower
        : lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join("");

const parser = new XMLParser({
  ignoreAttributes: false,
  ignoreDeclaration: true,
  jPath: true,
  attributeNamePrefix: "",
  textNodeName: "_",
  parseTagValue: false,
  parseAttributeValue: false,
  transformTagName: toCamelCase,
  transformAttributeName: toCamelCase,
  tagValueProcessor: (tag, value, jPath) =>
    jPath === "response.parameters.parameter" ||
    tag === "name" ||
    tag === "deviceName"
      ? value
      : coerceText(value),
  attributeValueProcessor: (_attr, value) => coerceText(value),
  isArray: (tag, path, _leaf, isAttribute) =>
    !isAttribute &&
    (String(path).startsWith("status.")
      ? TELEMETRY_LISTS.has(tag)
      : CONFIG_LISTS.has(tag)),
});

export const parseXML = (xml: string) => parser.parse(xml);

type ResponseParameter = {
  _: string | number | boolean;
  name: string;
  dataType: DataType;
};

export type ResponseMessage = {
  response: {
    xmlns: string;
    name: string;
    parameters: {
      parameter: ResponseParameter[];
    };
  };
};

export const coerceParameterValue = (
  dataType: DataType,
  value: string | number | boolean,
) => {
  const text = String(value);
  switch (dataType) {
    case "int":
    case "byte": {
      const num = parseInt(text, 10);
      return isNaN(num) ? 0 : num;
    }
    case "float": {
      const num = parseFloat(text);
      return isNaN(num) ? 0 : num;
    }
    case "bool":
      return text === "1";
    default:
      return value;
  }
};

export const parametersByName = (parameters: ResponseParameter[]) => {
  return Object.fromEntries(
    parameters.map(({ _, dataType, name }) => {
      return [toCamelCase(name), coerceParameterValue(dataType, _)];
    }),
  );
};

type List<T> = T[] | undefined;

type RawEquipment<T extends { operations: Operation[] }> = Omit<
  T,
  "operations"
> & { operation: List<RawOperation> };

type RawOperation = {
  action: List<Action>;
  chlorinatorEquipment?: RawEquipment<ChlorinatorEquipment>;
  csadEquipment?: RawEquipment<CSADEquipment>;
  heaterEquipment?: RawEquipment<HeaterEquipment>;
};

type RawBodyOfWater = Omit<
  BodyOfWater,
  | "chlorinator"
  | "colorLogicLights"
  | "csad"
  | "filter"
  | "heater"
  | "pumps"
  | "relays"
  | "sensors"
> & {
  chlorinator?: RawEquipment<Chlorinator>;
  csad?: RawEquipment<CSAD>;
  colorLogicLight: List<RawEquipment<ColorLogicLight>>;
  filter?: RawEquipment<Filter>;
  heater?: RawEquipment<Heater>;
  pump: List<RawEquipment<Pump>>;
  relay: List<RawEquipment<Relay>>;
  sensor: List<RawEquipment<Sensor>>;
};

type RawParameter = Omit<ThemeCommand["parameters"][number], "value"> & {
  _: number | string;
};

type RawThemeCommand = Omit<ThemeCommand, "parameters"> & {
  parameters?: { parameter: List<RawParameter> } | string;
};

type RawTheme = Omit<Theme, "commands"> & { request: List<RawThemeCommand> };

type RawDevice = Omit<Device, "devices"> & {
  devices: { device: List<RawDevice> } | string;
};

type RawConfig = {
  mspConfig: Omit<
    MSPConfig,
    "backyard" | "devices" | "favorites" | "themes" | "schedules"
  > & {
    backyard: Omit<
      Backyard,
      "bodiesOfWater" | "colorLogicLights" | "relays" | "sensors"
    > & {
      bodyOfWater: List<RawBodyOfWater>;
      colorLogicLight: List<RawEquipment<ColorLogicLight>>;
      relay: List<RawEquipment<Relay>>;
      sensor: List<RawEquipment<Sensor>>;
    };
    dmt: { device: List<RawDevice> } | string;
    favorites: { favorite: List<Favorite> } | string;
    groups: { group: List<RawTheme> } | string;
    schedules: { sche: List<Schedule> } | string;
  };
};

const operations = (raw: List<RawOperation>): Operation[] =>
  (raw ?? []).map(
    ({ action, chlorinatorEquipment, csadEquipment, heaterEquipment }) => ({
      actions: action ?? [],
      ...(chlorinatorEquipment && {
        chlorinatorEquipment: withOperations(chlorinatorEquipment),
      }),
      ...(csadEquipment && {
        csadEquipment: withOperations(csadEquipment),
      }),
      ...(heaterEquipment && {
        heaterEquipment: withOperations(heaterEquipment),
      }),
    }),
  );

const withOperations = <T extends { operations: Operation[] }>({
  operation,
  ...rest
}: RawEquipment<T>) => ({ ...rest, operations: operations(operation) });

const devices = (raw: List<RawDevice>): Device[] =>
  (raw ?? []).map(({ devices: children, ...rest }) => ({
    ...rest,
    devices: devices(isRecord(children) ? children.device : undefined),
  }));

const bodyOfWater = ({
  chlorinator,
  colorLogicLight,
  csad,
  filter,
  heater,
  pump,
  relay,
  sensor,
  ...rest
}: RawBodyOfWater) => ({
  ...rest,
  ...(chlorinator && { chlorinator: withOperations(chlorinator) }),
  colorLogicLights: (colorLogicLight ?? []).map(withOperations),
  ...(csad && { csad: withOperations(csad) }),
  ...(filter && { filter: withOperations(filter) }),
  ...(heater && { heater: withOperations(heater) }),
  pumps: (pump ?? []).map(withOperations),
  relays: (relay ?? []).map(withOperations),
  sensors: (sensor ?? []).map(withOperations),
});

const section = <T>(
  wrapper: { [k: string]: List<T> } | string | undefined,
  tag: string,
) => (isRecord(wrapper) ? (wrapper[tag] ?? []) : []);

const theme = ({ request, ...rest }: RawTheme) => ({
  ...rest,
  commands: (request ?? []).map(({ parameters, ...command }) => ({
    ...command,
    parameters: section(parameters, "parameter").map(({ _, ...parameter }) => ({
      ...parameter,
      value: _,
    })),
  })),
});

export const parseConfig = (xml: string) => {
  const raw: RawConfig = parseXML(xml);
  if (!isRecord(raw.mspConfig)) {
    throw new OmniLogicError("Malformed reply: no <MSPConfig> element");
  }
  const {
    backyard: {
      bodyOfWater: bodies,
      colorLogicLight,
      relay,
      sensor,
      ...backyard
    },
    dmt,
    favorites,
    groups,
    schedules,
    ...rest
  } = raw.mspConfig;
  return {
    ...rest,
    backyard: {
      ...backyard,
      bodiesOfWater: (bodies ?? []).map(bodyOfWater),
      colorLogicLights: (colorLogicLight ?? []).map(withOperations),
      relays: (relay ?? []).map(withOperations),
      sensors: (sensor ?? []).map(withOperations),
    },
    devices: devices(section(dmt, "device")),
    favorites: section(favorites, "favorite"),
    themes: section(groups, "group").map(theme),
    schedules: section(schedules, "sche"),
  };
};

type RawTelemetry = {
  version: string;
  backyard: telemetry.Backyard;
  bodyOfWater: List<telemetry.BodyOfWater>;
  chlorinator: List<telemetry.Chlorinator>;
  colorLogicLight: List<telemetry.ColorLogicLight>;
  csad: List<telemetry.CSAD>;
  filter: List<telemetry.Filter>;
  group: List<telemetry.Theme>;
  heater: List<telemetry.Heater>;
  pump: List<telemetry.Pump>;
  relay: List<telemetry.Relay>;
  smartValveActuator: List<telemetry.SmartValveActuator>;
  valveActuator: List<telemetry.ValveActuator>;
  virtualHeater: List<telemetry.VirtualHeater>;
};

export const parseTelemetry = (xml: string) => {
  const raw: { status: RawTelemetry } = parseXML(xml);
  const t = raw.status;
  if (!isRecord(t)) {
    throw new OmniLogicError("Malformed reply: no <STATUS> element");
  }
  return {
    version: t.version,
    backyard: t.backyard,
    bodiesOfWater: t.bodyOfWater ?? [],
    chlorinators: t.chlorinator ?? [],
    colorLogicLights: t.colorLogicLight ?? [],
    csads: t.csad ?? [],
    filters: t.filter ?? [],
    themes: t.group ?? [],
    heaters: t.heater ?? [],
    pumps: t.pump ?? [],
    relays: t.relay ?? [],
    smartValveActuators: t.smartValveActuator ?? [],
    valveActuators: t.valveActuator ?? [],
    virtualHeaters: t.virtualHeater ?? [],
  };
};

type RawComponent = { parameter?: ResponseParameter[] };
type RawSysInfo = {
  sysInfo?: { parameter?: ResponseParameter[]; component?: RawComponent[] };
};

export const parseSysInfo = (xml: string) => {
  const raw: RawSysInfo = parseXML(xml);
  const root = raw.sysInfo;
  if (!isRecord(root)) {
    throw new OmniLogicError("Malformed reply: no <SysInfo> element");
  }
  const top = parametersByName(root.parameter ?? []);
  const components = (root.component ?? []).map((c) => {
    const p = parametersByName(c.parameter ?? []);
    return {
      devName: String(p.devName ?? ""),
      type: String(p.type ?? ""),
      hua: String(p.hua ?? ""),
      version: String(p.version ?? ""),
      nodeId: Number(p.nodeId),
      systemId: Number(p.systemId),
      upgradeCapable: p.upgradeCapable === 1,
    };
  });
  return { numComponents: Number(top.numComponents), components };
};
