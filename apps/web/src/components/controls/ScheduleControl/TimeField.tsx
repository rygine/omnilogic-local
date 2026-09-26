import {
  ActionIcon,
  Group,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { ClockIcon, SunHorizonIcon } from "@phosphor-icons/react";

import styles from "./TimeField.module.css";

// a schedule endpoint: Sunrise, Sunset, or Clock, which reveals the time picker
export const TimeField = ({
  label,
  mode,
  time,
  onModeChange,
  onTimeChange,
}: {
  label: string;
  mode: string;
  time: string;
  onModeChange: (mode: string) => void;
  onTimeChange: (time: string) => void;
}) => {
  const sun = mode === "sunrise" || mode === "sunset";
  return (
    <Stack gap={6}>
      <Text size="sm" fw={500}>
        {label}
      </Text>
      {sun ? (
        <TextInput readOnly value={mode === "sunrise" ? "Sunrise" : "Sunset"} />
      ) : (
        <TextInput
          type="time"
          value={time}
          onChange={(e) => onTimeChange(e.currentTarget.value)}
        />
      )}
      <Group gap={2} justify="center">
        <Tooltip label="Sunrise" withArrow>
          <ActionIcon
            variant={mode === "sunrise" ? "filled" : "subtle"}
            color={mode === "sunrise" ? "blue" : "gray"}
            onClick={() => onModeChange("sunrise")}
            aria-label="Sunrise">
            <SunHorizonIcon size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Sunset" withArrow>
          <ActionIcon
            variant={mode === "sunset" ? "filled" : "subtle"}
            color={mode === "sunset" ? "blue" : "gray"}
            onClick={() => onModeChange("sunset")}
            aria-label="Sunset">
            <SunHorizonIcon size={18} className={styles.sunset} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Custom time" withArrow>
          <ActionIcon
            variant={mode === "clock" ? "filled" : "subtle"}
            color={mode === "clock" ? "blue" : "gray"}
            onClick={() => onModeChange("clock")}
            aria-label="Custom time">
            <ClockIcon size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Stack>
  );
};
