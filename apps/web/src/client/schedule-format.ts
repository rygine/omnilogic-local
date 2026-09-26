import { pad2 } from "@/client/format";

// the days mask is Monday-first: bit 0 is Monday, bit 6 is Sunday
export const WEEK_DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

// mirrors the SDK's SCHEDULE_EVERY_DAY
export const ALL_DAYS = 127;
const WEEKDAYS = 0b0011111;
const WEEKEND = 0b1100000;

type DayPreset = "all" | "weekdays" | "weekend";

// which preset a mask matches, or "" for a custom selection
export const dayPreset = (mask: number): DayPreset | "" =>
  mask === ALL_DAYS
    ? "all"
    : mask === WEEKDAYS
      ? "weekdays"
      : mask === WEEKEND
        ? "weekend"
        : "";

// the mask for a preset value, or undefined
export const presetMask = (preset: string): number | undefined => {
  switch (preset) {
    case "all":
      return ALL_DAYS;
    case "weekdays":
      return WEEKDAYS;
    case "weekend":
      return WEEKEND;
    default:
      return undefined;
  }
};

export const toggleDay = (mask: number, index: number): number =>
  mask ^ (1 << index);

// HH:MM, the format Mantine's TimeInput reads and writes
export const formatTime = (h: number, m: number): string =>
  `${pad2(h)}:${pad2(m)}`;

const parseTime = (value: string): { h: number; m: number } => {
  const [hStr, mStr] = value.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  return {
    h: Number.isFinite(h) && h >= 0 && h <= 23 ? h : 0,
    m: Number.isFinite(m) && m >= 0 && m <= 59 ? m : 0,
  };
};

// minutes between start and end, wrapping past midnight
const durationMinutes = (
  startHour: number,
  startMinute: number,
  endHour: number,
  endMinute: number,
): number => {
  const diff = endHour * 60 + endMinute - (startHour * 60 + startMinute);
  return diff >= 0 ? diff : diff + 1440;
};

// "1h 30m", "45m", "2h"
export const formatDuration = (mins: number): string => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) {
    return `${m}m`;
  }
  if (m === 0) {
    return `${h}h`;
  }
  return `${h}h ${m}m`;
};

type ScheduleWindow = {
  daysActive: number;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  enabled: boolean;
};

// enabled, today's bit set, and now inside the window (which may cross midnight)
const isActiveNow = (
  schedule: ScheduleWindow,
  now: Date = new Date(),
): boolean => {
  if (!schedule.enabled) {
    return false;
  }
  // getDay() counts from Sunday, the mask from Monday
  const dayBit = 1 << ((now.getDay() + 6) % 7);
  if ((schedule.daysActive & dayBit) === 0) {
    return false;
  }
  const cur = now.getHours() * 60 + now.getMinutes();
  const start = schedule.startHour * 60 + schedule.startMinute;
  const end = schedule.endHour * 60 + schedule.endMinute;
  return end >= start ? cur >= start && cur < end : cur >= start || cur < end;
};

type ScheduleStatus = "active" | "idle" | "off";

// off when disabled, active when running now, idle otherwise
export const scheduleStatus = (
  schedule: ScheduleWindow,
  now: Date = new Date(),
): ScheduleStatus =>
  !schedule.enabled ? "off" : isActiveNow(schedule, now) ? "active" : "idle";

// sun-based endpoint sentinels, mirrors the SDK's constants
const SUNRISE_HOUR = 25;
const SUNSET_HOUR = 26;
const SUN_MINUTE = 25;

type TimeMode = "clock" | "sunrise" | "sunset";

export const timeMode = (hour: number): TimeMode =>
  hour === SUNRISE_HOUR ? "sunrise" : hour === SUNSET_HOUR ? "sunset" : "clock";

const isSunBased = (hour: number): boolean =>
  hour === SUNRISE_HOUR || hour === SUNSET_HOUR;

// a mode plus clock string as the wire { h, m }
export const encodeScheduleTime = (
  mode: string,
  clock: string,
): { h: number; m: number } => {
  if (mode === "sunrise") {
    return { h: SUNRISE_HOUR, m: SUN_MINUTE };
  }
  if (mode === "sunset") {
    return { h: SUNSET_HOUR, m: SUN_MINUTE };
  }
  return parseTime(clock);
};

// the viewer's locale, as the time input and the log show it: "6:00 PM"
const CLOCK = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});
const clockLabel = (hour: number, minute: number): string =>
  CLOCK.format(new Date(2000, 0, 1, hour, minute));

const timeLabel = (hour: number, minute: number): string =>
  hour === SUNRISE_HOUR
    ? "Sunrise"
    : hour === SUNSET_HOUR
      ? "Sunset"
      : clockLabel(hour, minute);

// "Sunrise – Sunset" or "10:00 AM – 6:00 PM · 8h", the duration only for clock times
export const scheduleWindow = (w: {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}): string => {
  const start = timeLabel(w.startHour, w.startMinute);
  const end = timeLabel(w.endHour, w.endMinute);
  const sun = isSunBased(w.startHour) || isSunBased(w.endHour);
  const dur = sun
    ? ""
    : ` · ${formatDuration(
        durationMinutes(w.startHour, w.startMinute, w.endHour, w.endMinute),
      )}`;
  return `${start} – ${end}${dur}`;
};
