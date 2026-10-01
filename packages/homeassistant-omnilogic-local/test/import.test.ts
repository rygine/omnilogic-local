import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { Telemetry } from "@rygine/omnilogic-local-sdk";

import { devicesOf } from "@/bridge";
import { entityIdOf, type Step } from "@/entities/entity";
import { automationOf, ScheduleImport } from "@/import";
import { isRecord, type Log } from "@/utils";

import {
  configXml,
  type Sent,
  silent,
  telemetryFixture,
  testOmni,
} from "./omni";

const API = { url: "http://ha/api", token: "t" };

// the entity ids Home Assistant holds, every entity of the devices last built
let knownIds: string[] = [];

// a refreshed session and a schedule import over its devices, with API access
const make = async (
  opts: Parameters<typeof testOmni>[0] & {
    log?: Log;
    disableImportedSchedules?: boolean;
  } = {},
) => {
  const t = testOmni(opts);
  await t.omni.refresh();
  const devices = devicesOf(t.omni, "rpm");
  knownIds = devices.flatMap((d) => d.entities.map((e) => entityIdOf(d, e)));
  const dir = await mkdtemp(join(tmpdir(), "import-"));
  const scheduleImport = new ScheduleImport(t.omni, {
    api: API,
    stateDir: dir,
    devices: () => devices,
    log: opts.log ?? silent,
    disableImportedSchedules: opts.disableImportedSchedules ?? false,
  });
  return { ...t, scheduleImport, dir };
};

// a fake Home Assistant REST API
const haApi = (
  respond: (method: string, url: string) => Response,
  statesStatus = 200,
  temperature = "°F",
) => {
  const calls: { method: string; url: string; body: string }[] = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? "GET";
    calls.push({
      method,
      url,
      body: typeof init.body === "string" ? init.body : "",
    });
    if (url === "http://ha/api/states") {
      return statesStatus === 200
        ? Response.json([
            ...knownIds.map((entity_id) => ({ entity_id })),
            ...postedStates(calls),
          ])
        : new Response("", { status: statesStatus });
    }
    if (url === "http://ha/api/config") {
      return Response.json({ unit_system: { temperature } });
    }
    return respond(method, url);
  });
  // the last notification's message
  const message = () => {
    const body: unknown = JSON.parse(calls.at(-1)!.body);
    return isRecord(body) && typeof body.message === "string"
      ? body.message
      : "";
  };
  return { calls, message };
};

// the schedule enables sent, as [schedule id, data]
const enables = (sent: Sent[]) =>
  sent
    .filter((s) => s.name === "SetUIScheduleEnableCmd")
    .map((s) => [s.params.scheduleId, s.params.data]);

// what the import posted, as Home Assistant's states list it
const postedStates = (calls: { method: string; url: string }[]) =>
  calls
    .filter((c) => c.method === "POST" && c.url.includes("/automation/config/"))
    .map((c) => {
      const id = c.url.split("/").at(-1)!;
      return { entity_id: `automation.${id}`, attributes: { id } };
    });

// the automations the import turned off
const turnedOff = (calls: { method: string; url: string; body: string }[]) =>
  calls
    .filter((c) => c.url === "http://ha/api/services/automation/turn_off")
    .map((c) => (JSON.parse(c.body) as { entity_id: string }).entity_id);

// an enabled schedule from 10:00 to 18:00 every day
const schedule = (
  id: number,
  event: number,
  equipmentId: number,
  recurring = 1,
  data = 1,
) =>
  `<sche><bow-system-id>1</bow-system-id><equipment-id>${equipmentId}</equipment-id><schedule-system-id>${id}</schedule-system-id><event>${event}</event><data>${data}</data><enabled>1</enabled><start-minute>0</start-minute><start-hour>10</start-hour><end-minute>0</end-minute><end-hour>18</end-hour><days-active>127</days-active><recurring>${recurring}</recurring></sche>`;

const base = {
  bowSystemId: 1,
  equipmentId: 3,
  scheduleSystemId: 21,
  event: 164,
  data: 58,
  enabled: 1,
  startHour: 10,
  startMinute: 0,
  endHour: 18,
  endMinute: 0,
  daysActive: 127,
  recurring: 1,
};
const steps = {
  start: [{ key: "speed", action: "number.set_value", data: { value: 58 } }],
  end: [{ key: "switch", action: "switch.turn_off" }],
};
const actionOf = (s: Step) => ({
  action: s.action,
  target: { entity_id: `x.${s.key}` },
  ...(s.data === undefined ? {} : { data: s.data }),
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("automationOf", () => {
  it("builds actions on entities, days on time triggers moved past midnight, and day conditions for sun triggers", () => {
    const a = automationOf(
      { ...base, daysActive: 1 | 16 },
      "Pool Filter Pump",
      steps,
      actionOf,
    );
    expect(a.alias).toBe("OmniLogicLocal: Pool Filter Pump 10:00–18:00");
    expect(a.triggers).toEqual([
      { trigger: "time", at: "10:00:00", weekday: ["mon", "fri"], id: "start" },
      { trigger: "time", at: "18:00:00", weekday: ["mon", "fri"], id: "end" },
    ]);
    const [start, end] = a.actions[0]!.choose;
    expect(start).toEqual({
      conditions: [{ condition: "trigger", id: "start" }],
      sequence: [
        {
          action: "number.set_value",
          target: { entity_id: "x.speed" },
          data: { value: 58 },
        },
      ],
    });
    expect(end!.sequence).toEqual([
      { action: "switch.turn_off", target: { entity_id: "x.switch" } },
    ]);

    const everyDay = automationOf(base, "X", steps, actionOf);
    expect(everyDay.triggers[0]).toEqual({
      trigger: "time",
      at: "10:00:00",
      id: "start",
    });

    const overnight = automationOf(
      { ...base, startHour: 22, endHour: 2, daysActive: 64 },
      "X",
      steps,
      actionOf,
    );
    expect(overnight.triggers[1]).toMatchObject({ weekday: ["mon"] });

    const sunset = automationOf(
      { ...base, startHour: 26, startMinute: 25, endHour: 23, daysActive: 1 },
      "X",
      steps,
      actionOf,
    );
    expect(sunset.triggers[0]).toEqual({
      trigger: "sun",
      event: "sunset",
      id: "start",
    });
    expect(sunset.actions[0]!.choose[0]!.conditions).toEqual([
      { condition: "trigger", id: "start" },
      { condition: "time", weekday: ["mon"] },
    ]);
  });
});

describe("ScheduleImport", () => {
  it("offers the import button only with API access", async () => {
    const { scheduleImport, omni, dir } = await make();

    expect(scheduleImport.entities().map((e) => e.key)).toEqual([
      "import_schedules",
    ]);

    const without = new ScheduleImport(omni, {
      api: undefined,
      stateDir: dir,
      devices: () => [],
      log: silent,
      disableImportedSchedules: false,
    });
    expect(without.entities()).toEqual([]);
  });

  it("notifies once per set of enabled schedules across restarts, retrying a failed notification with one warning", async () => {
    let up = false;
    const { calls } = haApi(() =>
      up ? Response.json({}) : new Response("", { status: 502 }),
    );
    const warn = vi.fn();
    const { scheduleImport, dir, omni } = await make({
      log: { ...silent, warn },
    });
    const stored = async () =>
      JSON.parse(await readFile(join(dir, "state.json"), "utf8")) as unknown;

    await scheduleImport.notifySchedules();
    await scheduleImport.notifySchedules();
    expect(calls).toHaveLength(2);
    expect(warn).toHaveBeenCalledTimes(1);
    await expect(stored()).rejects.toThrow("ENOENT");

    up = true;
    await scheduleImport.notifySchedules();
    await scheduleImport.notifySchedules();
    expect(calls).toHaveLength(3);
    expect(calls[2]).toMatchObject({
      method: "POST",
      url: "http://ha/api/services/persistent_notification/create",
    });
    expect(await stored()).toEqual({ notifiedIds: "21,23" });

    const restarted = new ScheduleImport(omni, {
      api: API,
      stateDir: dir,
      devices: () => [],
      log: silent,
      disableImportedSchedules: false,
    });
    await restarted.notifySchedules();
    expect(calls).toHaveLength(3);
  });

  it("with disable_imported_schedules on, imports, disables the controller schedule, and leaves the automation on", async () => {
    const { calls, message } = haApi((method) =>
      method === "GET"
        ? new Response("", { status: 404 })
        : Response.json({ result: "ok" }),
    );

    // a controller whose config follows the schedule enable commands sent
    let sent: Sent[] = [];
    const disabledIds = () =>
      new Set(
        enables(sent)
          .filter(([, data]) => data === 0)
          .map(([id]) => id),
      );
    const t = await make({
      disableImportedSchedules: true,
      config: () => {
        let xml = configXml();
        for (const id of disabledIds()) {
          xml = xml.replace(
            new RegExp(
              `(<schedule-system-id>${id}</schedule-system-id>[\\s\\S]*?<enabled>)1(</enabled>)`,
            ),
            "$10$2",
          );
        }
        return xml;
      },
    });
    sent = t.sent;
    t.omni.fetchTelemetry = <R extends boolean = false>(_options?: {
      raw?: R;
    }) => {
      const telemetry = telemetryFixture();
      telemetry.backyard.configChksum = 1 + disabledIds().size;
      return Promise.resolve(telemetry as R extends true ? string : Telemetry);
    };

    await t.scheduleImport.import();

    expect(calls.filter((c) => c.method === "POST").map((c) => c.url)).toEqual(
      expect.arrayContaining([
        "http://ha/api/config/automation/config/omnilogic_schedule_21",
        "http://ha/api/config/automation/config/omnilogic_schedule_23",
      ]),
    );
    expect(enables(sent)).toEqual([
      [21, 0],
      [23, 0],
    ]);
    expect(calls.at(-1)?.url).toBe(
      "http://ha/api/services/persistent_notification/create",
    );
    expect(message()).toContain(
      "Imported (schedules are disabled on the controller):",
    );
    expect(message()).toContain(
      "Pool Filter Pump 10:00–18:00, every day, value 58",
    );
    expect(message()).toContain(
      "Pool Chlorinator 10:00–18:00, every day, value 15",
    );
    expect(turnedOff(calls)).toEqual([]);
  });

  it("never overwrites an imported automation, leaves a schedule enabled when the controller never confirms it, skips unmapped equipment, and ignores a theme schedule and a schedule that runs once", async () => {
    // schedule 21 is already imported
    const { calls, message } = haApi((method, url) =>
      method === "GET" && !url.endsWith("_schedule_21")
        ? new Response("", { status: 404 })
        : Response.json({}),
    );
    // the fixture config never shows a schedule disabled
    const { scheduleImport, sent } = await make({
      disableImportedSchedules: true,
      config: () =>
        configXml().replace(
          "</Schedules>",
          `${schedule(50, 164, 999)}${schedule(51, 317, 77)}${schedule(52, 164, 22, 0)}</Schedules>`,
        ),
    });

    await scheduleImport.import();

    expect(
      calls
        .filter((c) => c.url.includes("/config/"))
        .map((c) => c.method + " " + c.url),
    ).toEqual([
      "GET http://ha/api/config/automation/config/omnilogic_schedule_21",
      "GET http://ha/api/config/automation/config/omnilogic_schedule_23",
      "POST http://ha/api/config/automation/config/omnilogic_schedule_23",
    ]);
    expect(enables(sent)).toEqual([[23, 0]]);

    expect(message()).not.toContain(
      "Imported (schedules are disabled on the controller):",
    );
    expect(message()).toContain("Left on the controller:");
    expect(message()).toContain(
      "Pool Filter Pump 10:00–18:00, every day, value 58: already imported",
    );
    expect(message()).toContain("still enabled");
    expect(message()).toContain(
      "Equipment 999 10:00–18:00, every day, value 1: no equipment the bridge can control",
    );
    // the theme schedule 51 and the one-time schedule 52 are neither imported nor named
    expect(message()).not.toContain("Theme 77");
    expect(message()).not.toContain("Spa Blower");
  });

  it("by default imports automations turned off, leaves the controller schedules running, and reports them already imported when pressed again", async () => {
    let done = false;
    const { calls, message } = haApi((method) =>
      method === "GET" && !done
        ? new Response("", { status: 404 })
        : Response.json({ result: "ok" }),
    );
    const t = await make();

    await t.scheduleImport.import();

    expect(
      calls
        .filter(
          (c) => c.method === "POST" && c.url.includes("/config/automation/"),
        )
        .map((c) => c.url),
    ).toEqual([
      "http://ha/api/config/automation/config/omnilogic_schedule_21",
      "http://ha/api/config/automation/config/omnilogic_schedule_23",
    ]);
    expect(turnedOff(calls)).toEqual([
      "automation.omnilogic_schedule_21",
      "automation.omnilogic_schedule_23",
    ]);
    expect(enables(t.sent)).toEqual([]);
    expect(message()).toContain(
      "Imported (automations are turned off, and the controller still runs its schedules):",
    );

    done = true;
    const before = calls.length;
    await t.scheduleImport.import();
    expect(turnedOff(calls.slice(before))).toEqual([]);
    expect(enables(t.sent)).toEqual([]);
    expect(message()).toContain(
      "Pool Filter Pump 10:00–18:00, every day, value 58: already imported",
    );
  });

  it("imports Home Assistant actions on the bridge's entities, a set point in Home Assistant's unit, and skips a schedule whose entity is missing", async () => {
    const { calls, message } = haApi(
      (method) =>
        method === "GET"
          ? new Response("", { status: 404 })
          : Response.json({ result: "ok" }),
      200,
      "°C",
    );
    const t = await make({
      config: () =>
        configXml().replace(
          "</Schedules>",
          `${schedule(60, 164, 4, 1, 84)}${schedule(61, 164, 22)}</Schedules>`,
        ),
    });
    knownIds = knownIds.filter((id) => id !== "switch.spa_blower");

    await t.scheduleImport.import();

    const posted = (id: number) => {
      const call = calls.find(
        (c) =>
          c.method === "POST" && c.url.endsWith(`/omnilogic_schedule_${id}`),
      );
      const body: unknown = JSON.parse(call!.body);
      return isRecord(body) ? body.actions : undefined;
    };
    expect(posted(23)).toEqual([
      {
        choose: [
          {
            conditions: [{ condition: "trigger", id: "start" }],
            sequence: [
              {
                action: "number.set_value",
                target: { entity_id: "number.pool_chlorinator_output" },
                data: { value: 15 },
              },
              {
                action: "switch.turn_on",
                target: { entity_id: "switch.pool_chlorinator" },
              },
            ],
          },
          {
            conditions: [{ condition: "trigger", id: "end" }],
            sequence: [
              {
                action: "switch.turn_off",
                target: { entity_id: "switch.pool_chlorinator" },
              },
            ],
          },
        ],
      },
    ]);
    expect(JSON.stringify(posted(60))).toContain(
      '{"action":"climate.set_temperature","target":{"entity_id":"climate.pool_heater"},"data":{"temperature":28.9,"hvac_mode":"heat"}}',
    );
    expect(message()).toContain(
      "Spa Blower 10:00–18:00, every day, value 1: Home Assistant has no entity switch.spa_blower",
    );
  });

  it("imports nothing and says why in one line when Home Assistant refuses the token", async () => {
    const { calls, message } = haApi(
      () => Response.json({ result: "ok" }),
      401,
    );
    const t = await make();

    await t.scheduleImport.import();

    expect(calls.filter((c) => c.method === "POST").map((c) => c.url)).toEqual([
      "http://ha/api/services/persistent_notification/create",
    ]);
    expect(enables(t.sent)).toEqual([]);
    expect(message()).toBe(
      "Left on the controller:\n- Nothing more was imported: Home Assistant refused the token",
    );
  });
});
