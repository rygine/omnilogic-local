import { COMMANDS } from "@/client/spec";
import {
  SCHEDULE_EVERY_DAY,
  SCHEDULE_TYPE,
  scheduleTypeOf,
} from "@/equipment/schedules";
import { Themes } from "@/equipment/themes";
import { CommandFailedError, OmniValidationError } from "@/utils/errors";

import {
  EMPTY_TELEMETRY,
  loadConfigFixture,
  makeRecorder,
  seeded,
  seededOmni,
  valuesOf,
} from "./mocks";

// the fixture config with one favorite and one theme
const withCollections = () =>
  seeded({
    ...loadConfigFixture(),
    favorites: [
      {
        systemId: 40,
        indexId: 1,
        equipmentIdOrThemeId: 8,
        sequence: 0,
        data: 0,
        simpleModeEnabled: 0,
      },
    ],
    themes: [{ systemId: 33, name: "Movie Night", iconId: 0, commands: [] }],
  });

const swallow = () => undefined;

describe("favorites and themes", () => {
  it("send each write in wire order", async () => {
    const { omni, sent } = await withCollections();
    // the writes verify against a refresh the recorder cannot satisfy
    await omni.backyard.favorites
      .create({ equipmentId: 8, data: 6 })
      .catch(swallow);
    await omni.backyard.favorites.createForTheme(32).catch(swallow);
    await omni.backyard.favorites.remove(1).catch(swallow);
    await omni.backyard.themes.create("Movie Night").catch(swallow);
    await omni.backyard.themes.run(33).catch(swallow);
    await omni.backyard.themes.run(33, true, { minutes: 90 }).catch(swallow);
    await omni.backyard.themes.run(33, false, { minutes: 90 }).catch(swallow);
    await omni.backyard.themes.rename(33, "EveningU").catch(swallow);
    await omni.backyard.themes.remove(33).catch(swallow);
    await omni.backyard.themes
      .schedule(35, { startHour: 19, endHour: 20, days: 96, enabled: false })
      .catch(swallow);
    const values = sent.map((s) => valuesOf(s.xml));
    expect(values[0]).toEqual(["8", "6"]);
    // a theme favorite carries the 0x0FFFFFFF marker
    expect(values[1]).toEqual(["32", "268435455"]);
    expect(values[2]).toEqual(["1"]);
    // name, daysActive, recurring, poolId
    expect(values[3]).toEqual(["Movie Night", "0", "0", "1"]);
    expect(values[4]!.slice(0, 3)).toEqual(["33", "1", "0"]);
    // id, data, isCountDownTimer, start h/m, end h/m, daysActive, recurring
    expect(values[5]).toEqual([
      "33",
      "1",
      "1",
      "0",
      "0",
      "1",
      "30",
      "127",
      "0",
    ]);
    expect(values[6]!.slice(0, 3)).toEqual(["33", "0", "0"]);
    expect(values[7]).toEqual(["33", "EveningU", "0", "0", "1"]);
    expect(values[8]).toEqual(["33"]);
    // CreateUIScheduleCmd with the RunGroupCmd event
    expect(values[9]).toEqual([
      "35",
      "1",
      "317",
      "19",
      "0",
      "20",
      "0",
      "96",
      "0",
      "1",
    ]);
  });

  it("refuse an index or id the config does not hold, sending nothing", async () => {
    const { omni, sent } = await seededOmni();
    await expect(omni.backyard.favorites.remove(9)).rejects.toThrow(
      OmniValidationError,
    );
    await expect(omni.backyard.themes.remove(999)).rejects.toThrow(
      OmniValidationError,
    );
    await expect(omni.backyard.schedules.remove(24)).rejects.toThrow(
      OmniValidationError,
    );
    await expect(
      omni.backyard.schedules.update(24, { days: 1 }),
    ).rejects.toThrow(OmniValidationError);
    expect(sent).toEqual([]);
  });
});

describe("schedules", () => {
  it("list the config's, filtered by equipment; a type is the opcode it replays", async () => {
    const { omni } = await seededOmni();
    const all = omni.backyard.schedules.list();
    expect(all.length).toBeGreaterThan(0);
    const filtered = omni.backyard.schedules.for(all[0]!.equipmentId);
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((s) => s.equipmentId === all[0]!.equipmentId)).toBe(
      true,
    );
    expect(SCHEDULE_TYPE.equipment).toBe(COMMANDS.SetUIEquipmentCmd.opcode);
    expect(SCHEDULE_TYPE.spillover).toBe(COMMANDS.SetUISpilloverCmd.opcode);
    expect(SCHEDULE_TYPE.theme).toBe(COMMANDS.RunGroupCmd.opcode);
    expect(scheduleTypeOf(164)).toBe("equipment");
    expect(scheduleTypeOf(311)).toBe("spillover");
    expect(scheduleTypeOf(317)).toBe("theme");
    expect(scheduleTypeOf(999)).toBeUndefined();
  });

  it("send each write in wire order, keyed by schedule id after creation", async () => {
    const { omni, sent } = await seededOmni();
    const s = omni.backyard.schedules;
    const existing = s.list()[0]!;
    // the writes verify against a refresh the recorder cannot satisfy
    await s
      .create({
        equipmentId: 8,
        data: 6,
        startHour: 16,
        endHour: 18,
        days: 100,
        enabled: true,
      })
      .catch(swallow);
    await s
      .create({
        equipmentId: 3,
        data: 58,
        type: "spillover",
        startHour: 10,
        endHour: 18,
        days: SCHEDULE_EVERY_DAY,
      })
      .catch(swallow);
    await s.update(existing.scheduleSystemId, { days: 17 }).catch(swallow);
    await s.setEnabled(24, false).catch(swallow);
    await s.remove(existing.scheduleSystemId).catch(swallow);
    const id = String(existing.scheduleSystemId);
    const values = sent.map((x) => valuesOf(x.xml));
    // [equipmentId, data, event, startH, startMin, endH, endMin, days, enabled, recurring]
    expect(values[0]).toEqual([
      "8",
      "6",
      "164",
      "16",
      "0",
      "18",
      "0",
      "100",
      "1",
      "1",
    ]);
    expect(values[1]!.slice(0, 3)).toEqual(["3", "58", "311"]);
    expect(values[2]!.slice(0, 2)).toEqual([id, String(existing.data)]);
    expect(values[2]![7]).toBe("17");
    expect(values[3]).toEqual(["24", "0"]);
    expect(values[4]).toEqual([id]);
  });
});

// a scripted session for themes, whose drop options make the first N writes no-ops
const themeStub = async (
  opts: { dropSaves?: number; dropDeletes?: number } = {},
) => {
  let nextId = 100;
  let dropSaves = opts.dropSaves ?? 0;
  let dropDeletes = opts.dropDeletes ?? 0;
  const themes: { systemId: number; name: string }[] = [];
  const sent: string[] = [];
  let checksum = 0;
  const { omni } = makeRecorder({
    onSend: (name, params) => {
      sent.push(name);
      if (name === "SaveNewGroupCmd") {
        if (dropSaves > 0) {
          dropSaves--;
        } else {
          themes.push({ systemId: nextId++, name: String(params.name) });
        }
      } else if (name === "SetGroupCmd") {
        const theme = themes.find((g) => g.systemId === params.equipmentId);
        if (theme !== undefined) {
          theme.name = String(params.name);
        }
      } else if (name === "DeleteGroupCmd") {
        if (dropDeletes > 0) {
          dropDeletes--;
        } else {
          const i = themes.findIndex((g) => g.systemId === params.equipmentId);
          if (i >= 0) {
            themes.splice(i, 1);
          }
        }
      }
    },
    // a fresh checksum every time
    telemetry: () => ({
      backyard: {
        ...EMPTY_TELEMETRY.backyard,
        configChksum: ++checksum,
        state: 1,
      },
    }),
    config: () => ({
      backyard: {
        bodiesOfWater: [
          {
            systemId: 1,
            sensors: [],
            relays: [],
            pumps: [],
            colorLogicLights: [],
          },
        ],
      },
      themes,
    }),
  });
  await omni.refresh();
  const count = (name: string) => sent.filter((s) => s === name).length;
  return { themes, count, g: new Themes(omni), omni };
};

describe("Themes verify their writes", () => {
  it("create sends once by default, resends when asked, and throws when the theme never appears", async () => {
    const once = await themeStub({ dropSaves: 1 });
    const error = await once.g.create("Night").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(CommandFailedError);
    expect((error as Error).message).toBe('Unable to create theme "Night"');
    expect(once.count("SaveNewGroupCmd")).toBe(1);

    const twice = await themeStub({ dropSaves: 1 });
    const created = await twice.g.create("Night", { attempts: 2 });
    expect(created.name).toBe("Night");
    expect(twice.count("SaveNewGroupCmd")).toBe(2);
    expect(twice.themes).toHaveLength(1);

    const never = await themeStub({ dropSaves: 99 });
    await expect(never.g.create("Ghost", { attempts: 2 })).rejects.toThrow(
      /Unable to create theme/,
    );
  });

  it("create and rename trim the name, so it verifies without a resend", async () => {
    const { themes, count, g } = await themeStub();
    const created = await g.create("  Night  ", { attempts: 2 });
    expect(created.name).toBe("Night");
    expect(count("SaveNewGroupCmd")).toBe(1);

    await g.rename(created.systemId, " Evening ", { attempts: 2 });
    expect(themes[0]!.name).toBe("Evening");
    expect(count("SetGroupCmd")).toBe(1);
  });

  it("remove resends when asked and verifies the theme is gone", async () => {
    const { themes, count, g } = await themeStub({ dropDeletes: 1 });
    themes.push({ systemId: 33, name: "Old" });
    await g.remove(33, { attempts: 2 });
    expect(count("DeleteGroupCmd")).toBe(2);
    expect(themes.find((x) => x.systemId === 33)).toBeUndefined();
  });

  it("rename refuses a name another theme already has, before sending", async () => {
    const { themes, count, g, omni } = await themeStub();
    themes.push({ systemId: 33, name: "Old" }, { systemId: 34, name: "Night" });
    await omni.refresh();
    await expect(g.rename(33, "Night")).rejects.toThrow(
      'A theme named "Night" already exists',
    );
    expect(count("SetGroupCmd")).toBe(0);
    // its own name is not a collision
    await g.rename(33, "Old");
    expect(count("SetGroupCmd")).toBe(1);
  });
});
