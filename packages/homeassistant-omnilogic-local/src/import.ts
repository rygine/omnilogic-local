import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  type config,
  type OmniLogic,
  SCHEDULE_SUNRISE_HOUR,
  SCHEDULE_SUNSET_HOUR,
  SCHEDULE_TYPE,
} from "@rygine/omnilogic-local-sdk";

import {
  type Api,
  automationExists,
  automationIds,
  callService,
  createAutomation,
  entityIds,
  notify,
  temperatureUnit,
} from "@/api";
import type { BridgeOptions } from "@/bridge";
import {
  type DeviceSpec,
  type Entity,
  entityIdOf,
  type ScheduleSteps,
  type Step,
} from "@/entities/entity";
import {
  DAYS,
  supportedSchedules,
  summary,
  targetNameOf,
  timeOf,
  windowOf,
} from "@/entities/schedules";
import { isRecord, type Log, messageOf } from "@/utils";

type Schedule = config.Schedule;

const WEEKDAYS = DAYS.map((d) => d.toLowerCase());

const hourOf = (hour: number, minute: number) =>
  hour === SCHEDULE_SUNRISE_HOUR
    ? 6
    : hour === SCHEDULE_SUNSET_HOUR
      ? 18
      : hour + minute / 60;

const isSun = (hour: number) =>
  hour === SCHEDULE_SUNRISE_HOUR || hour === SCHEDULE_SUNSET_HOUR;

// the days a mask names, moved later by the given number of days
const weekdays = (mask: number, shift: number) =>
  WEEKDAYS.filter((_, i) => (mask & (1 << ((i - shift + 7) % 7))) !== 0);

const trigger = (hour: number, minute: number, id: string, days: string[]) =>
  isSun(hour)
    ? {
        trigger: "sun",
        event: hour === SCHEDULE_SUNRISE_HOUR ? "sunrise" : "sunset",
        id,
      }
    : {
        trigger: "time",
        at: `${timeOf(hour, minute)}:00`,
        ...(days.length === 7 ? {} : { weekday: days }),
        id,
      };

const dayCondition = (hour: number, days: string[]) =>
  isSun(hour) && days.length < 7 ? [{ condition: "time", weekday: days }] : [];

export const automationOf = (
  s: Schedule,
  name: string,
  steps: ScheduleSteps,
  actionOf: (step: Step) => object,
) => {
  const shift =
    hourOf(s.endHour, s.endMinute) < hourOf(s.startHour, s.startMinute) ? 1 : 0;
  const startDays = weekdays(s.daysActive, 0);
  const endDays = weekdays(s.daysActive, shift);
  return {
    alias: `OmniLogicLocal: ${name} ${windowOf(s)}`,
    description: `Imported from controller schedule ${s.scheduleSystemId}: ${summary(s, name)}.`,
    mode: "queued",
    triggers: [
      trigger(s.startHour, s.startMinute, "start", startDays),
      trigger(s.endHour, s.endMinute, "end", endDays),
    ],
    conditions: [],
    actions: [
      {
        choose: [
          {
            conditions: [
              { condition: "trigger", id: "start" },
              ...dayCondition(s.startHour, startDays),
            ],
            sequence: steps.start.map(actionOf),
          },
          {
            conditions: [
              { condition: "trigger", id: "end" },
              ...dayCondition(s.endHour, endDays),
            ],
            sequence: steps.end.map(actionOf),
          },
        ],
      },
    ],
  };
};

// a set point in °F as Home Assistant's °C, to a tenth
const inCelsius = (data: Record<string, number | string>) =>
  typeof data.temperature === "number"
    ? {
        ...data,
        temperature: Math.round(((data.temperature - 32) * 50) / 9) / 10,
      }
    : data;

type Report = { imported: string[]; left: string[] };

type Created = { id: string; line: string };

const sectionOf = (title: string, lines: string[]) =>
  lines.length === 0 ? [] : ["", title, ...lines.map((l) => `- ${l}`)];

const reportText = (r: Report, disabling: boolean) =>
  [
    ...sectionOf(
      disabling
        ? "Imported (schedules are disabled on the controller):"
        : "Imported (automations are turned off, and the controller still runs its schedules):",
      r.imported,
    ),
    ...sectionOf("Left on the controller:", r.left),
  ]
    .join("\n")
    .trim() || "No controller schedule is enabled.";

type ScheduleImportOptions = Pick<
  BridgeOptions,
  "api" | "stateDir" | "disableImportedSchedules"
> & {
  devices: () => DeviceSpec[];
  log: Log;
};

export class ScheduleImport {
  #omni: OmniLogic;
  #options: ScheduleImportOptions;
  #notifiedIds?: string;
  // the enabled schedule ids whose notification last failed
  #failedIds?: string;

  constructor(omni: OmniLogic, options: ScheduleImportOptions) {
    this.#omni = omni;
    this.#options = options;
  }

  get #enabledSchedules() {
    return supportedSchedules(this.#omni).filter((s) => s.enabled === 1);
  }

  #nameOf(s: Schedule) {
    return targetNameOf(s, this.#options.devices());
  }

  // the device and the steps that carry out a schedule
  #stepsOf(s: Schedule) {
    const id = String(
      s.event === SCHEDULE_TYPE.spillover ? s.bowSystemId : s.equipmentId,
    );
    const device = this.#options.devices().find((d) => d.id === id);
    const steps = device?.schedule?.(s.data);
    return device === undefined || steps === undefined
      ? undefined
      : { device, ...steps };
  }

  // the automation for a schedule, or why there is none
  #automationFor(
    s: Schedule,
    name: string,
    knownIds: Set<string>,
    celsius: boolean,
  ) {
    const steps = this.#stepsOf(s);
    if (steps === undefined) {
      return "no equipment the bridge can control";
    }
    if (s.startHour === s.endHour && s.startMinute === s.endMinute) {
      return "it starts and ends at the same time";
    }
    const idOf = (step: Step) => {
      const e = steps.device.entities.find((x) => x.key === step.key);
      return e === undefined ? step.key : entityIdOf(steps.device, e);
    };
    const missing = [...steps.start, ...steps.end]
      .map(idOf)
      .find((id) => !knownIds.has(id));
    if (missing !== undefined) {
      return `Home Assistant has no entity ${missing}`;
    }
    return automationOf(s, name, steps, (step) => ({
      action: step.action,
      target: { entity_id: idOf(step) },
      ...(step.data === undefined
        ? {}
        : { data: celsius ? inCelsius(step.data) : step.data }),
    }));
  }

  entities(): Entity[] {
    if (this.#options.api === undefined) {
      return [];
    }
    return [
      {
        platform: "button",
        key: "import_schedules",
        name: "Import controller schedules",
        command: () => this.import(),
      },
    ];
  }

  get #stateFile() {
    return join(this.#options.stateDir, "state.json");
  }

  async #cachedIds() {
    if (this.#notifiedIds === undefined) {
      try {
        const state: unknown = JSON.parse(
          await readFile(this.#stateFile, "utf8"),
        );
        this.#notifiedIds =
          isRecord(state) && typeof state.notifiedIds === "string"
            ? state.notifiedIds
            : "";
      } catch {
        this.#notifiedIds = "";
      }
    }
    return this.#notifiedIds;
  }

  // one notification for each new set of enabled schedules
  async notifySchedules() {
    const api = this.#options.api;
    if (api === undefined) {
      return;
    }
    const enabledIds = this.#enabledSchedules
      .map((s) => s.scheduleSystemId)
      .toSorted((a, b) => a - b)
      .join(",");
    if ((await this.#cachedIds()) === enabledIds) {
      return;
    }
    if (enabledIds !== "") {
      const lines = this.#enabledSchedules.map(
        (s) => `- ${summary(s, this.#nameOf(s))}`,
      );
      try {
        await notify(
          api,
          "omnilogic_schedules",
          "OmniLogic schedules are active",
          [
            "The controller runs these schedules itself, alongside anything Home Assistant does:",
            ...lines,
            "",
            "Press **Import controller schedules** on the OmniLogic device to move them into automations.",
          ].join("\n"),
        );
      } catch (error) {
        if (this.#failedIds !== enabledIds) {
          this.#failedIds = enabledIds;
          this.#options.log.warn(`schedule notification: ${messageOf(error)}`);
        }
        return;
      }
    }
    this.#notifiedIds = enabledIds;
    await writeFile(
      this.#stateFile,
      JSON.stringify({ notifiedIds: enabledIds }),
    );
  }

  async import() {
    const api = this.#options.api;
    if (api === undefined) {
      throw new Error("Importing needs Home Assistant API access");
    }

    const report: Report = { imported: [], left: [] };
    try {
      await this.#importSchedules(api, report);
    } catch (error) {
      report.left.push(`Nothing more was imported: ${messageOf(error)}`);
    }

    await notify(
      api,
      "omnilogic_schedules_import",
      "OmniLogic schedule import",
      reportText(report, this.#options.disableImportedSchedules),
    );
  }

  // automation entity ids, once each wanted automation has loaded
  async #registeredIds(api: Api, wanted: string[]) {
    let ids = await automationIds(api);
    for (let i = 0; i < 10 && wanted.some((id) => !ids.has(id)); i++) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      ids = await automationIds(api);
    }
    return ids;
  }

  async #importSchedules(api: Api, report: Report) {
    const knownIds = await entityIds(api);
    const celsius = (await temperatureUnit(api)) === "°C";

    const automations: Created[] = [];
    for (const s of this.#enabledSchedules) {
      const name = this.#nameOf(s);
      const line = summary(s, name);
      const automation = this.#automationFor(s, name, knownIds, celsius);
      if (typeof automation === "string") {
        report.left.push(`${line}: ${automation}`);
        continue;
      }

      const id = `omnilogic_schedule_${s.scheduleSystemId}`;
      try {
        if (await automationExists(api, id)) {
          report.left.push(`${line}: already imported`);
          continue;
        }
        await createAutomation(api, id, automation);
      } catch (error) {
        report.left.push(`${line}: ${messageOf(error)}`);
        continue;
      }

      if (!this.#options.disableImportedSchedules) {
        automations.push({ id, line });
        continue;
      }
      try {
        await this.#omni.backyard.schedules.setEnabled(
          s.scheduleSystemId,
          false,
        );
        report.imported.push(line);
      } catch (error) {
        report.left.push(
          `${line}: the automation exists, but the controller schedule is still enabled (${messageOf(error)})`,
        );
      }
    }

    if (automations.length > 0) {
      await this.#turnOff(api, automations, report);
    }
  }

  async #turnOff(api: Api, created: Created[], report: Report) {
    let ids = new Map<string, string>();
    let lookupError: string | undefined;
    try {
      ids = await this.#registeredIds(
        api,
        created.map((c) => c.id),
      );
    } catch (error) {
      lookupError = messageOf(error);
    }

    for (const { id, line } of created) {
      const entityId = ids.get(id);
      try {
        if (entityId === undefined) {
          throw new Error(
            lookupError ?? "Home Assistant has not loaded it yet",
          );
        }
        await callService(api, "automation", "turn_off", {
          entity_id: entityId,
        });
        report.imported.push(line);
      } catch (error) {
        report.left.push(
          `${line}: the automation is on, so it runs alongside the controller schedule (${messageOf(error)})`,
        );
      }
    }
  }
}
