import { Button, Group, Text } from "@mantine/core";

// the one error line a failed read gets
export const UNREACHABLE = "Controller unreachable.";

// a failed load: the line and the one retry button every failure gets
export const LoadError = ({
  onRetry,
  retrying = false,
}: {
  onRetry: () => void;
  retrying?: boolean;
}) => (
  <Group gap="sm" align="center">
    <Text c="red">{UNREACHABLE}</Text>
    <Button size="xs" variant="default" loading={retrying} onClick={onRetry}>
      Try again
    </Button>
  </Group>
);
