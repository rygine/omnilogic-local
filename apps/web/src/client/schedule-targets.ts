import type { ScheduleType } from "@rygine/omnilogic-local-sdk";

import type {
  BowDetail,
  ChlorinatorDetail,
  FilterDetail,
  HeaterDetail,
  LightDetail,
  PumpDetail,
  RelayDetail,
  SpilloverDetail,
  ThemeSummary,
} from "@/server/serializers";

// a piece of equipment a schedule can drive, with what its action input needs
export type ScheduleTarget =
  | Target<"filter", FilterDetail>
  | Target<"chlorinator", ChlorinatorDetail>
  | Target<"heater", HeaterDetail>
  | Target<"light", LightDetail>
  | Target<"pump", PumpDetail>
  | Target<"relay", RelayDetail>
  | Target<"spillover", SpilloverDetail>
  | Target<"theme", ThemeSummary>;

type Target<K extends string, D> = {
  kind: K;
  equipmentId: number;
  // the kind of schedule the SDK creates for it
  type: ScheduleType;
  bodyName: string;
  name: string;
  device: D;
};

// equipment id plus type: the filter and spillover share an equipment id
export const targetKey = (t: {
  equipmentId: number;
  type: ScheduleType;
}): string => `${t.equipmentId}:${t.type}`;

// every schedulable device across all bodies, in a stable order
export const scheduleTargets = (
  bows: BowDetail[],
  themes: ThemeSummary[] = [],
): ScheduleTarget[] => {
  const targets: ScheduleTarget[] = [];
  for (const bow of bows) {
    for (const d of bow.filters) {
      targets.push({
        kind: "filter",
        equipmentId: d.id,
        type: "equipment",
        bodyName: bow.name,
        name: d.name || "Filter",
        device: d,
      });
    }
    for (const d of bow.chlorinators) {
      targets.push({
        kind: "chlorinator",
        equipmentId: d.id,
        type: "equipment",
        bodyName: bow.name,
        name: "Chlorinator",
        device: d,
      });
    }
    for (const d of bow.heaters) {
      targets.push({
        kind: "heater",
        equipmentId: d.id,
        type: "equipment",
        bodyName: bow.name,
        name: "Heater",
        device: d,
      });
    }
    for (const d of bow.lights) {
      targets.push({
        kind: "light",
        equipmentId: d.id,
        type: "equipment",
        bodyName: bow.name,
        name: d.name || "Light",
        device: d,
      });
    }
    for (const d of bow.pumps) {
      targets.push({
        kind: "pump",
        equipmentId: d.id,
        type: "equipment",
        bodyName: bow.name,
        name: d.name || "Pump",
        device: d,
      });
    }
    for (const d of bow.relays) {
      targets.push({
        kind: "relay",
        equipmentId: d.id,
        type: "equipment",
        bodyName: bow.name,
        name: d.name || "Relay",
        device: d,
      });
    }
    const filter = bow.filters[0];
    if (bow.spillover && filter) {
      targets.push({
        kind: "spillover",
        equipmentId: filter.id,
        type: "spillover",
        bodyName: bow.name,
        name: "Spillover",
        device: bow.spillover,
      });
    }
  }
  // a theme's schedule carries the theme's id in the equipment slot
  for (const t of themes) {
    targets.push({
      kind: "theme",
      equipmentId: t.id,
      type: "theme",
      bodyName: "Themes",
      name: t.name,
      device: t,
    });
  }
  return targets;
};

// a starting data for a picked target: what the equipment is doing now
export const defaultScheduleData = (t: ScheduleTarget): number => {
  switch (t.kind) {
    case "filter":
    case "spillover":
      // the Medium preset when there is one
      return (
        t.device.presets?.medium ??
        (t.device.speed >= t.device.speedRange.min
          ? t.device.speed
          : t.device.speedRange.min)
      );
    case "chlorinator":
      return t.device.outputPercent;
    case "heater":
      return t.device.setPoint;
    case "pump":
      return t.device.speed ?? 50;
    case "theme":
      // RunGroupCmd's data: 1 activates
      return 1;
    case "light":
      return (
        t.device.shows.find((s) => s.name === t.device.show)?.value ??
        t.device.shows[0]?.value ??
        0
      );
    case "relay":
      return 1;
    default:
      return 0;
  }
};
