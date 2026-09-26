import { Badge } from "@mantine/core";

import { useSuperchlorinateCountdown } from "@/client/queries";

// the card's indicator for an active run, ticking each second
export const SuperchlorinateBadge = ({ bowId }: { bowId: number }) => {
  const remaining = useSuperchlorinateCountdown(bowId, true);
  return (
    <Badge color="cyan" variant="light">
      {remaining === null
        ? "Superchlorinating"
        : `Superchlorinating · ${remaining}`}
    </Badge>
  );
};
