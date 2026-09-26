import { Group, Stack } from "@mantine/core";

import { useSetEquipmentOn } from "@/client/mutations";
import { CountdownTimer } from "@/components/controls/CountdownTimer/CountdownTimer";
import { PowerButton } from "@/components/controls/PowerButton/PowerButton";
import type { RelayDetail } from "@/server/serializers";

// on/off plus a countdown
export const RelayControl = ({
  bowId,
  relay,
}: {
  bowId: number;
  relay: RelayDetail;
}) => {
  const onMut = useSetEquipmentOn(bowId);
  return (
    <Stack gap="md">
      <CountdownTimer
        bowId={bowId}
        equipmentId={relay.id}
        target="equipment"
        value={1}
        on={relay.on}
        active={relay.countdown}
        onCancel={() => onMut.mutateAsync({ equipmentId: relay.id, on: false })}
        cancelPending={onMut.isPending}
      />
      <Group justify="center">
        <PowerButton
          on={relay.on}
          pending={onMut.isPending}
          onToggle={(on) => onMut.mutate({ equipmentId: relay.id, on })}
        />
      </Group>
    </Stack>
  );
};
