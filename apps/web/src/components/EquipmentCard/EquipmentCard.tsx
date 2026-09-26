import {
  Group,
  Text,
  Tooltip,
  UnstyledButton,
  VisuallyHidden,
} from "@mantine/core";
import { CalendarIcon, StarIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import type { DeviceRow } from "@/client/equipment-rows";

import styles from "./EquipmentCard.module.css";

// a device as a card that opens its controls, colored when on
type CardMarkers = {
  favorite?: boolean;
  // how many schedules drive this device, nothing shown for 0 or undefined
  schedules?: number;
};

export const EquipmentCard = ({
  device,
  onSelect,
  extra,
  markers,
}: {
  device: DeviceRow;
  onSelect: () => void;
  extra?: ReactNode;
  markers?: CardMarkers;
}) => {
  const scheduleCount = markers?.schedules ?? 0;
  const scheduleLabel =
    scheduleCount === 1
      ? "On a schedule"
      : `On ${String(scheduleCount)} schedules`;
  const status = device.statusLabel ?? (device.on ? "On" : "Off");
  const statusDetail = status === "On" || status === "Off" ? null : status;
  const detail =
    statusDetail === null
      ? device.detail
      : device.detail === null
        ? statusDetail
        : `${statusDetail} · ${device.detail}`;
  return (
    <div className={styles.container}>
      <UnstyledButton
        className={styles.card}
        data-on={device.on || undefined}
        onClick={onSelect}>
        <div className={styles.main}>
          <Text fw={600} className={styles.name}>
            {device.name}
            {/* the color's word, for screen readers */}
            {statusDetail === null && <VisuallyHidden>{status}</VisuallyHidden>}
          </Text>
          <Group gap={6} wrap="nowrap" align="center" style={{ flexShrink: 0 }}>
            <Text
              size="xs"
              c="dimmed"
              tt="uppercase"
              fw={600}
              truncate
              maw="12rem">
              {device.label}
            </Text>
            {markers?.favorite && (
              <Tooltip label="Favorite" withArrow>
                <StarIcon
                  size={14}
                  weight="fill"
                  color="var(--mantine-color-yellow-6)"
                  aria-label="Favorite"
                  role="img"
                  style={{ flexShrink: 0 }}
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
                  style={{ flexShrink: 0 }}
                />
              </Tooltip>
            )}
          </Group>
        </div>
        {(device.value !== null || detail !== null) && (
          <div className={styles.readout}>
            {device.valueLabel && device.value !== null && (
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                {device.valueLabel}
              </Text>
            )}
            {device.value !== null && (
              <Text className={styles.value}>{device.value}</Text>
            )}
            {detail !== null && (
              <Text size="xs" c="dimmed">
                {detail}
              </Text>
            )}
          </div>
        )}
        {extra}
      </UnstyledButton>
    </div>
  );
};
