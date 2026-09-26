import { Button, Divider, Group, Select, Stack } from "@mantine/core";
import type { ScheduleType } from "@rygine/omnilogic-local-sdk";
import { useState } from "react";

import { useCreateSchedule } from "@/client/mutations";
import { ALL_DAYS } from "@/client/schedule-format";
import {
  defaultScheduleData,
  targetKey,
  type ScheduleTarget,
} from "@/client/schedule-targets";
import { useScheduleWhen } from "@/components/controls/ScheduleControl/ScheduleWhen";
import { ScheduleAction } from "@/components/EquipmentValue/ScheduleAction";
import { useModalDirty } from "@/components/Modal/modal-state";

// the picker's options, grouped by body
const groupedOptions = (targets: ScheduleTarget[]) => {
  const bodies = [...new Set(targets.map((t) => t.bodyName))];
  return bodies.map((body) => ({
    group: body,
    items: targets
      .filter((t) => t.bodyName === body)
      .map((t) => ({ value: targetKey(t), label: t.name })),
  }));
};

export const ScheduleCreate = ({
  targets,
  initialEquipmentId,
  initialType = "equipment",
  onDone,
}: {
  targets: ScheduleTarget[];
  // pre-selected from the "add to schedule" link
  initialEquipmentId?: number;
  // which of its targets: the spillover type picks spillover over the filter
  initialType?: ScheduleType;
  onDone: () => void;
}) => {
  const preset =
    initialEquipmentId != null
      ? targets.find(
          (t) => t.equipmentId === initialEquipmentId && t.type === initialType,
        )
      : undefined;
  const [targetId, setTargetId] = useState<string | null>(
    preset ? targetKey(preset) : null,
  );
  const [data, setData] = useState(preset ? defaultScheduleData(preset) : 0);
  const mut = useCreateSchedule();
  const when = useScheduleWhen({
    startMode: "clock",
    startTime: "08:00",
    endMode: "clock",
    endTime: "11:00",
    days: ALL_DAYS,
  });
  // anything moved off its opening value is an unsaved draft
  const [opened] = useState(() => ({ targetId, data }));
  useModalDirty(
    targetId !== opened.targetId || data !== opened.data || when.changed,
  );

  const target = targets.find((t) => targetKey(t) === targetId);

  const selectTarget = (value: string | null) => {
    setTargetId(value);
    const t = value ? targets.find((x) => targetKey(x) === value) : undefined;
    setData(t ? defaultScheduleData(t) : 0);
  };

  const create = () => {
    if (!target) {
      return;
    }
    mut.mutate(
      {
        equipmentId: target.equipmentId,
        type: target.type,
        data,
        ...when.times,
        // created enabled and recurring, neither is in the form
        enabled: true,
        recurring: true,
      },
      { onSuccess: onDone },
    );
  };

  return (
    <Stack gap="md">
      <Select
        label="Equipment or theme"
        placeholder="Choose equipment or theme"
        data={groupedOptions(targets)}
        value={targetId}
        onChange={selectTarget}
      />
      {target && (
        <ScheduleAction target={target} value={data} onChange={setData} />
      )}
      <Divider />
      {when.fields}
      <Group justify="flex-end">
        <Button variant="default" onClick={onDone}>
          Cancel
        </Button>
        <Button loading={mut.isPending} disabled={!target} onClick={create}>
          Create
        </Button>
      </Group>
    </Stack>
  );
};
