import { SimpleGrid, Stack, Text, UnstyledButton } from "@mantine/core";

import { favoritableDevices, type FavoriteTarget } from "@/client/favorites";
import { useAddFavorite } from "@/client/mutations";
import { useBows, useFavorites } from "@/client/queries";

import styles from "./FavoritePicker.module.css";

// every device not yet favorited, picking one creates its record and closes
export const FavoritePicker = ({ onDone }: { onDone: () => void }) => {
  const bows = useBows();
  const favorites = useFavorites();
  const addMut = useAddFavorite();

  const picks =
    bows.data && favorites.data
      ? favoritableDevices(favorites.data, bows.data)
      : [];

  const add = (target: FavoriteTarget) =>
    addMut.mutate(target, { onSuccess: onDone });

  return (
    <Stack gap="md">
      {picks.length === 0 ? (
        <Text c="dimmed" size="sm">
          Every piece of equipment is already favorited.
        </Text>
      ) : (
        // one group per body
        <Stack gap="md">
          {[...new Set(picks.map((p) => p.bowId))].map((bowId) => {
            const body = picks.filter((p) => p.bowId === bowId);
            return (
              <Stack key={bowId} gap="xs">
                <Text size="sm" fw={700}>
                  {body[0]!.bodyName}
                </Text>
                <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="xs">
                  {body.map(({ device, favorite }) => (
                    <UnstyledButton
                      key={`${device.kind}-${device.id}`}
                      className={styles.row}
                      disabled={addMut.isPending}
                      onClick={() => add(favorite)}>
                      <div>
                        <Text fw={600} lineClamp={1}>
                          {device.name}
                        </Text>
                        <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                          {device.label}
                        </Text>
                      </div>
                      {device.value !== null && (
                        <Text size="sm" c="dimmed">
                          {device.value}
                        </Text>
                      )}
                    </UnstyledButton>
                  ))}
                </SimpleGrid>
              </Stack>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
};
