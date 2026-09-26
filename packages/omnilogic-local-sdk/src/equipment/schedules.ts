import type { OmniLogic, WriteOptions } from "@/client/omnilogic";
import { OmniValidationError } from "@/utils/errors";
import { defined, matches } from "@/utils/helpers";

export const SCHEDULE_MONDAY = 1;
export const SCHEDULE_TUESDAY = 2;
export const SCHEDULE_WEDNESDAY = 4;
export const SCHEDULE_THURSDAY = 8;
export const SCHEDULE_FRIDAY = 16;
export const SCHEDULE_SATURDAY = 32;
export const SCHEDULE_SUNDAY = 64;
export const SCHEDULE_EVERY_DAY = 127;

export const SCHEDULE_SUNRISE_HOUR = 25;
export const SCHEDULE_SUNSET_HOUR = 26;
export const SCHEDULE_SUNRISE_SUNSET_MINUTE = 25;

export const SCHEDULE_TYPE = {
  equipment: 164,
  spillover: 311,
  theme: 317,
} as const;

export type ScheduleType = keyof typeof SCHEDULE_TYPE;

export const scheduleTypeOf = (event: number) =>
  (["equipment", "spillover", "theme"] as const).find(
    (type) => SCHEDULE_TYPE[type] === event,
  );

export type ScheduleCreate = {
  equipmentId: number;
  // the value to set: a speed, a show, a percent, a set point, 1/0 for a relay
  data: number;
  // default "equipment"
  type?: ScheduleType;
  startHour: number;
  startMinute?: number;
  endHour: number;
  endMinute?: number;
  // a bit per day, the constants above added together
  days: number;
  // default true
  enabled?: boolean;
  // default true
  recurring?: boolean;
};

export type ScheduleUpdate = Partial<Omit<ScheduleCreate, "equipmentId">>;

export class Schedules {
  #omni: OmniLogic;

  constructor(omni: OmniLogic) {
    this.#omni = omni;
  }

  list() {
    return this.#omni.config.schedules;
  }

  for(equipmentId: number) {
    return this.list().filter((s) => s.equipmentId === equipmentId);
  }

  get(scheduleId: number) {
    return this.list().find((s) => s.scheduleSystemId === scheduleId);
  }

  async create(spec: ScheduleCreate, options: WriteOptions = {}) {
    const {
      type = "equipment",
      startMinute = 0,
      endMinute = 0,
      days: daysActive,
      enabled = true,
      recurring = true,
      ...rest
    } = spec;
    const record = {
      ...rest,
      event: SCHEDULE_TYPE[type],
      startMinute,
      endMinute,
      daysActive,
      enabled: Number(enabled),
      recurring: Number(recurring),
    };
    const before = new Set(this.list().map((s) => s.scheduleSystemId));
    const created = () =>
      this.list().find(
        (s) => !before.has(s.scheduleSystemId) && matches(s, record),
      );
    await this.#omni.command("CreateUIScheduleCmd", record, {
      verify: () => created() !== undefined,
      attempts: options.attempts,
      failure: "Unable to create the schedule",
    });
    return created()!;
  }

  async update(
    scheduleId: number,
    changes: ScheduleUpdate,
    options: WriteOptions = {},
  ) {
    const current = this.get(scheduleId);
    if (current === undefined) {
      throw new OmniValidationError(
        `No schedule ${scheduleId} in the cached config`,
      );
    }
    const { bowSystemId, equipmentId, scheduleSystemId, ...stored } = current;
    const { type, days, enabled, recurring, ...rest } = changes;
    const next = {
      ...stored,
      ...defined({
        ...rest,
        event: type === undefined ? undefined : SCHEDULE_TYPE[type],
        daysActive: days,
        enabled: enabled === undefined ? undefined : Number(enabled),
        recurring: recurring === undefined ? undefined : Number(recurring),
      }),
    };
    await this.#omni.command(
      "EditUIScheduleCmd",
      { scheduleId, ...next },
      {
        verify: () => matches(this.get(scheduleId), next),
        attempts: options.attempts,
        failure: `Unable to update schedule ${scheduleId}`,
      },
    );
  }

  async setEnabled(
    scheduleId: number,
    enabled: boolean,
    options: WriteOptions = {},
  ) {
    const flag = Number(enabled);
    await this.#omni.command(
      "SetUIScheduleEnableCmd",
      { scheduleId, data: flag },
      {
        verify: () => this.get(scheduleId)?.enabled === flag,
        attempts: options.attempts,
        failure: `Unable to ${enabled ? "enable" : "disable"} schedule ${scheduleId}`,
      },
    );
  }

  async remove(scheduleId: number, options: WriteOptions = {}) {
    if (this.get(scheduleId) === undefined) {
      throw new OmniValidationError(
        `No schedule ${scheduleId} in the cached config`,
      );
    }
    await this.#omni.command(
      "DeleteUIScheduleCmd",
      { scheduleId },
      {
        verify: () => this.get(scheduleId) === undefined,
        attempts: options.attempts,
        failure: `Unable to delete schedule ${scheduleId}`,
      },
    );
  }
}
