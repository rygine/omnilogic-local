import {
  ActionIcon,
  Button,
  Group,
  Loader,
  Popover,
  Text,
  Tooltip,
} from "@mantine/core";
import { StarIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { useAddFavorite, useRemoveFavorite } from "@/client/mutations";
import { useFavorites } from "@/client/queries";

// a star for one favorite record, adding in one click and asking before removing
export const FavoriteStar = ({
  equipmentId,
  data = 0,
}: {
  equipmentId: number;
  data?: number;
}) => {
  const favorites = useFavorites();
  const addMut = useAddFavorite();
  const removeMut = useRemoveFavorite();
  const [confirming, setConfirming] = useState(false);

  const favorite = favorites.data?.find(
    (f) => f.equipmentId === equipmentId && f.data === data,
  );
  const isFavorite = favorite !== undefined;
  const pending = addMut.isPending || removeMut.isPending;

  if (pending) {
    return <Loader size="sm" />;
  }

  const star = (
    <ActionIcon
      variant={isFavorite ? "filled" : "subtle"}
      color="yellow"
      onClick={() => {
        if (favorite) {
          setConfirming((c) => !c);
        } else {
          addMut.mutate({ equipmentId, data });
        }
      }}
      aria-label={isFavorite ? "Remove favorite" : "Add favorite"}
      aria-pressed={isFavorite}>
      <StarIcon size={18} weight={isFavorite ? "fill" : "regular"} />
    </ActionIcon>
  );

  if (!favorite) {
    return (
      <Tooltip label="Add favorite" withArrow>
        {star}
      </Tooltip>
    );
  }

  return (
    <Popover
      opened={confirming}
      onChange={setConfirming}
      position="bottom"
      withArrow
      shadow="md"
      withinPortal>
      <Popover.Target>
        <Tooltip label="Remove favorite" withArrow disabled={confirming}>
          {star}
        </Tooltip>
      </Popover.Target>
      <Popover.Dropdown>
        <Text size="sm" mb="xs">
          Remove from favorites?
        </Text>
        <Group justify="flex-end" gap="xs">
          <Button
            size="xs"
            variant="default"
            onClick={() => setConfirming(false)}>
            Cancel
          </Button>
          <Button
            size="xs"
            color="red"
            onClick={() => {
              setConfirming(false);
              removeMut.mutate({ indexId: favorite.indexId });
            }}>
            Remove
          </Button>
        </Group>
      </Popover.Dropdown>
    </Popover>
  );
};
