import { Slider, Stack, Text } from "@mantine/core";

// a 1–100% set point: caption, large value, slider
export const PercentSlider = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (percent: number) => void;
}) => (
  <div>
    <Stack gap={4} align="center">
      <Text size="xs" c="dimmed" fw={600} tt="uppercase">
        {label}
      </Text>
      <Text fz="1.75rem" fw={700} lh={1}>
        {value}%
      </Text>
      <Slider
        w="100%"
        mt="xs"
        min={1}
        max={100}
        value={value}
        label={null}
        onChange={onChange}
      />
    </Stack>
  </div>
);
