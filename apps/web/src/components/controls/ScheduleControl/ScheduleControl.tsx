import { Button, Divider, Group, Stack } from "@mantine/core";
import { useState } from "react";

import { useDeleteSchedule, useEditSchedule } from "@/client/mutations";
import { useBows } from "@/client/queries";
import { formatTime, timeMode } from "@/client/schedule-format";
import { scheduleTargets } from "@/client/schedule-targets";
import { useThemes } from "@/client/themes";
import { useScheduleWhen } from "@/components/controls/ScheduleControl/ScheduleWhen";
import { ScheduleAction } from "@/components/EquipmentValue/ScheduleAction";
import { useModalDirty } from "@/components/Modal/modal-state";
import type { ScheduleSummary } from "@/server/serializers";

// the picker's clock string, a default for a sun-based endpoint
const initClock = (hour: number, minute: number, fallback: string): string =>
  timeMode(hour) === "clock" ? formatTime(hour, minute) : fallback;

export const ScheduleControl = ({
  schedule,
  onDone,
}: {
  schedule: ScheduleSummary;
  onDone: () => void;
}) => {
  const bows = useBows();
  const themes = useThemes();
  // match on the type too: the filter and spillover share an equipment id
  const target = bows.data
    ? scheduleTargets(bows.data, themes.data).find(
        (t) =>
          t.equipmentId === schedule.equipmentId && t.type === schedule.type,
      )
    : undefined;

  const [data, setData] = useState(schedule.data);
  const [openedData] = useState(data);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const when = useScheduleWhen({
    startMode: timeMode(schedule.startHour),
    startTime: initClock(schedule.startHour, schedule.startMinute, "08:00"),
    endMode: timeMode(schedule.endHour),
    endTime: initClock(schedule.endHour, schedule.endMinute, "18:00"),
    days: schedule.daysActive,
  });
  // anything moved off the stored value is an unsaved draft
  useModalDirty(data !== openedData || when.changed);
  const editMut = useEditSchedule();
  const deleteMut = useDeleteSchedule();

  const save = () =>
    editMut.mutate(
      { scheduleId: schedule.id, ...when.times, data },
      { onSuccess: onDone },
    );

  const remove = () =>
    deleteMut.mutate({ scheduleId: schedule.id }, { onSuccess: onDone });

  return (
    <Stack gap="md">
      {target && target.kind !== "theme" && (
        <>
          <ScheduleAction target={target} value={data} onChange={setData} />
          <Divider />
        </>
      )}
      {when.fields}
      <Group justify="space-between">
        {confirmDelete ? (
          <Group gap="xs">
            <Button
              variant="filled"
              color="red"
              loading={deleteMut.isPending}
              onClick={remove}>
              Confirm delete
            </Button>
            <Button variant="default" onClick={() => setConfirmDelete(false)}>
              Keep
            </Button>
          </Group>
        ) : (
          <Button
            variant="filled"
            color="red"
            onClick={() => setConfirmDelete(true)}>
            Delete
          </Button>
        )}
        <Group gap="xs">
          <Button variant="default" onClick={onDone}>
            Cancel
          </Button>
          <Button loading={editMut.isPending} onClick={save}>
            Save
          </Button>
        </Group>
      </Group>
    </Stack>
  );
};
