import type { ScheduleType } from "@rygine/omnilogic-local-sdk";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { useBows } from "@/client/queries";
import { scheduleTargets } from "@/client/schedule-targets";
import { useThemes } from "@/client/themes";
import { ScheduleCreate } from "@/components/controls/ScheduleControl/ScheduleCreate";
import { useModalClose } from "@/components/Modal/modal-state";
import { ResponsiveModal } from "@/components/Modal/ResponsiveModal";
import { SectionsSkeleton } from "@/components/Skeletons/SectionsSkeleton";
import { isOneOf } from "@/shared/guards";

const NewSchedule = () => {
  const navigate = useNavigate();
  return (
    <ResponsiveModal
      size="md"
      title="New schedule"
      onExited={() => void navigate({ to: "/schedules" })}>
      <NewScheduleBody />
    </ResponsiveModal>
  );
};

const NewScheduleBody = () => {
  const bows = useBows();
  const themes = useThemes();
  const close = useModalClose();
  const { equipment, type } = Route.useSearch();
  // ScheduleCreate reads its targets once, on open
  if (bows.isPending || themes.isPending) {
    return <SectionsSkeleton sections={1} cards={2} cardHeight={64} cols={1} />;
  }
  const targets = bows.data ? scheduleTargets(bows.data, themes.data) : [];
  return (
    <ScheduleCreate
      targets={targets}
      initialEquipmentId={equipment}
      initialType={type}
      onDone={close}
    />
  );
};

// the kinds of schedule the SDK creates, mirrors its SCHEDULE_TYPE keys
const SCHEDULE_TYPES = [
  "equipment",
  "spillover",
  "theme",
] satisfies ScheduleType[];
const isScheduleType = isOneOf(SCHEDULE_TYPES);

export const Route = createFileRoute("/schedules/new")({
  component: NewSchedule,
  // ?equipment pre-selects a piece of equipment, &type=spillover its spillover target
  validateSearch: (
    search: Record<string, unknown>,
  ): { equipment?: number; type?: ScheduleType } => {
    const e = Number(search.equipment);
    return {
      ...(Number.isFinite(e) && e > 0 ? { equipment: e } : {}),
      ...(isScheduleType(search.type) ? { type: search.type } : {}),
    };
  },
});
