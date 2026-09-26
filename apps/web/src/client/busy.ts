import { useState } from "react";

import { useWorldUpdatedAt } from "@/client/queries";
import { useNow } from "@/client/tick";
import type { FilterDetail } from "@/server/serializers";

// whether the pumps are busy, and the ms left in their busy window
export const usePumpBusy = (
  filter: Pick<FilterDetail, "busyForMs">,
): { busy: boolean; leftMs: number } => {
  const now = useNow();
  const [mounted] = useState(() => Date.now());
  const readAt = useWorldUpdatedAt() ?? mounted;
  const leftMs =
    filter.busyForMs === null ? 0 : readAt + filter.busyForMs - now;
  return { busy: leftMs > 0, leftMs };
};
