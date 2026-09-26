import { Slider, Stack, Text } from "@mantine/core";

import { Temperature } from "@/components/Temperature/Temperature";

// a set point slider over the controller's settable range
export const TemperatureSlider = ({
  label = "Set point",
  value,
  min,
  max,
  onChange,
}: {
  label?: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) => (
  <div>
    <Stack gap={4} align="center">
      <Text size="xs" c="dimmed" fw={600} tt="uppercase">
        {label}
      </Text>
      <Text fz="1.75rem" fw={700} lh={1}>
        <Temperature value={value} />
      </Text>
      <Slider
        w="100%"
        mt="xs"
        min={min}
        max={max}
        step={1}
        value={value}
        label={null}
        thumbLabel={label}
        onChange={onChange}
      />
    </Stack>
  </div>
);
