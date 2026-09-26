import {
  Group,
  Text,
  Tooltip,
  UnstyledButton,
  VisuallyHidden,
} from "@mantine/core";
import { CalendarIcon, StarIcon } from "@phosphor-icons/react";

import { useSchedules } from "@/client/queries";
import type { ThemeSummary } from "@/server/serializers";

import styles from "./ThemeCard.module.css";

// a theme as a card that opens its modal, green when active
export const ThemeCard = ({
  theme,
  onSelect,
  favorite = false,
}: {
  theme: ThemeSummary;
  onSelect: () => void;
  favorite?: boolean;
}) => {
  const schedules = useSchedules();
  const scheduleCount =
    schedules.data?.filter(
      (s) => s.kind === "theme" && s.equipmentId === theme.id,
    ).length ?? 0;
  const scheduleLabel =
    scheduleCount === 1
      ? "On a schedule"
      : `On ${String(scheduleCount)} schedules`;
  return (
    <div className={styles.container}>
      <UnstyledButton
        className={styles.card}
        data-on={theme.active || undefined}
        onClick={onSelect}>
        <div className={styles.main}>
          <Text fw={600} className={styles.name}>
            {theme.name}
            <VisuallyHidden>
              {theme.active ? "Active" : "Inactive"}
            </VisuallyHidden>
          </Text>
          <Group gap={6} wrap="nowrap" align="center">
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
              Theme
            </Text>
            {favorite && (
              <Tooltip label="Favorite" withArrow>
                <StarIcon
                  size={14}
                  weight="fill"
                  color="var(--mantine-color-yellow-6)"
                  aria-label="Favorite"
                  role="img"
                />
              </Tooltip>
            )}
            {scheduleCount > 0 && (
              <Tooltip label={scheduleLabel} withArrow>
                <CalendarIcon
                  size={14}
                  color="var(--mantine-color-dimmed)"
                  aria-label={scheduleLabel}
                  role="img"
                />
              </Tooltip>
            )}
          </Group>
        </div>
      </UnstyledButton>
    </div>
  );
};
