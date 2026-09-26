import { Button } from "@mantine/core";

import { useSuperchlorinateCountdown } from "@/client/queries";

// the superchlorinate button, with the live countdown while a run is active
export const SuperchlorinateButton = ({
  bowId,
  superchlorinating,
  onClick,
}: {
  bowId: number;
  superchlorinating: boolean;
  onClick: () => void;
}) => {
  const remaining = useSuperchlorinateCountdown(bowId, superchlorinating);
  const label = superchlorinating
    ? remaining === null
      ? "Super chlorinating…"
      : `Super chlorinating · ${remaining}`
    : "Super chlorinate";
  return (
    <Button
      variant="outline"
      radius="xl"
      size="sm"
      color={superchlorinating ? "cyan" : undefined}
      onClick={onClick}>
      {label}
    </Button>
  );
};
