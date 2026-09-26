import type { BodyOfWater, MSPConfig } from "@/types/config";
import { OmniLogicError } from "@/utils/errors";
import { isRecord, numberOf, stringOf } from "@/utils/helpers";

type Slot<T = object> =
  | ({ installed: true; systemId: number } & T)
  | { installed: false };

type CellSlot = Slot<{
  cellType: string | undefined;
  feeder: boolean;
}>;

type HeaterUnitSlot = Slot<{ heaterType: string | undefined }>;

type BodyInventory = {
  systemId: number;
  // a pool and spa sharing one filter pump
  spillover: boolean;
  csad: Slot;
  filter: Slot<{ vsp: boolean }>;
  heater: Slot<{
    heaterType: string | undefined;
    gas: boolean;
    unit: HeaterUnitSlot;
  }>;
  chlorinator: Slot<{
    cell: CellSlot;
  }>;
  light: Slot<{ networked: boolean }>;
  blower: Slot;
};

export type Inventory = {
  bodies: BodyInventory[];
};

export const INVENTORY_PATHS = [
  "filter",
  "filter.vsp",
  "heater",
  "heater.gas",
  "heater.unit",
  "chlorinator",
  "chlorinator.cell",
  "chlorinator.feeder",
  "csad",
  "light",
  "light.networked",
  "blower",
  "spillover",
] as const;

export type InventoryPath = (typeof INVENTORY_PATHS)[number];

const unreachablePath = (path: never) => {
  throw new OmniLogicError(`Unhandled inventory path ${String(path)}`);
};

const SINGLE_SPEED_FILTER_TYPES: Set<string> = new Set([
  "FMT_SINGLE_SPEED",
  "FMT_DUAL_SPEED",
]);

const OTHER_HEATER_TYPES: Set<string> = new Set([
  "HTR_HEAT_PUMP",
  "HTR_SOLAR",
  "HTR_ELECTRIC",
  "HTR_GEOTHERMAL",
  "HTR_CHILLER",
  "HTR_SMART_HEAT_PUMP",
  "HTR_SMART_VSHP",
]);

export const hasSystemId = <T>(node: T): node is T & { systemId: number } =>
  isRecord(node) && numberOf(node.systemId) !== undefined;

// false only for a type known to lack the feature, any other type is not refused
const hasFeature = (type: string | undefined, lacking: Set<string>) =>
  type === undefined || !lacking.has(type);

const filterOf = (bow: BodyOfWater): BodyInventory["filter"] => {
  const filter = bow.filter;
  if (!hasSystemId(filter)) {
    return { installed: false };
  }
  return {
    installed: true,
    systemId: filter.systemId,
    vsp: hasFeature(stringOf(filter.filterType), SINGLE_SPEED_FILTER_TYPES),
  };
};

const heaterOf = (bow: BodyOfWater): BodyInventory["heater"] => {
  const heater = bow.heater;
  if (!hasSystemId(heater)) {
    return { installed: false };
  }
  const appliances = heater.operations.flatMap((o) => o.heaterEquipment ?? []);
  const types = appliances.map((e) => stringOf(e.heaterType));
  const first = appliances[0];
  const heaterType = types[0];
  const unit: HeaterUnitSlot = hasSystemId(first)
    ? { installed: true, systemId: first.systemId, heaterType }
    : { installed: false };
  const gas =
    types.length === 0 || types.some((t) => hasFeature(t, OTHER_HEATER_TYPES));
  return {
    installed: true,
    systemId: heater.systemId,
    heaterType,
    gas,
    unit,
  };
};

const SALT_CELL_TYPES = new Set([
  "CELL_TYPE_T3",
  "CELL_TYPE_T5",
  "CELL_TYPE_T9",
  "CELL_TYPE_T15",
  "CELL_TYPE_T15_LS",
  "CELL_TYPE_TCELLS315",
  "CELL_TYPE_TCELLS325",
  "CELL_TYPE_TCELLS340",
]);

const chlorinatorOf = (bow: BodyOfWater): BodyInventory["chlorinator"] => {
  const chlorinator = bow.chlorinator;
  if (!hasSystemId(chlorinator)) {
    return { installed: false };
  }
  const cell = chlorinator.operations
    .map((o) => o.chlorinatorEquipment)
    .find(hasSystemId);
  const cellType = stringOf(chlorinator.cellType);
  return {
    installed: true,
    systemId: chlorinator.systemId,
    cell:
      cell === undefined
        ? { installed: false }
        : {
            installed: true,
            systemId: cell.systemId,
            cellType,
            feeder: hasFeature(cellType, SALT_CELL_TYPES),
          },
  };
};

const slotOf = (node: unknown): Slot =>
  hasSystemId(node)
    ? { installed: true, systemId: node.systemId }
    : { installed: false };

const lightOf = (bow: BodyOfWater): BodyInventory["light"] => {
  const light = bow.colorLogicLights[0];
  if (!hasSystemId(light)) {
    return { installed: false };
  }
  return {
    installed: true,
    systemId: light.systemId,
    networked: bow.colorLogicLights.some((l) => l.networked),
  };
};

const blowerOf = (bow: BodyOfWater): Slot =>
  slotOf(bow.relays.find((r) => stringOf(r.function) === "RLY_BLOWER"));

const spilloverOf = (bow: BodyOfWater) => {
  const sharedType = stringOf(bow.sharedType);
  return sharedType !== undefined && sharedType !== "BOW_NO_EQUIPMENT_SHARED";
};

const bodyOf = (bow: BodyOfWater): BodyInventory => {
  return {
    systemId: bow.systemId,
    spillover: spilloverOf(bow),
    csad: slotOf(bow.csad),
    filter: filterOf(bow),
    heater: heaterOf(bow),
    chlorinator: chlorinatorOf(bow),
    light: lightOf(bow),
    blower: blowerOf(bow),
  };
};

export const discover = (config: MSPConfig): Inventory => ({
  bodies: config.backyard.bodiesOfWater
    .filter(hasSystemId)
    .map((bow) => bodyOf(bow)),
});

export const installedAt = (body: BodyInventory, path: InventoryPath) => {
  switch (path) {
    case "filter":
      return body.filter.installed;
    case "filter.vsp":
      return body.filter.installed && body.filter.vsp;
    case "heater":
      return body.heater.installed;
    case "heater.gas":
      return body.heater.installed && body.heater.gas;
    case "heater.unit":
      return body.heater.installed && body.heater.unit.installed;
    case "chlorinator":
      return body.chlorinator.installed;
    case "chlorinator.cell":
      return body.chlorinator.installed && body.chlorinator.cell.installed;
    case "chlorinator.feeder":
      return (
        body.chlorinator.installed &&
        body.chlorinator.cell.installed &&
        body.chlorinator.cell.feeder
      );
    case "csad":
      return body.csad.installed;
    case "light":
      return body.light.installed;
    case "light.networked":
      return body.light.installed && body.light.networked;
    case "blower":
      return body.blower.installed;
    case "spillover":
      return body.spillover;
    default:
      return unreachablePath(path);
  }
};

export const systemIdAt = (body: BodyInventory, path: InventoryPath) => {
  const slot = (() => {
    switch (path) {
      case "filter":
      case "filter.vsp":
        return body.filter;
      case "heater":
      case "heater.gas":
        return body.heater;
      case "heater.unit":
        return body.heater.installed ? body.heater.unit : undefined;
      case "chlorinator":
        return body.chlorinator;
      case "chlorinator.cell":
      case "chlorinator.feeder":
        return body.chlorinator.installed ? body.chlorinator.cell : undefined;
      case "light":
      case "light.networked":
        return body.light;
      case "blower":
        return body.blower;
      case "csad":
        return body.csad;
      case "spillover":
        return undefined;
      default:
        return unreachablePath(path);
    }
  })();
  return slot?.installed ? slot.systemId : undefined;
};
