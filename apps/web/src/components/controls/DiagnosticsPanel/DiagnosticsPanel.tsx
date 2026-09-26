import {
  ActionIcon,
  Group,
  SimpleGrid,
  Skeleton,
  Text,
  Tooltip,
} from "@mantine/core";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react";

import { useDiagnostics, type DiagnosticsTarget } from "@/client/queries";
import { formatAgo, useNow } from "@/client/tick";
import { Empty } from "@/components/Empty/Empty";
import { LoadError } from "@/components/LoadError/LoadError";
import { Tiles } from "@/components/Tiles/Tiles";

// the readings as tiles, two across, free text spanning the row
export const DiagnosticsPanel = ({ target }: { target: DiagnosticsTarget }) => {
  const q = useDiagnostics(target);
  const now = useNow();

  if (q.isPending) {
    return (
      <SimpleGrid cols={2} spacing="xs">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} height={58} radius="md" />
        ))}
      </SimpleGrid>
    );
  }
  if (q.isError) {
    return (
      <LoadError onRetry={() => void q.refetch()} retrying={q.isFetching} />
    );
  }
  if (q.data.length === 0) {
    return <Empty of="diagnostics" />;
  }
  return (
    <div>
      <Group justify="flex-end" gap="xs" mb="xs">
        <Text size="xs" c="dimmed">
          {q.isFetching
            ? "reading…"
            : `as of ${formatAgo(now - q.dataUpdatedAt)}`}
        </Text>
        <Tooltip label="Read again" withArrow>
          <ActionIcon
            variant="subtle"
            color="gray"
            aria-label="Read diagnostics again"
            loading={q.isFetching}
            onClick={() => void q.refetch()}>
            <ArrowsClockwiseIcon size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>
      <Tiles items={q.data} columns={2} />
    </div>
  );
};
