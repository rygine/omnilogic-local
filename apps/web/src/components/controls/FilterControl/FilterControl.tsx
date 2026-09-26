import { Button, Group, Stack, Text } from "@mantine/core";
import { useState } from "react";

import { usePumpBusy } from "@/client/busy";
import { useSetEquipmentOn, useSetFilterSpeed } from "@/client/mutations";
import { formatCountdown } from "@/client/tick";
import { CountdownTimer } from "@/components/controls/CountdownTimer/CountdownTimer";
import { ViewDiagnosticsLink } from "@/components/controls/DiagnosticsPanel/ViewDiagnosticsLink";
import { PowerButton } from "@/components/controls/PowerButton/PowerButton";
import { FilterSpeedInput } from "@/components/EquipmentValue/FilterSpeedInput";
import { PercentInput } from "@/components/EquipmentValue/PercentInput";
import { useModalClose, useModalDirty } from "@/components/Modal/modal-state";
import type { FilterDetail } from "@/server/serializers";

export const FilterControl = ({
  bowId,
  filter,
}: {
  bowId: number;
  filter: FilterDetail;
}) => {
  const onMut = useSetEquipmentOn(bowId);
  const speedMut = useSetFilterSpeed(bowId);
  const close = useModalClose();
  // the slider starts at the live speed while on, else at the speed a turn-on resumes, Low when it has never run
  const resumeSpeed = filter.on
    ? filter.speed
    : filter.lastSpeed > 0
      ? filter.lastSpeed
      : (filter.presets?.low ?? filter.speed);
  // Apply commits the speed
  const [speed, setSpeed] = useState(resumeSpeed);
  useModalDirty(speed !== resumeSpeed);
  // the pumps take no command while one primes, nor for a grace period after
  const { busy, leftMs } = usePumpBusy(filter);
  const moving =
    filter.status === "Starting" ||
    filter.status === "Priming" ||
    filter.status === "Force Priming";

  // on resumes the last speed, off is the generic command
  const toggle = (on: boolean) => {
    if (on) {
      speedMut.mutate({ equipmentId: filter.id, speed: resumeSpeed });
    } else {
      onMut.mutate({ equipmentId: filter.id, on: false });
    }
  };

  return (
    <Stack gap="md">
      {filter.presets ? (
        <FilterSpeedInput
          presets={filter.presets}
          rpmRange={filter.rpmRange}
          speedRange={filter.speedRange}
          value={speed}
          onChange={setSpeed}
        />
      ) : (
        <PercentInput label="Speed" value={speed} onChange={setSpeed} />
      )}
      {busy && (
        <Text size="sm" c="dimmed">
          {moving
            ? `${filter.name || "The pump"} is ${filter.status.toLowerCase()}.`
            : "The pumps are settling after a start."}{" "}
          Controls return in {formatCountdown(leftMs)}.
        </Text>
      )}
      <ViewDiagnosticsLink />
      {/* runs at the speed selected above */}
      <CountdownTimer
        bowId={bowId}
        equipmentId={filter.id}
        target="equipment"
        value={speed > 0 ? speed : resumeSpeed}
        on={filter.on}
        active={filter.countdown}
        onCancel={() =>
          onMut.mutateAsync({ equipmentId: filter.id, on: false })
        }
        cancelPending={onMut.isPending}
        disabled={busy}
      />

      <Group justify="space-between">
        <PowerButton
          on={filter.on}
          pending={onMut.isPending || speedMut.isPending}
          disabled={busy}
          onToggle={toggle}
        />
        <Button
          onClick={() => {
            speedMut.mutate({ equipmentId: filter.id, speed });
            close();
          }}
          loading={speedMut.isPending}
          disabled={busy || speed === resumeSpeed}>
          Apply
        </Button>
      </Group>
    </Stack>
  );
};
