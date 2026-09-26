import { Group, Text } from "@mantine/core";
import { ThermometerSimpleIcon } from "@phosphor-icons/react";

import { Temperature } from "./Temperature";

// a thermometer icon beside a temperature
export const TemperatureReading = ({ value }: { value: number }) => (
  <Group gap={4} wrap="nowrap">
    <ThermometerSimpleIcon size={16} color="var(--mantine-color-dimmed)" />
    <Text size="sm" fw={500}>
      <Temperature value={value} />
    </Text>
  </Group>
);
