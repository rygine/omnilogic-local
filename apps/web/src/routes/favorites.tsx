import { Button, Group, SimpleGrid, Stack, Title } from "@mantine/core";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { favoriteRows, themeFavoriteRows } from "@/client/favorites";
import { useBows, useFavorites } from "@/client/queries";
import { hasSettings, useSettings } from "@/client/settings";
import { useThemes } from "@/client/themes";
import { Empty } from "@/components/Empty/Empty";
import { DeviceCard } from "@/components/EquipmentCard/DeviceCard";
import { ContentLayout } from "@/components/layout/ContentLayout";
import { LoadError } from "@/components/LoadError/LoadError";
import { SectionsSkeleton } from "@/components/Skeletons/SectionsSkeleton";
import { TemperatureReading } from "@/components/Temperature/TemperatureReading";
import { ThemeCard } from "@/components/ThemeCard/ThemeCard";

// a section per body, then Themes
const Favorites = () => {
  const settings = useSettings();
  const favorites = useFavorites();
  const bows = useBows();
  const themes = useThemes();
  const navigate = useNavigate();

  if (!hasSettings(settings)) {
    return null;
  }

  const openDevice = (id: number) =>
    void navigate({
      to: "/favorites/$equipmentId",
      params: { equipmentId: String(id) },
    });

  const rows =
    favorites.data && bows.data ? favoriteRows(favorites.data, bows.data) : [];
  const themeRows =
    favorites.data && themes.data
      ? themeFavoriteRows(favorites.data, themes.data)
      : [];

  return (
    <ContentLayout title="Favorites">
      <Group justify="flex-end" mb="md">
        <Button onClick={() => void navigate({ to: "/favorites/new" })}>
          Add favorite
        </Button>
      </Group>
      {favorites.isPending || bows.isPending || themes.isPending ? (
        <SectionsSkeleton
          sections={3}
          cards={2}
          cardHeight={96}
          cols={{ base: 1, sm: 2 }}
        />
      ) : favorites.isError || bows.isError ? (
        <LoadError
          onRetry={() => {
            void favorites.refetch();
            void bows.refetch();
          }}
          retrying={favorites.isFetching || bows.isFetching}
        />
      ) : (
        <Stack gap="xl">
          {bows.data.map((bow) => {
            const bowRows = rows.filter((r) => r.bowId === bow.id);
            return (
              <Section
                key={bow.id}
                title={bow.name}
                aside={
                  bow.waterTemp != null && (
                    <TemperatureReading value={bow.waterTemp} />
                  )
                }
                empty={`${bow.name} favorites`}>
                {bowRows.map((row) => (
                  <DeviceCard
                    key={row.indexId}
                    bow={bow}
                    row={row.device}
                    onSelect={() => openDevice(row.device.id)}
                    favoriteMarker={false}
                  />
                ))}
              </Section>
            );
          })}
          <Section title="Themes" empty="theme favorites">
            {themeRows.map((row) => (
              <ThemeCard
                key={row.indexId}
                theme={row.theme}
                onSelect={() => openDevice(row.theme.id)}
              />
            ))}
          </Section>
        </Stack>
      )}
      {/* the add and control modals, nested routes */}
      <Outlet />
    </ContentLayout>
  );
};

// a titled section of cards, "No <empty>." for an empty list
const Section = ({
  title,
  aside,
  empty,
  children,
}: {
  title: string;
  aside?: ReactNode;
  empty: string;
  children: ReactNode[];
}) => (
  <Stack gap="sm">
    <Group gap="sm" align="center">
      <Title order={3}>{title}</Title>
      {aside}
    </Group>
    {children.length === 0 ? (
      <Empty of={empty} />
    ) : (
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
        {children}
      </SimpleGrid>
    )}
  </Stack>
);

export const Route = createFileRoute("/favorites")({
  component: Favorites,
  head: () => ({ meta: [{ title: "OmniLogic - Favorites" }] }),
});
