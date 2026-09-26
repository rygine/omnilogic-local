import { Button, Group, NumberInput, Select } from "@mantine/core";
import { useState } from "react";

import { useModalDirty } from "@/components/Modal/modal-state";

import { COUNTDOWN_PRESETS } from "./presets";

// hours, minutes, the quick picks, and Start, the fields a draft until Start
export const DurationPicker = ({
  onStart,
  pending = false,
  disabled = false,
}: {
  onStart: (hours: number, minutes: number) => void;
  pending?: boolean;
  disabled?: boolean;
}) => {
  const [hours, setHours] = useState<number | string>(1);
  const [minutes, setMinutes] = useState<number | string>(0);
  useModalDirty(hours !== 1 || minutes !== 0);

  const h = typeof hours === "number" ? hours : 0;
  const m = typeof minutes === "number" ? minutes : 0;

  const pick = (total: number) => {
    setHours(Math.floor(total / 60));
    setMinutes(total % 60);
  };

  return (
    <Group justify="space-between" align="center" wrap="nowrap" gap="md">
      <Group align="center" wrap="nowrap" gap="sm">
        <NumberInput
          aria-label="Hours"
          value={hours}
          onChange={setHours}
          min={0}
          max={23}
          step={1}
          allowDecimal={false}
          suffix="h"
          w={84}
        />
        <NumberInput
          aria-label="Minutes"
          value={minutes}
          onChange={setMinutes}
          min={0}
          max={59}
          step={5}
          allowDecimal={false}
          suffix="m"
          w={84}
        />
      </Group>
      <Group align="center" wrap="nowrap" gap="xs">
        <Select
          aria-label="Preset"
          placeholder="Preset"
          data={COUNTDOWN_PRESETS.map((p) => ({
            value: String(p.minutes),
            label: p.label,
          }))}
          value={
            COUNTDOWN_PRESETS.some((p) => p.minutes === h * 60 + m)
              ? String(h * 60 + m)
              : null
          }
          onChange={(v) => {
            if (v !== null) {
              pick(Number(v));
            }
          }}
          allowDeselect={false}
          checkIconPosition="right"
          w={92}
        />
        <Button
          onClick={() => onStart(h, m)}
          loading={pending}
          disabled={disabled || (h === 0 && m === 0)}>
          Start
        </Button>
      </Group>
    </Group>
  );
};
