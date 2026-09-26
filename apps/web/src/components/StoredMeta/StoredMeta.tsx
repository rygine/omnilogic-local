import { Button, Group, Text } from "@mantine/core";

import { formatAgo, useNow } from "@/client/tick";

// when a stored setting was last read or written, and a button to read it again
export const StoredMeta = ({
  readAt,
  refreshing,
  onRefresh,
}: {
  // iso 8601, or ms since the epoch
  readAt: string | number;
  refreshing: boolean;
  onRefresh: () => void;
}) => {
  const now = useNow();
  return (
    <Group gap="sm" align="center" wrap="nowrap">
      <Text size="xs" c="dimmed">
        Last updated {formatAgo(now - new Date(readAt).getTime())}
      </Text>
      <Button
        size="xs"
        variant="default"
        loading={refreshing}
        onClick={onRefresh}>
        Refresh
      </Button>
    </Group>
  );
};
