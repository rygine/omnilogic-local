import { Text } from "@mantine/core";

// the one empty-state line: "No <of>." — "No spa favorites.", "No themes."
export const Empty = ({ of }: { of: string }) => (
  <Text c="dimmed" size="sm">
    No {of.toLowerCase()}.
  </Text>
);
