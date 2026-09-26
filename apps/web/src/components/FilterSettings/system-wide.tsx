import { Alert, NumberInput } from "@mantine/core";
import type { ReactNode } from "react";

import type { FilterBody } from "@/client/filter-settings";
import { inputNumber } from "@/client/number-input";
import { SettingRow } from "@/components/SettingRow/SettingRow";
import type { FilterSettings } from "@/server/serializers";
import {
  DURATION_BOUNDS,
  durationProblem,
  type BoundedDuration,
} from "@/shared/duration-bounds";

// the components the system-wide Settings sections share

// a bounded duration input in seconds, shown in minutes when the step is a minute
export const DurationRow = ({
  setting,
  label,
  description,
  value,
  current,
  onChange,
  disabled,
}: {
  setting: BoundedDuration;
  label: string;
  description: string;
  // the draft, in seconds
  value: number;
  // the controller's value, in seconds
  current: number;
  onChange: (seconds: number) => void;
  disabled?: boolean;
}) => {
  const { min, max, step } = DURATION_BOUNDS[setting];
  const minutes = step === 60;
  const scale = minutes ? 60 : 1;
  const problem =
    value === current ? undefined : durationProblem(setting, value);
  return (
    <SettingRow
      label={label}
      description={description}
      labelSize="md"
      control={
        <NumberInput
          aria-label={label}
          suffix={minutes ? "m" : "s"}
          min={min / scale}
          max={max / scale}
          clampBehavior="none"
          allowDecimal={!minutes}
          value={Number.isNaN(value) ? "" : value / scale}
          onChange={(v) => onChange(inputNumber(v) * scale)}
          error={problem}
          disabled={disabled}
          w={130}
        />
      }
    />
  );
};

// one warning per body whose copy disagrees with the first body's
export const CopyDiffAlerts = <F extends keyof FilterSettings>({
  copyDiffs,
  fieldLabel,
  fieldFormat,
}: {
  copyDiffs: { body: FilterBody; fields: F[] }[];
  fieldLabel: Record<F, string>;
  fieldFormat: Record<F, (value: boolean | number) => string>;
}): ReactNode =>
  copyDiffs
    .filter((d) => d.fields.length > 0)
    .map((d) => {
      const fieldsText = d.fields
        .map(
          (f) =>
            `${fieldLabel[f]}: ${fieldFormat[f](d.body.filter.settings[f])}`,
        )
        .join(", ");
      return (
        <Alert key={d.body.bowId} color="yellow">
          {`The ${d.body.bodyName} copy differs (${fieldsText}); Apply writes every copy.`}
        </Alert>
      );
    });
