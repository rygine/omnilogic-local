import {
  SCHEDULE_EVERY_DAY,
  SCHEDULE_SUNRISE_SUNSET_MINUTE,
  SCHEDULE_SUNRISE_HOUR,
  SCHEDULE_SUNSET_HOUR,
} from "@rygine/omnilogic-local-sdk";
import { describe, expect, it } from "vitest";

import {
  ALL_DAYS,
  dayPreset,
  encodeScheduleTime,
  formatTime,
  presetMask,
  scheduleStatus,
  scheduleWindow,
  timeMode,
  toggleDay,
} from "@/client/schedule-format";

describe("sunrise/sunset schedule times", () => {
  it("encodes and detects the SDK's sun sentinels", () => {
    expect(encodeScheduleTime("sunrise", "08:00")).toEqual({
      h: SCHEDULE_SUNRISE_HOUR,
      m: SCHEDULE_SUNRISE_SUNSET_MINUTE,
    });
    expect(encodeScheduleTime("sunset", "08:00")).toEqual({
      h: SCHEDULE_SUNSET_HOUR,
      m: SCHEDULE_SUNRISE_SUNSET_MINUTE,
    });
    expect(timeMode(SCHEDULE_SUNRISE_HOUR)).toBe("sunrise");
    expect(timeMode(SCHEDULE_SUNSET_HOUR)).toBe("sunset");
    expect(timeMode(10)).toBe("clock");
  });

  it("labels a sun-based window without a duration", () => {
    expect(
      scheduleWindow({
        startHour: SCHEDULE_SUNRISE_HOUR,
        startMinute: SCHEDULE_SUNRISE_SUNSET_MINUTE,
        endHour: SCHEDULE_SUNSET_HOUR,
        endMinute: SCHEDULE_SUNRISE_SUNSET_MINUTE,
      }),
    ).toBe("Sunrise – Sunset");
  });
});

const clockWindow = (
  startHour: number,
  startMinute: number,
  endHour: number,
  endMinute: number,
) => scheduleWindow({ startHour, startMinute, endHour, endMinute });

describe("clock times", () => {
  it("formats zero-padded", () => {
    expect(formatTime(8, 0)).toBe("08:00");
    expect(formatTime(9, 30)).toBe("09:30");
  });

  it("parses a clock string and clamps invalid input to 0", () => {
    expect(encodeScheduleTime("clock", "08:30")).toEqual({ h: 8, m: 30 });
    expect(encodeScheduleTime("clock", "99:99")).toEqual({ h: 0, m: 0 });
    expect(encodeScheduleTime("clock", "nonsense")).toEqual({ h: 0, m: 0 });
  });

  it("labels a clock window in the viewer's locale with its duration, wrapping past midnight", () => {
    // the locale's own rendering
    const clock = new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
    const t = (h: number, m: number) =>
      clock.format(new Date(2000, 0, 1, h, m));
    expect(clockWindow(10, 0, 18, 0)).toBe(`${t(10, 0)} – ${t(18, 0)} · 8h`);
    expect(clockWindow(8, 0, 9, 30)).toBe(`${t(8, 0)} – ${t(9, 30)} · 1h 30m`);
    expect(clockWindow(10, 0, 10, 45)).toBe(`${t(10, 0)} – ${t(10, 45)} · 45m`);
    expect(clockWindow(23, 0, 1, 0)).toBe(`${t(23, 0)} – ${t(1, 0)} · 2h`);
  });
});

describe("day presets", () => {
  it("every day is the SDK's mask", () => {
    expect(ALL_DAYS).toBe(SCHEDULE_EVERY_DAY);
  });

  it("maps masks to a preset, or '' when custom", () => {
    expect(dayPreset(ALL_DAYS)).toBe("all");
    expect(dayPreset(0b0011111)).toBe("weekdays");
    expect(dayPreset(0b1100000)).toBe("weekend");
    expect(dayPreset(0b0000001)).toBe("");
  });

  it("resolves a preset value to its Monday-first mask", () => {
    expect(presetMask("all")).toBe(ALL_DAYS);
    expect(presetMask("weekdays")).toBe(0b0011111);
    expect(presetMask("weekend")).toBe(0b1100000);
    expect(presetMask("nope")).toBeUndefined();
  });

  it("toggles a single day's bit", () => {
    expect(toggleDay(0, 1)).toBe(0b10);
    expect(toggleDay(0b10, 1)).toBe(0);
  });
});

describe("scheduleStatus", () => {
  const sched = {
    daysActive: 0b1111111,
    startHour: 8,
    startMinute: 0,
    endHour: 9,
    endMinute: 30,
    enabled: true,
  };
  const monday830 = new Date(2024, 0, 1, 8, 30);

  it("classifies off / active / idle", () => {
    expect(scheduleStatus({ ...sched, enabled: false }, monday830)).toBe("off");
    expect(scheduleStatus(sched, monday830)).toBe("active");
    expect(scheduleStatus(sched, new Date(2024, 0, 1, 10, 0))).toBe("idle");
    expect(scheduleStatus({ ...sched, daysActive: 0 }, monday830)).toBe("idle");
  });

  it("is active inside a window that crosses midnight", () => {
    const overnight = { ...sched, startHour: 23, endHour: 1, endMinute: 0 };
    expect(scheduleStatus(overnight, new Date(2024, 0, 1, 23, 30))).toBe(
      "active",
    );
    expect(scheduleStatus(overnight, new Date(2024, 0, 1, 0, 30))).toBe(
      "active",
    );
    expect(scheduleStatus(overnight, new Date(2024, 0, 1, 2, 0))).toBe("idle");
  });

  it("maps JS weekdays onto the Monday-first mask", () => {
    const sundayOnly = { ...sched, daysActive: 64 };
    const sunday830 = new Date(2024, 0, 7, 8, 30);
    expect(scheduleStatus(sundayOnly, sunday830)).toBe("active");
    expect(scheduleStatus(sundayOnly, monday830)).toBe("idle");
  });
});
