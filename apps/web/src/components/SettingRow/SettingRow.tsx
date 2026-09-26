import { Group, Text } from "@mantine/core";
import type { ReactNode } from "react";

// label and description left, the control right
export const SettingRow = ({
  label,
  description,
  control,
  labelSize = "sm",
  aside,
}: {
  label: string;
  description: string;
  control: ReactNode;
  labelSize?: "sm" | "md";
  aside?: ReactNode;
}) => (
  <Group justify="space-between" align="center" wrap="nowrap" gap="md">
    <div>
      <Group gap="md" align="center" wrap="nowrap">
        <Text fw={500} size={labelSize}>
          {label}
        </Text>
        {aside}
      </Group>
      <Text size="xs" c="dimmed">
        {description}
      </Text>
    </div>
    {control}
  </Group>
);
