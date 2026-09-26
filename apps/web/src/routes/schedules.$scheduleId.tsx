import { Button, Group, Text } from "@mantine/core";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { useSchedules } from "@/client/queries";
import { ScheduleControl } from "@/components/controls/ScheduleControl/ScheduleControl";
import { useModalClose } from "@/components/Modal/modal-state";
import { ResponsiveModal } from "@/components/Modal/ResponsiveModal";
import { SectionsSkeleton } from "@/components/Skeletons/SectionsSkeleton";
import type { ScheduleSummary } from "@/server/serializers";

const EditSchedule = () => {
  const navigate = useNavigate();
  const { scheduleId } = Route.useParams();
  const q = useSchedules();
  const schedule = q.data?.find((s) => s.id === Number(scheduleId));
  const title = schedule ? (
    <Group gap="sm" wrap="nowrap" justify="space-between">
      {`${schedule.bodyName} · ${schedule.equipmentName}`}
      {schedule.kind === "theme" && (
        <Button
          size="compact-sm"
          variant="filled"
          renderRoot={(props) => (
            <Link
              to="/themes/$themeId"
              params={{ themeId: String(schedule.equipmentId) }}
              {...props}
            />
          )}>
          Open theme
        </Button>
      )}
    </Group>
  ) : (
    "Edit schedule"
  );

  return (
    <ResponsiveModal
      size="md"
      title={title}
      onExited={() => void navigate({ to: "/schedules" })}>
      {q.isPending ? (
        <SectionsSkeleton sections={1} cards={2} cardHeight={64} cols={1} />
      ) : schedule ? (
        <EditBody schedule={schedule} />
      ) : (
        <Text c="dimmed">This schedule no longer exists.</Text>
      )}
    </ResponsiveModal>
  );
};

const EditBody = ({ schedule }: { schedule: ScheduleSummary }) => {
  const close = useModalClose();
  return <ScheduleControl schedule={schedule} onDone={close} />;
};

export const Route = createFileRoute("/schedules/$scheduleId")({
  component: EditSchedule,
});
