import { Group, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";

import { deviceRows } from "@/client/equipment-rows";
import { useBows, useSystemState } from "@/client/queries";
import { Empty } from "@/components/Empty/Empty";
import { DeviceCard } from "@/components/EquipmentCard/DeviceCard";
import { ContentLayout } from "@/components/layout/ContentLayout";
import { LoadError } from "@/components/LoadError/LoadError";
import { SectionsSkeleton } from "@/components/Skeletons/SectionsSkeleton";
import { TemperatureReading } from "@/components/Temperature/TemperatureReading";
import type { BowDetail } from "@/server/serializers";

const Equipment = () => {
  const bows = useBows();
  const systemState = useSystemState();
  const navigate = useNavigate();

  const openDevice = (id: number) =>
    void navigate({
      to: "/equipment/$equipmentId",
      params: { equipmentId: String(id) },
    });

  return (
    <ContentLayout title="Equipment">
      {bows.isPending ? (
        <SectionsSkeleton cardHeight={116} cols={{ base: 1, sm: 2 }} />
      ) : bows.isError ? (
        <LoadError
          onRetry={() => void bows.refetch()}
          retrying={bows.isFetching}
        />
      ) : bows.data.length === 0 ? (
        <Empty of="bodies of water" />
      ) : (
        <Stack gap="xl">
          {systemState && (
            <Text c="dimmed" size="sm">
              {systemState === "Off"
                ? "The controller is off, so all equipment is off."
                : `The controller is in ${systemState.toLowerCase()}, so all equipment is off.`}
            </Text>
          )}
          {bows.data.map((bow) => (
            <BodySection key={bow.id} bow={bow} onSelect={openDevice} />
          ))}
        </Stack>
      )}
      {/* the control modal, a nested route */}
      <Outlet />
    </ContentLayout>
  );
};

const BodySection = ({
  bow,
  onSelect,
}: {
  bow: BowDetail;
  onSelect: (id: number) => void;
}) => {
  const rows = deviceRows(bow);
  return (
    <Stack gap="sm">
      <Group gap="sm" align="center">
        <Title order={3}>{bow.name}</Title>
        {bow.waterTemp != null && <TemperatureReading value={bow.waterTemp} />}
      </Group>
      {rows.length === 0 ? (
        <Empty of={`${bow.name} equipment`} />
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
          {rows.map((r) => (
            <DeviceCard
              key={`${r.kind}-${r.id}`}
              bow={bow}
              row={r}
              onSelect={() => onSelect(r.id)}
            />
          ))}
        </SimpleGrid>
      )}
    </Stack>
  );
};

export const Route = createFileRoute("/equipment")({
  component: Equipment,
  head: () => ({ meta: [{ title: "OmniLogicLocal - Equipment" }] }),
});
