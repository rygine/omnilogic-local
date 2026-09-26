import { Group, Stack, Text } from "@mantine/core";

import { useSetEquipmentOn } from "@/client/mutations";
import { PowerButton } from "@/components/controls/PowerButton/PowerButton";
import type { PumpDetail } from "@/server/serializers";
import { formatSpeed } from "@/shared/speed";

export const PumpControl = ({
  bowId,
  pump,
}: {
  bowId: number;
  pump: PumpDetail;
}) => {
  const onMut = useSetEquipmentOn(bowId);
  return (
    <Stack gap="md">
      {pump.speed != null && (
        <Group justify="space-between">
          <Text fw={500}>Speed</Text>
          <Text>{formatSpeed(pump.speed, pump.rpmRange, pump.speedRange)}</Text>
        </Group>
      )}
      <Group justify="center">
        <PowerButton
          on={pump.on}
          pending={onMut.isPending}
          onToggle={(on) => onMut.mutate({ equipmentId: pump.id, on })}
        />
      </Group>
    </Stack>
  );
};
