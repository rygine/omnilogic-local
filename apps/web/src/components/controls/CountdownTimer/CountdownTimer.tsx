import { Divider, Stack, Text } from "@mantine/core";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { clearCountdownTimers } from "@/client/countdown-timers";
import { useStartCountdown } from "@/client/mutations";
import { countdownQueryKey, useCountdownRemaining } from "@/client/queries";
import { useSettings } from "@/client/settings";
import { useNow } from "@/client/tick";

import { CountdownRunning } from "./CountdownRunning";
import { DurationPicker } from "./DurationPicker";

// a duration and Start when idle, the time left and Cancel while running
export const CountdownTimer = ({
  bowId,
  equipmentId,
  target,
  value,
  on,
  active,
  onCancel,
  cancelPending = false,
  disabled = false,
}: {
  bowId: number;
  equipmentId: number;
  target: "equipment" | "spillover";
  // the value the countdown runs at
  value: number;
  on: boolean;
  // telemetry's countdown flag, undefined for a light
  active: boolean | undefined;
  // the ordinary off, the countdown clears once it resolves
  onCancel: () => Promise<unknown> | void;
  cancelPending?: boolean;
  // the equipment is between states: no start until it settles
  disabled?: boolean;
}) => {
  const startMut = useStartCountdown(bowId);
  const qc = useQueryClient();
  const { host, port } = useSettings();
  const countdownKey = countdownQueryKey(host, port, bowId, equipmentId);
  // a countdown this section started, until the controller confirms it
  const [started, setStarted] = useState<{
    at: number;
    endsAt: number;
  } | null>(null);
  const now = useNow();
  const remaining = useCountdownRemaining(
    bowId,
    equipmentId,
    (on && active !== false) || started !== null,
  );

  // a 0 reading means no countdown
  const controllerLeft =
    remaining.data === undefined
      ? null
      : remaining.data.seconds === 0
        ? 0
        : remaining.dataUpdatedAt + remaining.data.seconds * 1000 - now;
  const controllerSettled =
    remaining.data !== undefined &&
    started !== null &&
    remaining.dataUpdatedAt > started.at + 15_000;
  const localLeft =
    started !== null && !controllerSettled ? started.endsAt - now : 0;
  const leftMs = Math.max(controllerLeft ?? 0, localLeft);
  // telemetry's flag stands in only until the controller has answered
  const running =
    leftMs > 0 || (on && active === true && remaining.data === undefined);

  const start = (hours: number, minutes: number) =>
    startMut.mutate(
      { equipmentId, target, value, hours, minutes },
      {
        onSuccess: () => {
          const at = Date.now();
          setStarted({ at, endsAt: at + (hours * 60 + minutes) * 60_000 });
        },
      },
    );

  // a refused off leaves the device counting down
  const cancel = async () => {
    try {
      await onCancel();
    } catch {
      return;
    }
    setStarted(null);
    // the previous run's follow-ups must not fire into whatever starts next
    clearCountdownTimers(countdownKey);
    // the card's badge reads the same query
    qc.setQueryData(countdownKey, { seconds: 0 });
  };

  return (
    <Stack gap="xs">
      <Divider />
      <Text size="xs" c="dimmed" fw={600} tt="uppercase">
        Countdown timer
      </Text>
      {running ? (
        <CountdownRunning
          leftMs={leftMs}
          onCancel={() => void cancel()}
          pending={cancelPending}
          disabled={disabled}
        />
      ) : (
        <DurationPicker
          onStart={start}
          pending={startMut.isPending}
          disabled={disabled}
        />
      )}
      <Divider />
    </Stack>
  );
};
