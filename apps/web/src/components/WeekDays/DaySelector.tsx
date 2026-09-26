import { SegmentedControl, Stack } from "@mantine/core";

import { dayPreset, presetMask, toggleDay } from "@/client/schedule-format";
import { WeekDays } from "@/components/WeekDays/WeekDays";

// All/Weekdays/Weekend over the seven day circles, the selector reflecting the mask
export const DaySelector = ({
  mask,
  onChange,
}: {
  mask: number;
  onChange: (mask: number) => void;
}) => (
  <Stack gap="md" align="center" my="sm">
    <SegmentedControl
      size="sm"
      color="blue"
      value={dayPreset(mask)}
      onChange={(value) => {
        const next = presetMask(value);
        if (next !== undefined) {
          onChange(next);
        }
      }}
      data={[
        { value: "all", label: "All days" },
        { value: "weekdays", label: "Weekdays" },
        { value: "weekend", label: "Weekend" },
      ]}
    />
    <WeekDays
      mask={mask}
      size="lg"
      onToggle={(i) => onChange(toggleDay(mask, i))}
    />
  </Stack>
);
