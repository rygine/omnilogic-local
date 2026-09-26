import { SimpleGrid, Skeleton, Stack } from "@mantine/core";
import type { SimpleGridProps } from "@mantine/core";

// a page's card sections while its queries load
export const SectionsSkeleton = ({
  sections = 2,
  cards = 4,
  cardHeight,
  cols,
}: {
  sections?: number;
  cards?: number;
  cardHeight: number;
  cols: SimpleGridProps["cols"];
}) => (
  <Stack gap="xl">
    {Array.from({ length: sections }, (_, i) => (
      <Stack key={i} gap="sm">
        <Skeleton height={24} width={80} radius="sm" />
        <SimpleGrid cols={cols} spacing="xs">
          {Array.from({ length: cards }, (__, j) => (
            <Skeleton key={j} height={cardHeight} radius="md" />
          ))}
        </SimpleGrid>
      </Stack>
    ))}
  </Stack>
);
