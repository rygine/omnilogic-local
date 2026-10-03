import {
  Button,
  Group,
  Modal,
  ScrollArea,
  Skeleton,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { useBows, useFavorites } from "@/client/queries";
import { useCreateTheme, useThemes } from "@/client/themes";
import { Empty } from "@/components/Empty/Empty";
import { EquipmentList } from "@/components/EquipmentList/EquipmentList";
import { ContentLayout } from "@/components/layout/ContentLayout";
import { LoadError } from "@/components/LoadError/LoadError";
import { ThemeCard } from "@/components/ThemeCard/ThemeCard";
import { THEME_NAME_MAX, utf8Bytes } from "@/shared/names";
import { THEME_FAVORITE_DATA } from "@/shared/spillover";

const ThemesPage = () => {
  const navigate = useNavigate();

  const [createOpen, createModal] = useDisclosure(false);
  const [name, setName] = useState("");

  const q = useThemes();
  const bows = useBows();
  const favorites = useFavorites();
  const createMut = useCreateTheme();

  return (
    <ContentLayout title="Themes">
      <Group justify="flex-end" mb="md">
        <Button onClick={createModal.open} disabled={createMut.isPending}>
          New theme
        </Button>
      </Group>
      {q.isPending ? (
        <ThemesSkeleton />
      ) : q.isError ? (
        <LoadError onRetry={() => void q.refetch()} retrying={q.isFetching} />
      ) : q.data.length === 0 ? (
        <Empty of="themes" />
      ) : (
        <Stack gap="sm">
          {q.data.map((theme) => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              favorite={favorites.data?.some(
                (f) =>
                  f.equipmentId === theme.id && f.data === THEME_FAVORITE_DATA,
              )}
              onSelect={() =>
                void navigate({
                  to: "/themes/$themeId",
                  params: { themeId: String(theme.id) },
                })
              }
            />
          ))}
        </Stack>
      )}

      <Modal
        opened={createOpen}
        onClose={createModal.close}
        title="New theme"
        size="lg"
        centered>
        <Stack>
          <Text size="sm" c="dimmed">
            Saves your pool’s current live state as a new theme. The controller
            snapshots every device to flash — this takes ~15-20 seconds.
          </Text>
          <div>
            <Text size="sm" fw={500} mb={4}>
              Current state to be captured
            </Text>
            {bows.isPending ? (
              <Stack gap={6}>
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} height={28} radius="sm" />
                ))}
              </Stack>
            ) : bows.isError ? (
              <LoadError
                onRetry={() => void bows.refetch()}
                retrying={bows.isFetching}
              />
            ) : (
              <ScrollArea.Autosize mah={280}>
                <EquipmentList bows={bows.data} />
              </ScrollArea.Autosize>
            )}
          </div>
          <TextInput
            label="Name"
            placeholder="Evening"
            value={name}
            maxLength={THEME_NAME_MAX}
            description={`Up to ${THEME_NAME_MAX} characters`}
            onChange={(e) => setName(e.currentTarget.value)}
            data-autofocus
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={createModal.close}>
              Cancel
            </Button>
            <Button
              disabled={
                name.trim().length === 0 ||
                utf8Bytes(name.trim()) > THEME_NAME_MAX
              }
              onClick={() => {
                createMut.mutate(name.trim());
                setName("");
                createModal.close();
              }}>
              Save current state
            </Button>
          </Group>
        </Stack>
      </Modal>
      <Outlet />
    </ContentLayout>
  );
};

const ThemesSkeleton = () => (
  <Stack gap="sm">
    {Array.from({ length: 3 }, (_, i) => (
      <Skeleton key={i} height={58} radius="md" />
    ))}
  </Stack>
);

export const Route = createFileRoute("/themes")({
  component: ThemesPage,
  head: () => ({ meta: [{ title: "OmniLogicLocal - Themes" }] }),
});
