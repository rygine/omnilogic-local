import { Button, Group, Stack, Text } from "@mantine/core";
import { useState } from "react";

import { usePumpBusy } from "@/client/busy";
import { useSetSpillover } from "@/client/mutations";
import { formatCountdown } from "@/client/tick";
import { CountdownTimer } from "@/components/controls/CountdownTimer/CountdownTimer";
import { ViewDiagnosticsLink } from "@/components/controls/DiagnosticsPanel/ViewDiagnosticsLink";
import { PowerButton } from "@/components/controls/PowerButton/PowerButton";
import { FilterSpeedInput } from "@/components/EquipmentValue/FilterSpeedInput";
import { PercentInput } from "@/components/EquipmentValue/PercentInput";
import { useModalClose, useModalDirty } from "@/components/Modal/modal-state";
import type { FilterDetail, SpilloverDetail } from "@/server/serializers";

// the body's filter pump with the return valve to the spa, on sends the speed and off sends 0
export const SpilloverControl = ({
  bowId,
  filter,
  spillover,
}: {
  bowId: number;
  // the body's filter, the pump spillover runs
  filter: Pick<FilterDetail, "id" | "busyForMs">;
  spillover: SpilloverDetail;
}) => {
  const mut = useSetSpillover(bowId);
  const close = useModalClose();
  // the slider starts at the live speed while on, else at the speed a turn-on resumes, Low when it has never run
  const resumeSpeed = spillover.on
    ? spillover.speed
    : spillover.lastSpeed > 0
      ? spillover.lastSpeed
      : (spillover.presets?.low ?? spillover.speed);
  // Apply commits the speed
  const [speed, setSpeed] = useState(resumeSpeed);
  useModalDirty(speed !== resumeSpeed);
  const { busy, leftMs } = usePumpBusy(filter);

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        Runs the pump with the return valve turned to the spa, so the spa spills
        into the pool.
      </Text>
      {spillover.presets ? (
        <FilterSpeedInput
          presets={spillover.presets}
          rpmRange={spillover.rpmRange}
          speedRange={spillover.speedRange}
          value={speed}
          onChange={setSpeed}
        />
      ) : (
        <PercentInput label="Speed" value={speed} onChange={setSpeed} />
      )}
      {busy && (
        <Text size="sm" c="dimmed">
          The pumps are settling after a start. Controls return in{" "}
          {formatCountdown(leftMs)}.
        </Text>
      )}
      <ViewDiagnosticsLink />
      {/* the filter's id is what the remaining time is read against */}
      <CountdownTimer
        bowId={bowId}
        equipmentId={filter.id}
        target="spillover"
        value={speed}
        on={spillover.on}
        active={spillover.countdown}
        onCancel={() => mut.mutateAsync({ on: false, speed })}
        cancelPending={mut.isPending}
        disabled={busy}
      />

      <Group justify="space-between">
        <PowerButton
          on={spillover.on}
          pending={mut.isPending}
          disabled={busy}
          onToggle={(on) => mut.mutate({ on, speed })}
        />
        <Button
          onClick={() => {
            mut.mutate({ on: true, speed });
            close();
          }}
          loading={mut.isPending}
          disabled={busy || !spillover.on || speed === resumeSpeed}>
          Apply
        </Button>
      </Group>
    </Stack>
  );
};
