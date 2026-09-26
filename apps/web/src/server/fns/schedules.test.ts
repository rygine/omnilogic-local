import { callServerFn } from "@tests/server/support";
import { vi } from "vitest";

const scheduleStub = {
  bowSystemId: 1,
  data: 75,
  daysActive: 127,
  enabled: 1,
  endHour: 9,
  endMinute: 0,
  equipmentId: 3,
  event: 164,
  recurring: 1,
  scheduleSystemId: 5,
  startHour: 8,
  startMinute: 0,
};

const updateSpy = vi.fn().mockResolvedValue(undefined);
const createSpy = vi.fn().mockResolvedValue(scheduleStub);
const setEnabledSpy = vi.fn().mockResolvedValue(undefined);

vi.mock("../controller-cache", () => ({
  writeController: (
    _h: string,
    _p: number,
    fn: (o: unknown) => Promise<unknown>,
  ) =>
    fn({
      backyard: {
        schedules: {
          get: (id: number) =>
            id === scheduleStub.scheduleSystemId ? scheduleStub : undefined,
          update: updateSpy,
          create: createSpy,
          setEnabled: setEnabledSpy,
        },
      },
    }),
}));

import { createSchedule, editSchedule, setScheduleEnabled } from "./schedules";

beforeEach(() => {
  updateSpy.mockClear();
  createSpy.mockClear();
  setEnabledSpy.mockClear();
});

it("toggles a schedule via setEnabled", async () => {
  await callServerFn(setScheduleEnabled, {
    host: "h",
    port: 1,
    scheduleId: 5,
    enabled: false,
  });
  expect(setEnabledSpy).toHaveBeenCalledWith(5, false);
});

it("maps create fields (daysActive → days) onto schedules.create", async () => {
  await callServerFn(createSchedule, {
    host: "h",
    port: 1,
    equipmentId: 3,
    data: 58,
    startHour: 8,
    startMinute: 0,
    endHour: 11,
    endMinute: 30,
    daysActive: 21,
    enabled: true,
    recurring: true,
  });
  expect(createSpy).toHaveBeenCalledWith({
    equipmentId: 3,
    data: 58,
    startHour: 8,
    startMinute: 0,
    endHour: 11,
    endMinute: 30,
    days: 21,
    enabled: true,
    recurring: true,
  });
});

it("passes the schedule type through to schedules.create", async () => {
  await callServerFn(createSchedule, {
    host: "h",
    port: 1,
    equipmentId: 3,
    type: "spillover",
    data: 58,
    startHour: 8,
    startMinute: 0,
    endHour: 11,
    endMinute: 0,
    daysActive: 127,
    enabled: true,
    recurring: true,
  });
  expect(createSpy).toHaveBeenLastCalledWith(
    expect.objectContaining({ equipmentId: 3, type: "spillover" }),
  );
});

it("looks up the schedule and calls update with the mapped fields", async () => {
  await callServerFn(editSchedule, {
    host: "h",
    port: 1,
    scheduleId: 5,
    startHour: 10,
    endHour: 11,
    daysActive: 21,
    enabled: false,
  });
  expect(updateSpy).toHaveBeenCalledWith(5, {
    startHour: 10,
    startMinute: undefined,
    endHour: 11,
    endMinute: undefined,
    days: 21,
    enabled: false,
    recurring: undefined,
  });
});

it("throws a WebAppError for an unknown schedule id", async () => {
  await expect(
    callServerFn(editSchedule, {
      host: "h",
      port: 1,
      scheduleId: 999,
      startHour: 10,
    }),
  ).rejects.toMatchObject({ code: "ERROR" });
  expect(updateSpy).not.toHaveBeenCalled();
});
