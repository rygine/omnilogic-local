import type { ScheduleType } from "@rygine/omnilogic-local-sdk";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { writeController } from "../controller-cache";
import { WebAppError } from "../errors";
import { hostPort } from "./_validators";

// the kinds of schedule the SDK creates
const scheduleType = z.enum([
  "equipment",
  "spillover",
  "theme",
] satisfies ScheduleType[]);

const createArgs = hostPort.extend({
  equipmentId: z.number().int().positive(),
  // omitted for a plain equipment schedule
  type: scheduleType.optional(),
  // the action value: a filter percent, a chlorinator percent, a light show, 1 or 0, or a set point
  data: z.number().int().min(0),
  startHour: z.number().int().min(0).max(26),
  startMinute: z.number().int().min(0).max(59),
  endHour: z.number().int().min(0).max(26),
  endMinute: z.number().int().min(0).max(59),
  daysActive: z.number().int().min(0).max(127),
  enabled: z.boolean(),
  recurring: z.boolean(),
});

export const createSchedule = createServerFn({ method: "POST" })
  .validator(createArgs)
  .handler(({ data }) =>
    writeController(
      data.host,
      data.port,
      async (omni) => {
        await omni.backyard.schedules.create({
          equipmentId: data.equipmentId,
          ...(data.type !== undefined ? { type: data.type } : {}),
          data: data.data,
          startHour: data.startHour,
          startMinute: data.startMinute,
          endHour: data.endHour,
          endMinute: data.endMinute,
          days: data.daysActive,
          enabled: data.enabled,
          recurring: data.recurring,
        });
      },
      "createSchedule",
    ),
  );

const enableArgs = hostPort.extend({
  scheduleId: z.number().int().positive(),
  enabled: z.boolean(),
});

export const setScheduleEnabled = createServerFn({ method: "POST" })
  .validator(enableArgs)
  .handler(({ data }) =>
    writeController(
      data.host,
      data.port,
      (omni) =>
        omni.backyard.schedules.setEnabled(data.scheduleId, data.enabled),
      "setScheduleEnabled",
    ),
  );

const editArgs = hostPort.extend({
  scheduleId: z.number().int().positive(),
  startHour: z.number().int().min(0).max(26).optional(),
  startMinute: z.number().int().min(0).max(59).optional(),
  endHour: z.number().int().min(0).max(26).optional(),
  endMinute: z.number().int().min(0).max(59).optional(),
  daysActive: z.number().int().min(0).max(127).optional(),
  enabled: z.boolean().optional(),
  recurring: z.boolean().optional(),
  data: z.number().int().min(0).optional(),
});

// merges the given fields over the stored schedule, an unknown id is an error
export const editSchedule = createServerFn({ method: "POST" })
  .validator(editArgs)
  .handler(({ data }) =>
    writeController(
      data.host,
      data.port,
      async (omni) => {
        if (!omni.backyard.schedules.get(data.scheduleId)) {
          throw new WebAppError("ERROR", `Unknown schedule ${data.scheduleId}`);
        }
        await omni.backyard.schedules.update(data.scheduleId, {
          startHour: data.startHour,
          startMinute: data.startMinute,
          endHour: data.endHour,
          endMinute: data.endMinute,
          days: data.daysActive,
          enabled: data.enabled,
          recurring: data.recurring,
          data: data.data,
        });
      },
      "editSchedule",
    ),
  );

const removeArgs = hostPort.extend({
  scheduleId: z.number().int().positive(),
});

export const deleteSchedule = createServerFn({ method: "POST" })
  .validator(removeArgs)
  .handler(({ data }) =>
    writeController(
      data.host,
      data.port,
      (omni) => omni.backyard.schedules.remove(data.scheduleId),
      "deleteSchedule",
    ),
  );
