import { Box, SimpleGrid, Skeleton, Stack, Text } from "@mantine/core";
import type { SysInfo } from "@rygine/omnilogic-local-sdk";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { hasSettings, useSettings } from "@/client/settings";
import { ControllerSettings } from "@/components/ControllerSettings/ControllerSettings";
import { ContentLayout } from "@/components/layout/ContentLayout";
import { LoadError } from "@/components/LoadError/LoadError";
import { SectionHeader } from "@/components/SectionHeader/SectionHeader";
import { StoredMeta } from "@/components/StoredMeta/StoredMeta";
import { Temperature } from "@/components/Temperature/Temperature";
import { tileSizeOf } from "@/components/Tiles/tile-size";
import { CornerTile, TileGrid, Tiles } from "@/components/Tiles/Tiles";
import type { SettingRow, SettingsGroup } from "@/server/config-settings";
import { getControllerSettings } from "@/server/fns/config-settings";
import { getSystem, getSystemInventory } from "@/server/fns/system";
import type { SystemInfo } from "@/server/serializers";

const SystemPage = () => {
  const settings = useSettings();

  const q = useQuery({
    queryKey: ["system", settings.host, settings.port],
    queryFn: () => getSystem({ data: settings }),
    enabled: hasSettings(settings),
  });
  const controller = useQuery({
    queryKey: ["controller-settings", settings.host, settings.port],
    queryFn: () => getControllerSettings({ data: settings }),
    enabled: hasSettings(settings),
  });
  // the board inventory is kept in the database, Refresh asks the controller again
  const queryClient = useQueryClient();
  const inventoryKey = ["system-inventory", settings.host, settings.port];
  const inventory = useQuery({
    queryKey: inventoryKey,
    queryFn: () => getSystemInventory({ data: settings }),
    enabled: hasSettings(settings),
    staleTime: Infinity,
  });
  const refreshInventory = useMutation({
    mutationFn: () =>
      getSystemInventory({ data: { ...settings, refresh: true } }),
    onSuccess: (data) => queryClient.setQueryData(inventoryKey, data),
  });

  // the config's own System rows join the facts at the top
  const systemRows =
    controller.data?.groups.find((g) => !isNotSystem(g))?.rows ?? [];

  return (
    <ContentLayout title="System">
      {q.isPending ? (
        <VerticalTableSkeleton rows={6} />
      ) : q.isError ? (
        <LoadError onRetry={() => void q.refetch()} retrying={q.isFetching} />
      ) : (
        <SystemFacts info={q.data} extra={systemRows} />
      )}

      <Box mt="xl">
        <SectionHeader
          title="Components"
          order={4}
          aside={
            inventory.data && (
              <StoredMeta
                readAt={inventory.data.readAt}
                refreshing={refreshInventory.isPending}
                onRefresh={() => refreshInventory.mutate()}
              />
            )
          }
        />
      </Box>
      {inventory.isPending ? (
        <ComponentsSkeleton />
      ) : inventory.isError ? (
        <LoadError
          onRetry={() => void inventory.refetch()}
          retrying={inventory.isFetching}
        />
      ) : (
        <Components info={inventory.data.info} />
      )}
      {refreshInventory.isError && (
        <Box mt="xs">
          <LoadError
            onRetry={() => refreshInventory.mutate()}
            retrying={refreshInventory.isPending}
          />
        </Box>
      )}

      {controller.isPending ? (
        <Box mt="xl">
          <GroupsSkeleton />
        </Box>
      ) : controller.isError ? (
        <Box mt="xl">
          <LoadError
            onRetry={() => void controller.refetch()}
            retrying={controller.isFetching}
          />
        </Box>
      ) : (
        <Box mt="xl">
          <ControllerSettings
            data={{ groups: controller.data.groups.filter(isNotSystem) }}
          />
        </Box>
      )}
    </ContentLayout>
  );
};

const isNotSystem = (g: SettingsGroup) => g.title !== "System";

const SystemFacts = ({
  info,
  extra,
}: {
  info: SystemInfo;
  // the config's System rows, appended under the live facts
  extra: SettingRow[];
}) => {
  const airTemp: ReactNode =
    info.backyard.airTemp === null ? (
      "—"
    ) : (
      <Temperature value={info.backyard.airTemp} />
    );
  const rows: [string, ReactNode][] = [
    [
      "Config checksum",
      info.configChecksum === undefined ? "—" : String(info.configChecksum),
    ],
    ["Backyard", info.backyard.name ?? "—"],
    ["Air temperature", airTemp],
    ...extra.map((r): [string, ReactNode] => [r.label, r.value]),
  ];

  return (
    <Tiles
      items={rows.map(([label, value]) => ({
        label,
        value,
        ...tileSizeOf(value),
      }))}
    />
  );
};

// one tile per board: the name in the middle, its details in the corners
const Components = ({ info }: { info: SysInfo }) => (
  <TileGrid minWidth={240}>
    {info.components.map((c) => (
      <CornerTile
        key={`${c.type}-${c.hua}`}
        value={c.devName}
        topLeft={c.type}
        topRight={c.nodeId === -1 ? undefined : `node ${String(c.nodeId)}`}
        bottomLeft={
          <Text component="span" ff="monospace" inherit>
            {c.version.trim()}
          </Text>
        }
        bottomRight={
          <Text component="span" ff="monospace" inherit>
            {c.hua}
          </Text>
        }
      />
    ))}
  </TileGrid>
);

// placeholders shaped like the content
const VerticalTableSkeleton = ({ rows }: { rows: number }) => (
  <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="xs">
    {Array.from({ length: rows }, (_, i) => (
      <Skeleton key={i} height={58} radius="md" />
    ))}
  </SimpleGrid>
);

const ComponentsSkeleton = () => (
  <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="xs">
    {Array.from({ length: 4 }, (_, i) => (
      <Skeleton key={i} height={92} radius="md" />
    ))}
  </SimpleGrid>
);

const GroupsSkeleton = () => (
  <Stack gap="lg">
    {[5, 4].map((rows, i) => (
      <div key={i}>
        <Skeleton height={14} width={120} mb="sm" radius="sm" />
        <VerticalTableSkeleton rows={rows} />
      </div>
    ))}
  </Stack>
);

export const Route = createFileRoute("/system")({
  component: SystemPage,
  head: () => ({ meta: [{ title: "OmniLogicLocal - System" }] }),
});
