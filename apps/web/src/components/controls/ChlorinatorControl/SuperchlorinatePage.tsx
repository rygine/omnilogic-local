import { Alert, Button, Group, NumberInput, Stack, Text } from "@mantine/core";
import { InfoIcon } from "@phosphor-icons/react";
import { useState } from "react";

import {
  useStartSuperchlorinate,
  useStopSuperchlorinate,
} from "@/client/mutations";
import { inputNumber } from "@/client/number-input";
import { useSuperchlorinateCountdown } from "@/client/queries";
import { useModalClose, useModalDirty } from "@/components/Modal/modal-state";

const PUMP_WARNING = "When superchlorination ends, the filter pump turns off.";

// ticks each second between polls
const Countdown = ({ bowId }: { bowId: number }) => {
  const remaining = useSuperchlorinateCountdown(bowId, true);
  return (
    <Text fz="2rem" fw={700} lh={1}>
      {remaining ?? "—"}
    </Text>
  );
};

// the countdown and Stop while running, else a duration and Start
export const SuperchlorinatePage = ({
  bowId,
  superchlorinating,
}: {
  bowId: number;
  superchlorinating: boolean;
}) => {
  const close = useModalClose();
  const [hours, setHours] = useState(1);
  // the duration is a draft until Start
  useModalDirty(!superchlorinating && hours !== 1);
  const startMut = useStartSuperchlorinate(bowId);
  const stopMut = useStopSuperchlorinate(bowId);

  const warning = (
    <Alert variant="light" color="blue" icon={<InfoIcon size={18} />} p="xs">
      {PUMP_WARNING}
    </Alert>
  );

  if (superchlorinating) {
    return (
      <Stack gap="md" align="center">
        {warning}
        <Text size="xs" c="dimmed" fw={600} tt="uppercase">
          Time remaining
        </Text>
        <Countdown bowId={bowId} />
        <Button
          color="red"
          variant="light"
          loading={stopMut.isPending}
          onClick={() => stopMut.mutate()}>
          Stop
        </Button>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      {warning}
      <Group align="center" justify="space-between" wrap="nowrap">
        <Text fw={500}>Duration (hours)</Text>
        <Group align="center" gap="sm" wrap="nowrap">
          <NumberInput
            w={90}
            min={1}
            max={96}
            step={1}
            allowDecimal={false}
            aria-label="Duration in hours"
            value={hours}
            onChange={(v) => setHours(inputNumber(v, 1))}
          />
          <Button
            loading={startMut.isPending}
            onClick={() => startMut.mutate({ hours }, { onSuccess: close })}>
            Start
          </Button>
        </Group>
      </Group>
    </Stack>
  );
};
