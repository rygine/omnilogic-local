import { Badge } from "@mantine/core";
import { ClockIcon } from "@phosphor-icons/react";

import { useCountdownRemaining } from "@/client/queries";
import { formatCountdown, useNow } from "@/client/tick";

// the card's countdown indicator, nothing once the time left is 0
export const CountdownBadge = ({
  bowId,
  equipmentId,
}: {
  bowId: number;
  equipmentId: number;
}) => {
  const q = useCountdownRemaining(bowId, equipmentId, true);
  const now = useNow();
  // a 0 reading means no countdown
  if (q.data === undefined || q.data.seconds === 0) {
    return null;
  }
  const leftMs = q.dataUpdatedAt + q.data.seconds * 1000 - now;
  if (leftMs <= 0) {
    return null;
  }
  return (
    <Badge
      color="blue"
      variant="light"
      size="lg"
      leftSection={<ClockIcon size={16} />}
      ff="monospace"
      tt="none"
      aria-label="Countdown remaining">
      {formatCountdown(leftMs)}
    </Badge>
  );
};
