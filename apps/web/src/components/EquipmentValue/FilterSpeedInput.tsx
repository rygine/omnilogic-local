import { SegmentedControl, Slider, Stack, Text } from "@mantine/core";

import { formatSpeed, type Range, type SpeedPresets } from "@/shared/speed";

// a speed slider in whole percents with Low, Med, and High jumps, read in rpm when the range is known
export const FilterSpeedInput = ({
  label,
  description,
  disabled = false,
  presets,
  rpmRange,
  speedRange,
  value,
  onChange,
}: {
  // the slider's name and the caption, "Speed" by default
  label?: string;
  // a dimmed line under the presets
  description?: string;
  // grays the slider and presets out, the value still shows
  disabled?: boolean;
  // the Low, Med, and High jumps
  presets?: SpeedPresets;
  rpmRange: Range | null;
  speedRange: Range;
  value: number;
  onChange: (percent: number) => void;
}) => {
  const displayLabel = label ?? "Speed";
  const options = presets
    ? [
        { key: "low", label: "Low", pct: presets.low },
        { key: "medium", label: "Med", pct: presets.medium },
        { key: "high", label: "High", pct: presets.high },
      ]
    : [];
  const active = presets
    ? (options.find((o) => o.pct === value)?.key ?? "")
    : "";

  return (
    <div>
      <Stack gap={4} align="center">
        <Text size="xs" c="dimmed" fw={600} tt="uppercase">
          {displayLabel}
        </Text>
        <Text fz="1.75rem" fw={700} lh={1}>
          {formatSpeed(value, rpmRange)}
        </Text>
        <Slider
          w="100%"
          mt="xs"
          min={speedRange.min}
          max={speedRange.max}
          step={1}
          value={value}
          label={null}
          thumbLabel={displayLabel}
          disabled={disabled}
          onChange={onChange}
        />
        {presets && (
          <SegmentedControl
            mt="xs"
            size="sm"
            color="blue"
            value={active}
            disabled={disabled}
            onChange={(key) => {
              const o = options.find((x) => x.key === key);
              if (o) {
                onChange(o.pct);
              }
            }}
            data={options.map((o) => ({ value: o.key, label: o.label }))}
          />
        )}
        {description && (
          <Text size="xs" c="dimmed" ta="center" mt={4}>
            {description}
          </Text>
        )}
      </Stack>
    </div>
  );
};
