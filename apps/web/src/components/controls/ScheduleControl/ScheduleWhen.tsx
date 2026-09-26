import { Divider, Group } from "@mantine/core";
import { useState, type ReactNode } from "react";

import { encodeScheduleTime } from "@/client/schedule-format";
import { TimeField } from "@/components/controls/ScheduleControl/TimeField";
import { DaySelector } from "@/components/WeekDays/DaySelector";

type When = {
  startMode: string;
  startTime: string;
  endMode: string;
  endTime: string;
  days: number;
};

// when a schedule runs: the two endpoints and the days, and whether they changed
export const useScheduleWhen = (
  initial: When,
): {
  fields: ReactNode;
  times: {
    startHour: number;
    startMinute: number;
    endHour: number;
    endMinute: number;
    daysActive: number;
  };
  changed: boolean;
} => {
  const [opened] = useState(initial);
  const [startMode, setStartMode] = useState(initial.startMode);
  const [startTime, setStartTime] = useState(initial.startTime);
  const [endMode, setEndMode] = useState(initial.endMode);
  const [endTime, setEndTime] = useState(initial.endTime);
  const [days, setDays] = useState(initial.days);

  const s = encodeScheduleTime(startMode, startTime);
  const e = encodeScheduleTime(endMode, endTime);

  return {
    times: {
      startHour: s.h,
      startMinute: s.m,
      endHour: e.h,
      endMinute: e.m,
      daysActive: days,
    },
    changed:
      startMode !== opened.startMode ||
      startTime !== opened.startTime ||
      endMode !== opened.endMode ||
      endTime !== opened.endTime ||
      days !== opened.days,
    fields: (
      <>
        <Group grow align="flex-start">
          <TimeField
            label="Start"
            mode={startMode}
            time={startTime}
            onModeChange={setStartMode}
            onTimeChange={setStartTime}
          />
          <TimeField
            label="End"
            mode={endMode}
            time={endTime}
            onModeChange={setEndMode}
            onTimeChange={setEndTime}
          />
        </Group>
        <Divider />
        <DaySelector mask={days} onChange={setDays} />
      </>
    ),
  };
};
