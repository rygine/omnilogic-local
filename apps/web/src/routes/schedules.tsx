import { Button, Group, Stack, Title } from "@mantine/core";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";

import { useBows, useSchedules } from "@/client/queries";
import { scheduleTargets } from "@/client/schedule-targets";
import { hasSettings, useSettings } from "@/client/settings";
import { useThemes } from "@/client/themes";
import { Empty } from "@/components/Empty/Empty";
import { ContentLayout } from "@/components/layout/ContentLayout";
import { LoadError } from "@/components/LoadError/LoadError";
import { ScheduleCard } from "@/components/ScheduleCard/ScheduleCard";
import { SectionsSkeleton } from "@/components/Skeletons/SectionsSkeleton";
import type { BowDetail, ScheduleSummary } from "@/server/serializers";

const Schedules = () => {
  const settings = useSettings();
  const q = useSchedules();
  const bows = useBows();
  const themes = useThemes();
  const navigate = useNavigate();

  if (!hasSettings(settings)) {
    return null;
  }

  const targets = bows.data ? scheduleTargets(bows.data, themes.data) : [];
  const openSchedule = (id: number) =>
    void navigate({
      to: "/schedules/$scheduleId",
      params: { scheduleId: String(id) },
    });

  return (
    <ContentLayout title="Schedules">
      <Group justify="flex-end" mb="md">
        <Button
          onClick={() => void navigate({ to: "/schedules/new" })}
          disabled={targets.length === 0}>
          New schedule
        </Button>
      </Group>
      {q.isPending || bows.isPending ? (
        <SectionsSkeleton cards={2} cardHeight={72} cols={1} />
      ) : q.isError || bows.isError ? (
        <LoadError
          onRetry={() => {
            void q.refetch();
            void bows.refetch();
          }}
          retrying={q.isFetching || bows.isFetching}
        />
      ) : (
        <BodyGroups
          bows={bows.data}
          schedules={q.data}
          onSelect={openSchedule}
        />
      )}
      {/* the create and edit modals, nested routes */}
      <Outlet />
    </ContentLayout>
  );
};

const BodyGroups = ({
  bows,
  schedules,
  onSelect,
}: {
  bows: BowDetail[];
  schedules: ScheduleSummary[];
  onSelect: (id: number) => void;
}) => {
  // a theme's schedule belongs to no body, and one whose body is gone shows under "Other"
  const orphans = schedules.filter(
    (s) => s.kind !== "theme" && !bows.some((b) => b.id === s.bodyId),
  );
  return (
    <Stack gap="xl">
      {bows.map((bow) => (
        <BodySection
          key={bow.id}
          name={bow.name}
          items={schedules.filter((s) => s.bodyId === bow.id)}
          onSelect={onSelect}
        />
      ))}
      <BodySection
        name="Themes"
        empty="theme schedules"
        items={schedules.filter((s) => s.kind === "theme")}
        onSelect={onSelect}
      />
      {orphans.length > 0 && (
        <BodySection name="Other" items={orphans} onSelect={onSelect} />
      )}
    </Stack>
  );
};

const BodySection = ({
  name,
  empty = `${name} schedules`,
  items,
  onSelect,
}: {
  name: string;
  empty?: string;
  items: ScheduleSummary[];
  onSelect: (id: number) => void;
}) => (
  <Stack gap="sm">
    <Title order={3}>{name}</Title>
    {items.length === 0 ? (
      <Empty of={empty} />
    ) : (
      <Stack gap="xs">
        {items.map((s) => (
          <ScheduleCard
            key={s.id}
            schedule={s}
            onSelect={() => onSelect(s.id)}
          />
        ))}
      </Stack>
    )}
  </Stack>
);

export const Route = createFileRoute("/schedules")({
  component: Schedules,
  head: () => ({ meta: [{ title: "OmniLogic - Schedules" }] }),
});
