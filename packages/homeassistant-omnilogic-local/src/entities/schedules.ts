import {
  type config,
  type OmniLogic,
  SCHEDULE_EVERY_DAY,
  SCHEDULE_SUNRISE_HOUR,
  SCHEDULE_SUNSET_HOUR,
  SCHEDULE_TYPE,
} from "@rygine/omnilogic-local-sdk";

import { type DeviceSpec, type Entity, toBoolean } from "@/entities/entity";

type Schedule = config.Schedule;

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const pad = (n: number) => String(n).padStart(2, "0");

export const timeOf = (hour: number, minute: number) =>
  hour === SCHEDULE_SUNRISE_HOUR
    ? "sunrise"
    : hour === SCHEDULE_SUNSET_HOUR
      ? "sunset"
      : `${pad(hour)}:${pad(minute)}`;

export const windowOf = (s: Schedule) =>
  `${timeOf(s.startHour, s.startMinute)}–${timeOf(s.endHour, s.endMinute)}`;

const daysOf = (mask: number) =>
  mask === SCHEDULE_EVERY_DAY
    ? "every day"
    : DAYS.filter((_, i) => (mask & (1 << i)) !== 0).join(", ");

export const summary = (s: Schedule, name: string) =>
  `${name} ${windowOf(s)}, ${daysOf(s.daysActive)}, value ${s.data}`;

// the name of what a schedule runs
export const targetNameOf = (s: Schedule, devices: DeviceSpec[]) => {
  if (s.event === SCHEDULE_TYPE.spillover) {
    const body = devices.find((d) => d.id === String(s.bowSystemId))?.name;
    return `${body ?? `Body ${s.bowSystemId}`} spillover`;
  }
  return (
    devices.find((d) => d.id === String(s.equipmentId))?.name ??
    `Equipment ${s.equipmentId}`
  );
};

export const supportedSchedules = (omni: OmniLogic) =>
  omni.backyard.schedules
    .list()
    .filter((s) => s.recurring === 1 && s.event !== SCHEDULE_TYPE.theme);

export const schedules = (omni: OmniLogic, devices: DeviceSpec[]): Entity[] => {
  const controllerSchedules = omni.backyard.schedules;
  return supportedSchedules(omni).flatMap((s): Entity[] => {
    const id = s.scheduleSystemId;
    const name = summary(s, targetNameOf(s, devices));
    return [
      {
        platform: "switch",
        key: `schedule_${id}_enabled`,
        name,
        value: () => controllerSchedules.get(id)?.enabled === 1,
        command: async (payload) =>
          controllerSchedules.setEnabled(id, toBoolean(payload)),
      },
      {
        platform: "button",
        key: `schedule_${id}_delete`,
        name: `Delete ${name}`,
        command: async () => controllerSchedules.remove(id),
      },
    ];
  });
};
