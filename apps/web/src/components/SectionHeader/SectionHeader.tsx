import { Group, Title } from "@mantine/core";
import type { ReactNode } from "react";

// a section's title with whatever belongs to its right
export const SectionHeader = ({
  title,
  aside,
  order = 3,
}: {
  title: string;
  aside?: ReactNode;
  order?: 3 | 4;
}) => (
  <Group justify="space-between" align="center" mb="md">
    <Title order={order}>{title}</Title>
    {aside}
  </Group>
);
