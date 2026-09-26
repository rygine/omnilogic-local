import type { ControlKind } from "@/client/equipment-rows";
import type { BowDetail } from "@/server/serializers";

// a device the control modal can open
export type EquipmentSelection = {
  bowId: number;
  kind: ControlKind;
  id: number;
};

// the body and kind of an equipment id
export const resolveSelection = (
  bows: BowDetail[],
  equipmentId: number,
): EquipmentSelection | undefined => {
  for (const bow of bows) {
    const sel = (kind: ControlKind): EquipmentSelection => ({
      bowId: bow.id,
      kind,
      id: equipmentId,
    });
    if (bow.filters.some((d) => d.id === equipmentId)) {
      return sel("filter");
    }
    if (bow.heaters.some((d) => d.id === equipmentId)) {
      return sel("heater");
    }
    if (bow.lights.some((d) => d.id === equipmentId)) {
      return sel("light");
    }
    if (bow.chlorinators.some((d) => d.id === equipmentId)) {
      return sel("chlorinator");
    }
    if (bow.pumps.some((d) => d.id === equipmentId)) {
      return sel("pump");
    }
    if (bow.relays.some((d) => d.id === equipmentId)) {
      return sel("relay");
    }
    // spillover's row and route carry the body's own systemId
    if (bow.spillover && bow.id === equipmentId) {
      return sel("spillover");
    }
  }
  return undefined;
};

// the device's name, or the kind
export const controlTitle = (
  bow: BowDetail,
  sel: EquipmentSelection,
): string => {
  // a device name can be the empty string
  switch (sel.kind) {
    case "filter":
      return bow.filters.find((f) => f.id === sel.id)?.name || "Filter";
    case "heater":
      return bow.heaters.find((h) => h.id === sel.id)?.name || "Heater";
    case "light":
      return bow.lights.find((l) => l.id === sel.id)?.name || "Light";
    case "chlorinator":
      return "Chlorinator";
    case "pump":
      return bow.pumps.find((p) => p.id === sel.id)?.name || "Pump";
    case "relay":
      return bow.relays.find((r) => r.id === sel.id)?.name || "Relay";
    case "spillover":
      return "Spillover";
    default:
      return "";
  }
};
