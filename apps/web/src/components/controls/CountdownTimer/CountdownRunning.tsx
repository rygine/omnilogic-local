import { Button, Group, Paper, Text } from "@mantine/core";
import { ClockIcon } from "@phosphor-icons/react";

import { formatCountdown } from "@/client/tick";

// the time left and Cancel, the ordinary off, "…" until the time is known
export const CountdownRunning = ({
  leftMs,
  onCancel,
  pending = false,
  disabled = false,
}: {
  leftMs: number;
  onCancel: () => void;
  pending?: boolean;
  disabled?: boolean;
}) => (
  <Paper withBorder p="sm" radius="md" bg="var(--mantine-primary-color-light)">
    <Group justify="space-between" wrap="nowrap">
      <Group gap="xs" wrap="nowrap">
        <ClockIcon size={20} />
        <Text fw={600} ff="monospace" role="timer">
          {leftMs > 0 ? formatCountdown(leftMs) : "…"}
        </Text>
      </Group>
      <Button
        variant="filled"
        color="dark"
        size="xs"
        loading={pending}
        disabled={disabled}
        onClick={onCancel}>
        Cancel
      </Button>
    </Group>
  </Paper>
);
