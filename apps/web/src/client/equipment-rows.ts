import type {
  EquipmentRow,
  BowDetail,
  HeaterState,
  PumpDetail,
} from "@/server/serializers";
import { formatSpeed, presetOf } from "@/shared/speed";
import { formatTemp } from "@/shared/temperature";

// the device kinds that have a control
export type ControlKind =
  | "filter"
  | "heater"
  | "light"
  | "chlorinator"
  | "pump"
  | "relay"
  // a body feature, not a device: addressed by the body id
  | "spillover";

// one device on a body, with everything a card needs
export type DeviceRow = {
  kind: ControlKind;
  // the kind's label, e.g. "Filter"
  label: string;
  id: number;
  name: string;
  on: boolean;
  // the card's reading ("2000 RPM", "50%", a show, a set point), null for on or off only
  value: string | null;
  // a filter's preset or a chlorinator's salt level, null otherwise
  detail: string | null;
  // a status beyond On/Off: a light's power state, a heater's burner state
  statusLabel?: string;
  // a caption above value ("Set point")
  valueLabel?: string;
  // the state in words, for the flat listing
  state: string;
  // running under a countdown, undefined when telemetry cannot say
  countdown?: boolean;
};

// a pump's speed, in rpm when the range is known, "" when off
const pumpSpeed = (p: PumpDetail): string =>
  p.speed === null ? "" : formatSpeed(p.speed, p.rpmRange, p.speedRange);

const pumpState = (p: PumpDetail): string => {
  if (!p.on) {
    return "Off";
  }
  const s = pumpSpeed(p);
  return s ? `On · ${s}` : "On";
};

const HEATER_STATUS: Record<HeaterState, string> = {
  off: "Off",
  idle: "Idle",
  heating: "Heating",
  paused: "Paused",
};

// every device on one body, in a stable order
export const deviceRows = (bow: BowDetail): DeviceRow[] => {
  // a device name can be empty, and heaters carry none
  const rows: DeviceRow[] = [];
  for (const f of bow.filters) {
    const speed = formatSpeed(f.speed, f.rpmRange, f.speedRange);
    const preset = presetOf(f.speed, f.presets);
    rows.push({
      kind: "filter",
      label: "Filter",
      id: f.id,
      name: f.name || "Filter",
      on: f.on,
      value: f.on ? speed || null : null,
      detail: f.on ? preset : null,
      statusLabel:
        f.status === "On" || f.status === "Off" ? undefined : f.status,
      state: f.on ? `On · ${speed}${preset ? ` (${preset})` : ""}` : "Off",
      countdown: f.countdown,
    });
  }
  for (const h of bow.heaters) {
    const status = HEATER_STATUS[h.state];
    const setPoint = formatTemp(h.setPoint);
    rows.push({
      kind: "heater",
      label: "Heater",
      id: h.id,
      name: h.name || "Heater",
      // on means enabled, and the burner state is the status
      on: h.enabled,
      valueLabel: "Set point",
      value: setPoint,
      detail: null,
      statusLabel: status,
      state: `${status} · ${setPoint}`,
    });
  }
  for (const c of bow.chlorinators) {
    rows.push({
      kind: "chlorinator",
      label: "Chlorinator",
      id: c.id,
      name: "Chlorinator",
      on: c.active,
      value: c.active ? `${c.outputPercent}%` : null,
      detail: c.active
        ? c.generating
          ? `Chlorinating · ${c.avgSalt} ppm`
          : `${c.avgSalt} ppm salt`
        : null,
      state: c.active ? `On · ${c.outputPercent}%` : "Off",
    });
  }
  for (const l of bow.lights) {
    rows.push({
      kind: "light",
      label: "Light",
      id: l.id,
      name: l.name,
      on: l.on,
      value: l.on ? (l.show ?? null) : null,
      detail: null,
      statusLabel: l.state,
      state: l.on ? (l.show ?? l.state) : l.state,
    });
  }
  for (const p of bow.pumps) {
    const speed = pumpSpeed(p);
    rows.push({
      kind: "pump",
      label: "Pump",
      id: p.id,
      name: p.name,
      on: p.on,
      value: p.on ? speed || null : null,
      detail: null,
      state: pumpState(p),
    });
  }
  for (const r of bow.relays) {
    rows.push({
      kind: "relay",
      label: "Relay",
      id: r.id,
      name: r.name,
      on: r.on,
      value: null,
      detail: null,
      state: r.on ? "On" : "Off",
      countdown: r.countdown,
    });
  }
  // spillover has no equipment id, the body id stands in
  if (bow.spillover) {
    const s = bow.spillover;
    const speed = formatSpeed(s.speed, s.rpmRange, s.speedRange);
    const preset = presetOf(s.speed, s.presets);
    rows.push({
      kind: "spillover",
      label: "Spillover",
      id: bow.id,
      name: "Spillover",
      on: s.on,
      value: s.on ? speed : null,
      detail: s.on ? preset : null,
      state: s.on ? `On · ${speed}${preset ? ` (${preset})` : ""}` : "Off",
      countdown: s.countdown,
    });
  }
  return rows;
};

// one flat row per device across bodies, for the theme preview
export const equipmentRows = (bows: BowDetail[]): EquipmentRow[] => {
  return bows.flatMap((bow) =>
    deviceRows(bow).map((r) => ({
      body: bow.name,
      kind: r.label,
      name: r.name,
      state: r.state,
    })),
  );
};
