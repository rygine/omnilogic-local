import { NumberInput } from "@mantine/core";

import { inputNumber } from "@/client/number-input";

// a 0–100% value
export const PercentInput = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (percent: number) => void;
}) => (
  <NumberInput
    label={label}
    value={value}
    min={0}
    max={100}
    suffix="%"
    onChange={(v) => onChange(inputNumber(v, 0))}
  />
);
