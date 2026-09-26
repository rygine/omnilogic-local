import { Text } from "@mantine/core";

import { tempColor } from "@/client/temperature";
import { formatTemp } from "@/shared/temperature";

// a reading colored by warmth, in the surrounding size and weight
export const Temperature = ({ value }: { value: number }) => (
  <Text span inherit c={tempColor(value)}>
    {formatTemp(value)}
  </Text>
);
