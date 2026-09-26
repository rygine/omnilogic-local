import { ActionIcon, Group, Text, Tooltip } from "@mantine/core";
import { ArrowLeftIcon, CalendarPlusIcon } from "@phosphor-icons/react";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { controlTitle, resolveSelection } from "@/client/equipment-select";
import { useBows } from "@/client/queries";
import { SuperchlorinatePage } from "@/components/controls/ChlorinatorControl/SuperchlorinatePage";
import { DiagnosticsTargetContext } from "@/components/controls/DiagnosticsPanel/DiagnosticsTargetContext";
import { EquipmentControl } from "@/components/controls/EquipmentControl/EquipmentControl";
import { FavoriteStar } from "@/components/FavoriteStar/FavoriteStar";
import { ResponsiveModal } from "@/components/Modal/ResponsiveModal";
import { SectionsSkeleton } from "@/components/Skeletons/SectionsSkeleton";
import { SPILLOVER_FAVORITE_DATA } from "@/shared/spillover";

type View = "controls" | "superchlorinate";

// the device control as a routed modal on the Equipment and Favorites pages
export const EquipmentControlModal = ({
  equipmentId,
  onExited,
}: {
  equipmentId: number;
  onExited: () => void;
}) => {
  const navigate = useNavigate();
  const bows = useBows();
  const [view, setView] = useState<View>("controls");
  const selection = bows.data
    ? resolveSelection(bows.data, equipmentId)
    : undefined;
  const bow =
    selection && bows.data
      ? bows.data.find((b) => b.id === selection.bowId)
      : undefined;

  // spillover's schedule and favorite point at the body's filter
  const spilloverFilterId =
    selection?.kind === "spillover" ? bow?.filters[0]?.id : undefined;
  const favoriteTarget =
    selection?.kind === "spillover"
      ? spilloverFilterId === undefined
        ? undefined
        : { equipmentId: spilloverFilterId, data: SPILLOVER_FAVORITE_DATA }
      : { equipmentId, data: 0 };
  const scheduleSearch =
    selection?.kind === "spillover"
      ? spilloverFilterId === undefined
        ? undefined
        : { equipment: spilloverFilterId, type: "spillover" as const }
      : { equipment: equipmentId };
  // spillover shares the filter's diagnostics, the same pump
  const diagKind =
    selection?.kind === "filter" || selection?.kind === "spillover"
      ? "filter"
      : selection?.kind === "chlorinator"
        ? "chlorinator"
        : undefined;
  const chlorinator =
    selection?.kind === "chlorinator"
      ? bow?.chlorinators.find((c) => c.id === selection.id)
      : undefined;
  // slider and grid controls need a defined width, buttons fit their content
  const wide =
    selection?.kind === "filter" ||
    selection?.kind === "chlorinator" ||
    selection?.kind === "light" ||
    selection?.kind === "heater" ||
    selection?.kind === "spillover";

  const controlsTitle =
    selection && bow ? (
      <Group gap="xs" wrap="nowrap">
        {controlTitle(bow, selection)}
        <Group gap={2} wrap="nowrap">
          {favoriteTarget && (
            <FavoriteStar
              equipmentId={favoriteTarget.equipmentId}
              data={favoriteTarget.data}
            />
          )}
          {scheduleSearch && (
            <Tooltip label="Add to a schedule" withArrow>
              <ActionIcon
                variant="subtle"
                color="gray"
                aria-label="Add to a schedule"
                onClick={() =>
                  void navigate({
                    to: "/schedules/new",
                    search: scheduleSearch,
                  })
                }>
                <CalendarPlusIcon size={18} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      </Group>
    ) : (
      "Equipment"
    );

  const backTitle = (label: string) =>
    selection && bow ? (
      <Group gap="xs" wrap="nowrap">
        <ActionIcon
          variant="subtle"
          color="gray"
          aria-label="Back to controls"
          onClick={() => setView("controls")}>
          <ArrowLeftIcon size={18} />
        </ActionIcon>
        {controlTitle(bow, selection)} · {label}
      </Group>
    ) : (
      label
    );

  const title =
    view === "superchlorinate" && chlorinator
      ? backTitle("Super chlorinate")
      : controlsTitle;

  const body = () => {
    // a pending world says nothing about the device, only a settled one can
    if (bows.isPending) {
      return (
        <SectionsSkeleton sections={1} cards={2} cardHeight={64} cols={1} />
      );
    }
    if (!selection || !bow) {
      return <Text c="dimmed">This equipment is no longer available.</Text>;
    }
    if (view === "superchlorinate" && chlorinator) {
      return (
        <SuperchlorinatePage
          bowId={selection.bowId}
          superchlorinating={chlorinator.superchlorinating}
        />
      );
    }
    return (
      <DiagnosticsTargetContext.Provider
        value={
          diagKind ? { kind: diagKind, bowId: selection.bowId } : undefined
        }>
        <EquipmentControl
          bow={bow}
          selection={selection}
          onSuperchlorinate={
            chlorinator ? () => setView("superchlorinate") : undefined
          }
        />
      </DiagnosticsTargetContext.Provider>
    );
  };

  return (
    <ResponsiveModal
      size={wide ? "md" : "auto"}
      title={title}
      onExited={onExited}
      closeButton>
      {body()}
    </ResponsiveModal>
  );
};
