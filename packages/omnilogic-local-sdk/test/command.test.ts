import { vi } from "vitest";

import {
  COMMANDS,
  SWITCH_OPCODE,
  type CommandName,
  type CommandResponseSpec,
} from "@/client/spec";
import type { BodyOfWater, MSPConfig } from "@/types/config";
import {
  countdownParams,
  parseCommandResponse,
  buildCommandXml,
  timerParams,
  type TimerOptions,
} from "@/utils/command";
import {
  CommandFailedError,
  EquipmentNotInstalledError,
  OmniTimeoutError,
  OmniValidationError,
  ReadingUnavailableError,
  SystemStateError,
} from "@/utils/errors";
import { parseConfig } from "@/utils/xml";

import {
  EMPTY_TELEMETRY,
  fixture,
  loadConfigFixture,
  makeRecorder,
  seeded,
  seededOmni,
  valuesOf,
} from "./mocks";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const build =
  (name: CommandName, params: Record<string, number | string>) => () =>
    buildCommandXml(name, params);

describe("buildCommandXml", () => {
  it("orders by spec order, reporting missing and unknown keys", () => {
    const { xml, unknown } = buildCommandXml("SetUIEquipmentCmd", {
      equipmentId: 5,
      poolId: 1,
      isOn: 1,
      isCountDownTimer: 0,
      startTimeHours: 0,
      startTimeMinutes: 0,
      endTimeHours: 0,
      endTimeMinutes: 0,
      daysActive: 0,
      recurring: 0,
      nope: 2,
    });
    expect(valuesOf(xml).slice(0, 3)).toEqual(["1", "5", "1"]);
    expect(unknown).toEqual(["nope"]);
    expect(() => buildCommandXml("SetUIEquipmentCmd", { poolId: 1 })).toThrow(
      /missing/i,
    );
  });

  it("carries a float, a string at its maxLength, and each declared value", () => {
    expect(
      valuesOf(
        buildCommandXml("UISetCSADTargetValue", {
          poolId: 1,
          equipmentId: 8,
          targetValue: 7.4,
        }).xml,
      ),
    ).toEqual(["1", "8", "7.4"]);
    expect(
      valuesOf(
        buildCommandXml("UiEditConfigObjectName", {
          equipmentId: 8,
          name: "0123456789abc",
        }).xml,
      )[1],
    ).toBe("0123456789abc");
    for (const amPm of ["AM", "PM"] as const) {
      expect(
        valuesOf(
          buildCommandXml("SetTime", { is24Hour: 0, hour: 7, minute: 30, amPm })
            .xml,
        )[3],
      ).toBe(amPm);
    }
  });

  it("refuses a value the spec rules out, before anything is sent", () => {
    expect(build("GetUIPoolTempCmd", { poolId: "1" })).toThrow(/poolId/);
    expect(build("GetUIPoolTempCmd", { poolId: "nope" })).toThrow(
      /non-numeric/,
    );
    expect(
      build("UiEditConfigObjectName", { equipmentId: 8, name: 3 }),
    ).toThrow(/name/);
    // the controller truncates an over-long name silently
    expect(
      build("UiEditConfigObjectName", {
        equipmentId: 8,
        name: "0123456789abcdefg",
      }),
    ).toThrow(/longer than the \d+ the controller keeps/);
    expect(
      build("SaveNewGroupCmd", {
        name: "0123456789abc",
        daysActive: 0,
        recurring: 0,
        poolId: 1,
      }),
    ).toThrow(/longer than the 12 the controller keeps/);
    // the controller reads anything that is not "AM" as PM
    expect(
      build("SetTime", { is24Hour: 0, hour: 7, minute: 30, amPm: "pm" }),
    ).toThrow(/amPm.*"AM", "PM"/);
    expect(build("GetUIPoolTempCmd", { poolId: 2147483648 })).toThrow(
      /between -2147483648 and 2147483647/,
    );
    expect(build("GetUIPoolTempCmd", { poolId: -2147483649 })).toThrow(
      OmniValidationError,
    );
    expect(build("GetUIPoolTempCmd", { poolId: 1.5 })).toThrow(
      /must be an integer/,
    );

    const byteCommand = (Object.keys(COMMANDS) as CommandName[]).find((c) =>
      COMMANDS[c].request.some((p) => p.type === "byte"),
    )!;
    const params: Record<string, number | string> = {};
    for (const p of COMMANDS[byteCommand].request) {
      params[p.name] = p.type === "string" ? (p.values?.[0] ?? "") : 1;
    }
    const byte = COMMANDS[byteCommand].request.find((p) => p.type === "byte")!;
    expect(build(byteCommand, { ...params, [byte.name]: 256 })).toThrow(
      /between 0 and 255/,
    );
    expect(build(byteCommand, { ...params, [byte.name]: 255 })).not.toThrow();
  });
});

describe("the timer block", () => {
  it("passes a fractional hour or minute through to the send, which refuses it", () => {
    for (const timer of [
      timerParams({ startTimeHours: 2.9 }),
      countdownParams(90.5),
    ]) {
      expect(() =>
        buildCommandXml("SetUIEquipmentCmd", {
          poolId: 1,
          equipmentId: 2,
          isOn: 1,
          ...timer,
        }),
      ).toThrow(OmniValidationError);
    }
  });

  it("sits at the tail of the four commands that carry it, in wire order", async () => {
    // distinct values so a swapped slot shows
    const timer: Required<TimerOptions> = {
      isCountdownTimer: true,
      startTimeHours: 1,
      startTimeMinutes: 2,
      endTimeHours: 3,
      endTimeMinutes: 4,
      daysActive: 5,
      recurring: true,
    };
    const tail = ["1", "1", "2", "3", "4", "5", "1"];
    const { omni, sent } = makeRecorder();
    await omni.command("SetUIEquipmentCmd", {
      poolId: 1,
      equipmentId: 5,
      isOn: 1,
      ...timerParams(timer),
    });
    await omni.command("SetUISpilloverCmd", {
      poolId: 1,
      data: 50,
      ...timerParams(timer),
    });
    await omni.command("RunGroupCmd", {
      equipmentId: 1,
      data: 1,
      ...timerParams(timer),
    });
    await omni.command("SetStandAloneLightShow", {
      poolId: 1,
      equipmentId: 8,
      data: 2,
      field19: 4,
      field1a: 4,
      field1b: 0,
      ...timerParams(timer),
    });
    expect(sent.map((s) => valuesOf(s.xml))).toEqual([
      ["1", "5", "1", ...tail],
      ["1", "50", ...tail],
      ["1", "1", ...tail],
      ["1", "8", "2", "4", "4", "0", ...tail],
    ]);
  });
});

describe("command() payloads", () => {
  it("carry each parameter with its wire dataType, in parse order", async () => {
    const { omni, sent } = makeRecorder();
    await omni.command("UISetCSADTargetValue", {
      poolId: 1,
      equipmentId: 8,
      targetValue: 7.4,
    });
    await omni.command("UiEditConfigObjectName", {
      equipmentId: 8,
      name: "Spa Lights",
    });
    await omni.command("SetTime2", {
      is24Hour: 0,
      hour: 7,
      minute: 30,
      second: 15,
      amPm: "PM",
    });
    await omni.command("SetDateTime", {
      year: 2026,
      month: 8,
      day: 25,
      is24Hour: 1,
      hour: 13,
      minute: 45,
      amPm: "PM",
    });
    expect(sent[0]!.xml).toContain('dataType="float">7.4<');
    expect(sent[1]!.xml).toContain('dataType="string">Spa Lights<');
    expect(valuesOf(sent[2]!.xml)).toEqual(["0", "7", "30", "15", "PM"]);
    expect(valuesOf(sent[3]!.xml)).toEqual([
      "2026",
      "8",
      "25",
      "1",
      "13",
      "45",
      "PM",
    ]);
  });
});

const xmlWith = (values: string[]) =>
  '<?xml version="1.0" encoding="UTF-8" ?>' +
  '<Response xmlns="http://nextgen.hayward.com/api"><Name>Rsp</Name>' +
  "<Parameters>" +
  values.map((v) => `<Parameter name="P" dataType="int">${v}</Parameter>`) +
  "</Parameters></Response>";

describe("responses", () => {
  it("parse positionally by the spec's names and dataTypes, not the wire's", async () => {
    const xml =
      '<?xml version="1.0" encoding="UTF-8" ?><Response xmlns="http://nextgen.hayward.com/api"><Name>UIGetPoolTempRsp</Name><Parameters><Parameter name="PoolID" dataType="int">1</Parameter><Parameter name="Temp" dataType="int" unit="F">86</Parameter></Parameters></Response>';
    const { omni } = makeRecorder({ response: xml });
    expect(await omni.command("GetUIPoolTempCmd", { poolId: 1 })).toEqual({
      poolId: 1,
      temp: 86,
    });
    const spec: CommandResponseSpec = {
      name: "Rsp",
      opcode: 1025,
      parameters: [
        { name: "count", dataType: "int" },
        { name: "speed", dataType: "byte" },
        { name: "enabled", dataType: "bool" },
        { name: "target", dataType: "float" },
      ],
    };
    expect(
      parseCommandResponse(spec, xmlWith(["86", "50", "1", "7.4"])),
    ).toEqual({
      ok: true,
      params: { count: 86, speed: 50, enabled: true, target: 7.4 },
    });
    const name: CommandResponseSpec = {
      name: "Rsp",
      opcode: 1333,
      parameters: [{ name: "name", dataType: "string" }],
    };
    for (const text of ["123", "no"]) {
      expect(parseCommandResponse(name, xmlWith([text]))).toEqual({
        ok: true,
        params: { name: text },
      });
    }
    expect(parseCommandResponse(spec, xmlWith(["1"]))).toEqual({
      ok: false,
      actual: 1,
      expected: 4,
    });
  });
});

const CONFIG_XML = fixture("config.xml");
// one body, no chlorinator, no heater: the absent cases
const MINIMAL_XML = fixture("config-minimal.xml");

const session = (xml = CONFIG_XML) => seededOmni({ xml });

// the config with a filter type the SDK has never seen on body 1
const configWithUnseenFilter = (xml = CONFIG_XML): MSPConfig => {
  const config = parseConfig(xml);
  return {
    ...config,
    backyard: {
      ...config.backyard,
      bodiesOfWater: config.backyard.bodiesOfWater.map((b) =>
        b.systemId === 1
          ? ({
              ...b,
              filter: { ...b.filter, filterType: "FMT_FUTURE" },
            } as unknown as BodyOfWater)
          : b,
      ),
    },
  };
};

const CHLOR = { poolId: 1, equipmentId: 6 };
const SET_MODE = { ...CHLOR, data: 1 };
const READ = { poolId: 1 };
const WRITE = { data: 1 };

// every read answers empty
const unanswered = (e: unknown) => {
  if (!String(e).endsWith("answered nothing")) {
    throw e;
  }
};

// the refresh between attempts sends GetTelemetry through the same recorder
const commandSends = (sent: { opcode: number }[]) =>
  sent.filter((s) => s.opcode !== SWITCH_OPCODE.GetTelemetry);

describe("command() gate", () => {
  it("refuses an absent requirement, an unknown body, or an unmet light gate with the reason, sending nothing; sends with no bodies at all", async () => {
    const { omni, sent } = await session(MINIMAL_XML);
    const err = (await omni
      .command("GetUICHLOROperatingMode", CHLOR)
      .catch((e: unknown) => e)) as EquipmentNotInstalledError;
    expect(err).toBeInstanceOf(EquipmentNotInstalledError);
    expect(err.command).toBe("GetUICHLOROperatingMode");
    expect(err.requirement).toBe("chlorinator");
    expect(err.poolId).toBe(1);
    expect(err.inventory.bodies).toHaveLength(1);
    expect(err.message).toMatch(/chlorinator is absent/);
    await expect(
      omni.command("SetUICHLOROperatingMode", SET_MODE),
    ).rejects.toBeInstanceOf(EquipmentNotInstalledError);
    expect(sent).toEqual([]);

    const full = await session();
    await expect(
      full.omni.command("GetUICHLOROperatingMode", {
        poolId: 9,
        equipmentId: 6,
      }),
    ).rejects.toBeInstanceOf(EquipmentNotInstalledError);
    const light = (await full.omni
      .command("SetUICLAllFindLightsStart", { poolId: 1, equipmentId: 8 })
      .catch((e: unknown) => e)) as EquipmentNotInstalledError;
    expect(light.requirement).toBe("light.networked");
    expect(full.sent).toEqual([]);

    const empty = await session(
      "<MSPConfig><System><Units>Standard</Units></System>" +
        "<Backyard><Name>Backyard</Name></Backyard></MSPConfig>",
    );
    expect(empty.omni.inventory.bodies).toEqual([]);
    await empty.omni.command("SetUICHLOROperatingMode", SET_MODE);
    expect(empty.sent).toHaveLength(1);
  });

  it("sends when the requirement is installed, switched off or not", async () => {
    const { omni, sent } = await session();
    await omni.command("GetUICHLOROperatingMode", CHLOR).catch(unanswered);
    await omni
      .command("GetUICHLOROperatingMode", { poolId: 2, equipmentId: 13 })
      .catch(unanswered);
    expect(sent).toHaveLength(2);
  });

  it("explains the cell id when the chlorinator's is used on a cell read", async () => {
    const { omni, sent } = await session();
    const err = (await omni
      .command("GetCHLORMeasurement", CHLOR)
      .catch((e: unknown) => e)) as EquipmentNotInstalledError;
    expect(err).toBeInstanceOf(EquipmentNotInstalledError);
    expect(err.hint).toBe(
      "it takes the cell id (7), not the chlorinator's (6)",
    );
    expect(sent).toEqual([]);
    await omni
      .command("GetCHLORMeasurement", { poolId: 1, equipmentId: 7 })
      .catch(unanswered);
    expect(valuesOf(sent[0]!.xml)).toEqual(["1", "7"]);
  });

  it("sends a variable-speed command for a filter type the SDK has never seen", async () => {
    const { omni, sent } = await seeded(configWithUnseenFilter());
    await omni
      .command("GetFilterLowSpeed", { poolId: 1, equipmentId: 3 })
      .catch(unanswered);
    expect(sent).toHaveLength(1);
  });

  it("refreshes first when no config or telemetry is cached, and only then; a config given at construction is cached", async () => {
    const fetches = { telemetry: 0, config: 0 };
    const script = {
      telemetry: () => {
        fetches.telemetry++;
        return {
          ...EMPTY_TELEMETRY,
          backyard: { configChksum: 2824508, state: 1 },
        };
      },
      config: () => {
        fetches.config++;
        return parseConfig(MINIMAL_XML);
      },
    };

    // the fetched config is what refuses the absent chlorinator
    const none = makeRecorder(script);
    await expect(
      none.omni.command("SetUICHLOROperatingMode", SET_MODE),
    ).rejects.toBeInstanceOf(EquipmentNotInstalledError);
    expect(fetches).toEqual({ telemetry: 1, config: 1 });
    await expect(
      none.omni.command("SetUICHLOROperatingMode", SET_MODE),
    ).rejects.toBeInstanceOf(EquipmentNotInstalledError);
    expect(fetches).toEqual({ telemetry: 1, config: 1 });
    expect(none.sent).toHaveLength(0);

    // a config given at construction is kept while its checksum matches
    const config = parseConfig(MINIMAL_XML);
    const cached = makeRecorder(script, { config });
    expect(cached.omni.config).toBe(config);
    expect(cached.omni.inventory.bodies).toHaveLength(1);
    await cached.omni.command("SetBeeper", { data: 1 });
    expect(fetches).toEqual({ telemetry: 2, config: 1 });

    const forced = makeRecorder(script);
    await forced.omni.command("SetUICHLOROperatingMode", SET_MODE, {
      force: true,
    });
    expect(fetches).toEqual({ telemetry: 2, config: 1 });
    expect(valuesOf(forced.sent[0]!.xml)).toEqual(["1", "6", "1"]);
  });

  it("refuses every write outside normal operation before sending, still reads, sends when forced, and refuses a resend once the controller leaves it", async () => {
    let state = 3;
    const { omni, sent } = makeRecorder({
      config: () => loadConfigFixture(),
      telemetry: () => ({
        ...EMPTY_TELEMETRY,
        backyard: { configChksum: 0, state },
      }),
    });

    for (const refused of [0, 2, 3, 4]) {
      state = refused;
      await omni.refresh({ refetch: true });
      await expect(
        omni.command("SetUICHLOROperatingMode", SET_MODE),
      ).rejects.toBeInstanceOf(SystemStateError);
    }
    await expect(
      omni.command("SetUISystemStateCmd", {
        data: 1,
        field1c: 0,
        isCountDownTimer: 0,
      }),
    ).rejects.toThrow("normal operating state (state: Timed Service Mode)");
    expect(sent).toHaveLength(0);

    await omni.command("GetCHLOREnable", CHLOR).catch(unanswered);
    expect(sent).toHaveLength(1);

    await omni.command("SetUICHLOROperatingMode", SET_MODE, {
      force: true,
    });
    expect(sent).toHaveLength(2);

    state = 1;
    await omni.refresh({ refetch: true });
    await omni.command("SetUICHLOROperatingMode", SET_MODE);
    expect(sent).toHaveLength(3);

    const leaving = makeRecorder({
      onSend: () => {
        state = 3;
      },
      config: () => loadConfigFixture(),
      telemetry: () => ({
        ...EMPTY_TELEMETRY,
        backyard: { configChksum: 0, state },
      }),
    });
    await leaving.omni.refresh({ refetch: true });
    await expect(
      leaving.omni.command("SetUICHLOROperatingMode", SET_MODE, {
        verify: () => false,
        attempts: 2,
      }),
    ).rejects.toBeInstanceOf(SystemStateError);
    expect(leaving.sent).toHaveLength(1);
  });
});

describe("command() verify", () => {
  it("rethrows a validation error instead of verifying a send that never left", async () => {
    const { omni, sent } = makeRecorder();
    await expect(
      omni.command(
        "SaveNewGroupCmd",
        { name: "Thirteen chars", daysActive: 0, recurring: 0, poolId: 1 },
        { verify: () => false, failure: "Unable to create theme" },
      ),
    ).rejects.toBeInstanceOf(OmniValidationError);
    expect(sent).toHaveLength(0);
  });

  it("fails unverified when the refresh it checks with fails", async () => {
    let fetches = 0;
    const { omni, sent } = makeRecorder({
      telemetry: () => {
        fetches++;
        if (fetches > 1) {
          throw new OmniTimeoutError("no telemetry");
        }
        return EMPTY_TELEMETRY;
      },
    });
    const error = (await omni
      .command("SetBackLight", WRITE, {
        verify: () => true,
        attempts: 3,
        failure: "Unable to set the backlight",
      })
      .catch((e: unknown) => e)) as CommandFailedError;
    expect(error).toBeInstanceOf(CommandFailedError);
    expect(error.message).toBe("Unable to set the backlight");
    expect(error.cause).toBeInstanceOf(OmniTimeoutError);
    expect(commandSends(sent)).toHaveLength(1);
  });

  it("carries the last send error when every attempt fails to verify", async () => {
    const { omni, sent } = makeRecorder({
      onSend: () => {
        throw new OmniTimeoutError("no ack");
      },
    });
    const error = (await omni
      .command("SetBackLight", WRITE, { verify: () => false, attempts: 2 })
      .catch((e: unknown) => e)) as CommandFailedError;
    expect(error).toBeInstanceOf(CommandFailedError);
    expect(error.attempts).toBe(2);
    expect(error.cause).toBeInstanceOf(OmniTimeoutError);
    expect(commandSends(sent)).toHaveLength(2);
  });

  it("throws the send's error when verify passes but the reply never arrived", async () => {
    const { omni } = makeRecorder();
    await expect(
      omni.command("GetUIPoolTempCmd", READ, { verify: () => true }),
    ).rejects.toThrow("GetUIPoolTempCmd answered nothing");
  });

  it("throws CommandFailedError with the caller's message or the command's name, a reading unavailable counting as not verified yet", async () => {
    const { omni, sent } = makeRecorder();
    const error = (await omni
      .command("GetUIPoolTempCmd", READ, {
        verify: () => false,
        failure: "Unable to read the pool",
      })
      .catch((e: unknown) => e)) as CommandFailedError;
    expect(error).toBeInstanceOf(CommandFailedError);
    expect(error.message).toBe("Unable to read the pool");
    expect(error.command).toBe("GetUIPoolTempCmd");
    expect(error.attempts).toBe(1);
    expect(commandSends(sent)).toHaveLength(1);
    await expect(
      omni.command("GetUIPoolTempCmd", READ, { verify: () => false }),
    ).rejects.toThrow("GetUIPoolTempCmd failed");
    await expect(
      omni.command("GetUIPoolTempCmd", READ, {
        verify: () => {
          throw new ReadingUnavailableError({
            name: "Heater",
            backyardState: 3,
          });
        },
      }),
    ).rejects.toBeInstanceOf(CommandFailedError);
  });

  it("refreshes before each check, resends up to attempts, stops once verify passes, never resends without verify", async () => {
    let fetches = 0;
    const passes = makeRecorder({
      telemetry: () => {
        fetches++;
        return EMPTY_TELEMETRY;
      },
    });
    let checks = 0;
    let refreshed = false;
    await passes.omni.command("SetBackLight", WRITE, {
      verify: () => {
        // the first fetch is the refresh before the send
        refreshed = fetches === 1 + ++checks;
        return checks === 2;
      },
      attempts: 3,
    });
    expect(refreshed).toBe(true);
    expect(commandSends(passes.sent)).toHaveLength(2);
    expect(passes.sent[1]!.opcode).toBe(COMMANDS.SetBackLight.opcode);

    const fails = makeRecorder();
    const error = (await fails.omni
      .command("GetUIPoolTempCmd", READ, { verify: () => false, attempts: 3 })
      .catch((e: unknown) => e)) as CommandFailedError;
    expect(error.attempts).toBe(3);
    expect(commandSends(fails.sent)).toHaveLength(3);

    const plain = makeRecorder();
    await plain.omni
      .command("GetUIPoolTempCmd", READ, { attempts: 3 })
      .catch(() => {});
    expect(commandSends(plain.sent)).toHaveLength(1);
  });

  it("keeps checking until timeoutMs before an attempt fails", async () => {
    const { omni, sent } = makeRecorder();
    let checks = 0;
    await omni.command("SetBackLight", WRITE, {
      verify: () => ++checks === 3,
      timeoutMs: 1000,
      pollMs: 0,
    });
    expect(checks).toBe(3);
    expect(commandSends(sent)).toHaveLength(1);
  });
});
