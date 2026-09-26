import { Loader, Switch, Text } from "@mantine/core";

import { useSetScheduleEnabled } from "@/client/mutations";
import { scheduleStatus, scheduleWindow } from "@/client/schedule-format";
import { WeekDays } from "@/components/WeekDays/WeekDays";
import type { ScheduleSummary } from "@/server/serializers";

import styles from "./ScheduleCard.module.css";

// the caption above the value, by kind
const valueCaption = (kind: ScheduleSummary["kind"]): string => {
  switch (kind) {
    case "filter":
    case "pump":
    case "spillover":
      return "Speed";
    case "chlorinator":
      return "Output";
    case "light":
      return "Show";
    case "heater":
      return "Set point";
    case "relay":
      return "Action";
    default:
      return "Value";
  }
};

// green only while running, the switch toggles enabled and the rest opens the editor
export const ScheduleCard = ({
  schedule: s,
  onSelect,
}: {
  schedule: ScheduleSummary;
  onSelect: () => void;
}) => {
  const enableMut = useSetScheduleEnabled();
  const status = scheduleStatus(s);
  return (
    <div className={styles.container}>
      <div className={styles.card} data-status={status}>
        <button
          type="button"
          className={styles.overlay}
          onClick={onSelect}
          aria-label={`Edit ${s.equipmentName} schedule`}
        />
        <div className={styles.main}>
          <Text fw={600} className={styles.name}>
            {s.equipmentName}
          </Text>
          <Text size="sm" c="dimmed">
            {scheduleWindow(s)}
          </Text>
        </div>
        {/* a theme's schedule has no setting to show */}
        {s.kind !== "theme" && (
          <div className={styles.value}>
            <Text size="xs" c="dimmed" fw={600} tt="uppercase">
              {valueCaption(s.kind)}
            </Text>
            <Text fz="1.5rem" fw={700} lh={1.2}>
              {s.value}
            </Text>
          </div>
        )}
        <div className={styles.days}>
          <WeekDays mask={s.daysActive} />
        </div>
        <div className={styles.control}>
          {enableMut.isPending ? (
            <Loader size="sm" />
          ) : (
            <Switch
              color="green"
              checked={s.enabled}
              onChange={(e) =>
                enableMut.mutate({
                  scheduleId: s.id,
                  enabled: e.currentTarget.checked,
                })
              }
              aria-label={`${s.enabled ? "Disable" : "Enable"} ${s.equipmentName} schedule`}
            />
          )}
        </div>
      </div>
    </div>
  );
};
