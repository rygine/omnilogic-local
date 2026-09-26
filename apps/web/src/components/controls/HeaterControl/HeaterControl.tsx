import { Button, Group, Stack } from "@mantine/core";
import { useState } from "react";

import {
  useSetHeaterEnable,
  useSetHeaterTemperature,
} from "@/client/mutations";
import { PowerButton } from "@/components/controls/PowerButton/PowerButton";
import { TemperatureSlider } from "@/components/EquipmentValue/TemperatureSlider";
import { useModalClose, useModalDirty } from "@/components/Modal/modal-state";
import type { HeaterDetail } from "@/server/serializers";

// the set point slider and the shared power and Apply footer
export const HeaterControl = ({
  bowId,
  heater,
}: {
  bowId: number;
  heater: HeaterDetail;
}) => {
  const enableMut = useSetHeaterEnable(bowId);
  const tempMut = useSetHeaterTemperature(bowId);
  const close = useModalClose();
  const [setPoint, setSetPoint] = useState(heater.setPoint);
  const changed = setPoint !== heater.setPoint;
  useModalDirty(changed);

  return (
    <Stack gap="md">
      <TemperatureSlider
        value={setPoint}
        min={heater.setPointRange.min}
        max={heater.setPointRange.max}
        onChange={setSetPoint}
      />

      <Group justify="space-between">
        <PowerButton
          on={heater.enabled}
          pending={enableMut.isPending}
          onToggle={(enabled) =>
            enableMut.mutate({ equipmentId: heater.id, enabled })
          }
        />
        <Button
          onClick={() => {
            tempMut.mutate({
              equipmentId: heater.id,
              temperature: setPoint,
            });
            close();
          }}
          loading={tempMut.isPending}
          disabled={!changed}>
          Apply
        </Button>
      </Group>
    </Stack>
  );
};
