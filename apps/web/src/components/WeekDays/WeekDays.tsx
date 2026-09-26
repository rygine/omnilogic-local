import { Box, Group, UnstyledButton } from "@mantine/core";

import { WEEK_DAY_LETTERS } from "@/client/schedule-format";

import styles from "./WeekDays.module.css";

// the seven days as letter circles, buttons when toggleable
export const WeekDays = ({
  mask,
  onToggle,
  size = "sm",
}: {
  mask: number;
  onToggle?: (index: number) => void;
  size?: "sm" | "lg";
}) => (
  <Group
    gap={size === "lg" ? 8 : 4}
    wrap="nowrap"
    className={styles.days}
    data-size={size}>
    {WEEK_DAY_LETTERS.map((letter, i) => {
      const on = (mask & (1 << i)) !== 0;
      return onToggle ? (
        <UnstyledButton
          key={i}
          className={styles.day}
          data-on={on || undefined}
          aria-pressed={on}
          aria-label={`Toggle day ${i + 1}`}
          onClick={() => onToggle(i)}>
          {letter}
        </UnstyledButton>
      ) : (
        <Box key={i} className={styles.day} data-on={on || undefined}>
          {letter}
        </Box>
      );
    })}
  </Group>
);
