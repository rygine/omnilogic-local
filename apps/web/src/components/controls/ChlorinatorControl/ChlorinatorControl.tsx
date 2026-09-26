import { Button, Divider, Group, Stack, Text } from "@mantine/core";
import { useState } from "react";

import {
  useSetChlorinatorEnable,
  useSetChlorinatorOutput,
} from "@/client/mutations";
import { SuperchlorinateButton } from "@/components/controls/ChlorinatorControl/SuperchlorinateButton";
import { useDiagnosticsTarget } from "@/components/controls/DiagnosticsPanel/DiagnosticsTargetContext";
import { ViewDiagnosticsButton } from "@/components/controls/DiagnosticsPanel/ViewDiagnosticsButton";
import { PowerButton } from "@/components/controls/PowerButton/PowerButton";
import { PercentSlider } from "@/components/EquipmentValue/PercentSlider";
import { useModalClose, useModalDirty } from "@/components/Modal/modal-state";
import type { ChlorinatorDetail } from "@/server/serializers";

const SaltReading = ({ label, ppm }: { label: string; ppm: number }) => (
  <Stack gap={0} align="center">
    <Text size="xs" c="dimmed" fw={600} tt="uppercase">
      {label}
    </Text>
    <Text fz="1.5rem" fw={700} lh={1.2}>
      {ppm} ppm
    </Text>
  </Stack>
);

export const ChlorinatorControl = ({
  bowId,
  chlorinator,
  onSuperchlorinate,
}: {
  bowId: number;
  chlorinator: ChlorinatorDetail;
  onSuperchlorinate?: () => void;
}) => {
  const enableMut = useSetChlorinatorEnable(bowId);
  const outputMut = useSetChlorinatorOutput(bowId);
  const close = useModalClose();
  const hasDiagnostics = useDiagnosticsTarget() !== undefined;
  // Apply commits the output
  const [output, setOutput] = useState(chlorinator.outputPercent);
  useModalDirty(output !== chlorinator.outputPercent);

  return (
    <Stack gap="md">
      <PercentSlider label="Output" value={output} onChange={setOutput} />

      <div>
        <Divider mb="md" />
        <Group grow>
          <SaltReading label="Average Salt" ppm={chlorinator.avgSalt} />
          <SaltReading label="Instant Salt" ppm={chlorinator.instantSalt} />
        </Group>
        <Divider mt="md" />
      </div>

      {(onSuperchlorinate || hasDiagnostics) && (
        <Group justify="center" gap="sm">
          {onSuperchlorinate && (
            <SuperchlorinateButton
              bowId={bowId}
              superchlorinating={chlorinator.superchlorinating}
              onClick={onSuperchlorinate}
            />
          )}
          <ViewDiagnosticsButton />
        </Group>
      )}

      <Group justify="space-between">
        <PowerButton
          on={chlorinator.active}
          pending={enableMut.isPending}
          onToggle={(enabled) => enableMut.mutate({ enabled })}
        />
        <Button
          onClick={() => {
            outputMut.mutate({ percent: output });
            close();
          }}
          loading={outputMut.isPending}
          disabled={output === chlorinator.outputPercent}>
          Apply
        </Button>
      </Group>
    </Stack>
  );
};
