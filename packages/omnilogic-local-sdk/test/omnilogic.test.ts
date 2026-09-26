import { vi } from "vitest";

import { MIN_MSP_VERSION, OmniLogic } from "@/client/omnilogic";
import { COMMANDS, SWITCH_OPCODE } from "@/client/spec";
import { DEFAULT_TIMINGS } from "@/transport/protocol";
import type { Telemetry } from "@/types/telemetry";
import { timerParams } from "@/utils/command";
import { FirmwareTooOldError } from "@/utils/errors";

import {
  EMPTY_TELEMETRY,
  fixture,
  loadConfigFixture,
  makeRecorder,
} from "./mocks";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const stamped = (mspVersion: string): Telemetry =>
  ({
    ...EMPTY_TELEMETRY,
    backyard: { ...EMPTY_TELEMETRY.backyard, mspVersion },
  }) as unknown as Telemetry;

describe("OmniLogic", () => {
  it("shares one first refresh among commands that arrive before it ends", async () => {
    let fetches = 0;
    const { omni, sent } = makeRecorder({
      telemetry: () => {
        fetches++;
        return EMPTY_TELEMETRY;
      },
    });
    await Promise.all(
      [1, 2, 3].map(() => omni.command("SetBackLight", { data: 1 })),
    );
    expect(fetches).toBe(1);
    expect(sent).toHaveLength(3);
  });

  it("sends a read up to the session's readAttempts and a write once", async () => {
    const { omni, sent } = makeRecorder(
      {
        response:
          "<Response><Parameters>" +
          '<Parameter name="PoolID" dataType="int">1</Parameter>' +
          '<Parameter name="Temp" dataType="int">80</Parameter>' +
          "</Parameters></Response>",
        realFetches: true,
      },
      { readAttempts: 4 },
    );
    await omni.fetchTelemetry({ raw: true });
    await omni.command("GetUIPoolTempCmd", { poolId: 1 }, { force: true });
    await omni.command(
      "GetUIPoolTempCmd",
      { poolId: 1 },
      { force: true, attempts: 2 },
    );
    await omni.command("SetBackLight", { data: 1 }, { force: true });
    expect(sent.map((s) => s.attempts)).toEqual([4, 4, 2, undefined]);
  });

  it("keeps refreshing after the clock steps backwards", async () => {
    let checksum = 7;
    let fetches = 0;
    const { omni } = makeRecorder(
      {
        telemetry: () => {
          fetches++;
          return { backyard: { configChksum: checksum, state: 1 } };
        },
        config: () => ({ backyard: { bodiesOfWater: [] } }),
      },
      { cacheTTL: 3600 },
    );
    await omni.refresh({ refetch: true });
    expect(fetches).toBe(1);

    const realNow = Date.now;
    vi.spyOn(Date, "now").mockImplementation(() => realNow() - 60_000);
    try {
      checksum = 8;
      await omni.refresh();
      expect(fetches).toBe(2);
      expect(omni.configChecksum).toBe(8);
    } finally {
      vi.mocked(Date.now).mockRestore();
    }
  });

  it("starts with the default timings and nothing cached", () => {
    const omni = new OmniLogic({
      host: "127.0.0.1",
      timings: { ackTimeoutMs: undefined, minSendGapMs: 0 },
    });
    expect(omni.timings).toEqual({ ...DEFAULT_TIMINGS, minSendGapMs: 0 });
    expect(() => omni.config).toThrow("call refresh() first");
    expect(() => omni.telemetry).toThrow("call refresh() first");
    expect(() => omni.inventory).toThrow("call refresh() first");
    expect(omni.configChecksum).toBe(0);
    expect(omni.mspVersion).toBeUndefined();
  });

  it("fetches and answers raw on request, touching no cache and still checking a reply's shape", async () => {
    const xml = fixture("config.xml");
    const { omni, sent } = makeRecorder({ response: xml, realFetches: true });
    const config = await omni.fetchConfig();
    expect(config.backyard.bodiesOfWater.length).toBeGreaterThan(0);
    expect(await omni.fetchConfig({ raw: true })).toBe(xml);
    expect(await omni.fetchSysInfo({ raw: true })).toBe(xml);
    expect(await omni.fetchTelemetry({ raw: true })).toBe(xml);
    expect(sent[0]!.opcode).toBe(SWITCH_OPCODE.RequestConfiguration);
    expect(() => omni.config).toThrow("call refresh() first");

    const reply =
      '<?xml version="1.0" encoding="UTF-8" ?><Response xmlns="http://nextgen.hayward.com/api"><Name>UIGetPoolTempRsp</Name><Parameters><Parameter name="PoolID" dataType="int">1</Parameter><Parameter name="Temp" dataType="int" unit="F">86</Parameter></Parameters></Response>';
    const answered = makeRecorder({ response: reply });
    const raw = await answered.omni.command(
      "GetUIPoolTempCmd",
      { poolId: 1 },
      { raw: true },
    );
    expect(raw).toBe(reply);
    const acked = await answered.omni.command(
      "SetUIPoolFilterCmd",
      { poolId: 1, equipmentId: 3, data: 1, ...timerParams() },
      { raw: true },
    );
    expect(acked).toBeUndefined();
    const empty = makeRecorder({ response: "<Response/>" });
    await expect(
      empty.omni.command("GetUIPoolTempCmd", { poolId: 1 }, { raw: true }),
    ).rejects.toThrow("GetUIPoolTempCmd answered nothing");
  });

  it("a cache TTL of 0 reads every time, even within the same second", async () => {
    let telemetry = 0;
    const { omni } = makeRecorder(
      {
        telemetry: () => {
          telemetry++;
          return { backyard: { configChksum: 1, mspVersion: "R1", state: 1 } };
        },
        config: () => ({ backyard: { bodiesOfWater: [] } }),
      },
      { cacheTTL: 0 },
    );
    await omni.refresh();
    await omni.refresh();
    expect(telemetry).toBe(2);
  });

  it("starts dirty, skips a fresh refresh, refetches config only when the checksum moves", async () => {
    const calls = { telemetry: 0, config: 0 };
    let checksum = 7;
    const { omni } = makeRecorder(
      {
        telemetry: () => {
          calls.telemetry++;
          return {
            backyard: { configChksum: checksum, mspVersion: "R1", state: 1 },
          };
        },
        config: () => {
          calls.config++;
          return { backyard: { bodiesOfWater: [] } };
        },
      },
      { cacheTTL: 3600 },
    );

    expect(omni.telemetryDirty).toBe(true);
    await omni.refresh();
    expect(calls).toEqual({ telemetry: 1, config: 1 });
    expect(omni.telemetryDirty).toBe(false);

    // not dirty and within the TTL: a no-op
    await omni.refresh();
    expect(calls).toEqual({ telemetry: 1, config: 1 });

    // a write marks it dirty, and the same checksum refetches telemetry alone
    await omni.command("SetBeeper", { data: 1 });
    await omni.refresh();
    expect(calls).toEqual({ telemetry: 2, config: 1 });

    checksum = 8;
    await omni.command("SetBeeper", { data: 0 });
    await omni.refresh();
    expect(calls).toEqual({ telemetry: 3, config: 2 });
    expect(omni.configChecksum).toBe(8);

    await omni.refresh({ refetch: true });
    expect(calls).toEqual({ telemetry: 4, config: 3 });
  });

  it("marks the cache dirty when a write's send fails", async () => {
    let fetches = 0;
    const { omni } = makeRecorder(
      {
        onSend: () => {
          throw new Error("timeout");
        },
        telemetry: () => {
          fetches++;
          return EMPTY_TELEMETRY;
        },
      },
      { cacheTTL: 3600 },
    );
    await omni.refresh();
    await expect(omni.command("SetBeeper", { data: 1 })).rejects.toThrow(
      "timeout",
    );
    expect(omni.telemetryDirty).toBe(true);
    await omni.refresh();
    expect(fetches).toBe(2);
  });

  it("stays due for a refresh when the config fetch fails", async () => {
    let configFails = true;
    const { omni } = makeRecorder(
      {
        telemetry: () => ({ backyard: { configChksum: 1, mspVersion: "R1" } }),
        config: () => {
          if (configFails) {
            throw new Error("timeout");
          }
          return { backyard: { bodiesOfWater: [] } };
        },
      },
      { cacheTTL: 3600 },
    );
    await expect(omni.refresh()).rejects.toThrow("timeout");
    configFails = false;
    await omni.refresh();
    expect(omni.config.backyard.bodiesOfWater).toEqual([]);
  });

  it("leaves the cache clean after a read, dirty after anything else, and dirty when a write lands mid-refresh", async () => {
    const { omni } = makeRecorder();
    await omni.refresh();
    await omni.command("GetUIPoolTempCmd", { poolId: 1 }).catch(() => {});
    expect(omni.telemetryDirty).toBe(false);
    await omni.command("SetUIEquipmentCmd", {
      poolId: 1,
      equipmentId: 3,
      isOn: 1,
      ...timerParams(),
    });
    expect(omni.telemetryDirty).toBe(true);

    const fetched = Promise.withResolvers<typeof EMPTY_TELEMETRY>();
    let telemetry: Promise<typeof EMPTY_TELEMETRY> | typeof EMPTY_TELEMETRY =
      EMPTY_TELEMETRY;
    const racing = makeRecorder({ telemetry: () => telemetry });
    await racing.omni.refresh();
    telemetry = fetched.promise;
    const refreshing = racing.omni.refresh({ refetch: true });
    await racing.omni.command("SetBackLight", { data: 1 });
    fetched.resolve(EMPTY_TELEMETRY);
    await refreshing;
    expect(racing.omni.telemetryDirty).toBe(true);
  });

  it("keeps the telemetry of the refresh that started later", async () => {
    const config = loadConfigFixture();
    const pending: ((t: Telemetry) => void)[] = [];
    const { omni } = makeRecorder(
      {
        config: () => config,
        telemetry: () => new Promise<Telemetry>((r) => pending.push(r)),
      },
      { config },
    );
    const first = omni.refresh({ refetch: true });
    await new Promise((r) => setTimeout(r, 2));
    const second = omni.refresh({ refetch: true });
    pending[1]!(stamped("second"));
    await second;
    pending[0]!(stamped("first"));
    await first;
    expect(omni.mspVersion).toBe("second");
  });

  it("logs a spec caveat at warn and sends anyway; no caveat, no warning", async () => {
    vi.stubEnv("LOG_LEVEL", "warn");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { omni, sent } = makeRecorder();
    const schedule = {
      poolId: 1,
      equipmentId: 6,
      data: 15,
      isCountDownTimer: 0,
      startTimeHours: 0,
      startTimeMinutes: 0,
      endTimeHours: 0,
      endTimeMinutes: 0,
      daysActive: 0,
      recurring: 0,
    };
    await omni.command("SetChlorinatorScheduleCmd", schedule).catch(() => {});
    expect(sent.map((s) => s.opcode)).toEqual([290]);
    expect(error).toHaveBeenCalledTimes(1);
    const line = error.mock.calls[0]![0] as string;
    expect(line).toContain("SetChlorinatorScheduleCmd");
    expect(line).toContain(COMMANDS.SetChlorinatorScheduleCmd.caveat!.effect);
    expect(line).toContain("alternative=SetCHLORTimePercent");

    await omni
      .command("SetCHLORTimePercent", { poolId: 1, equipmentId: 6, data: 12 })
      .catch(() => {});
    expect(sent).toHaveLength(2);
    expect(error).toHaveBeenCalledTimes(1);
  });
});

// a recorder whose controller reports the given firmware
const session = (mspVersion?: string) =>
  makeRecorder({
    telemetry: () => ({
      ...EMPTY_TELEMETRY,
      backyard: { ...EMPTY_TELEMETRY.backyard, mspVersion },
    }),
  });

describe("the firmware floor", () => {
  it("refuses a controller below the minimum firmware version, naming it, and lets an unreadable one through", async () => {
    await expect(session("R0501000").omni.refresh()).rejects.toThrow(
      "R0501000",
    );
    await expect(session("R0409000").omni.refresh()).rejects.toThrow(
      FirmwareTooOldError,
    );
    for (const accepted of [MIN_MSP_VERSION, "R0502001", "R0600000"]) {
      await expect(session(accepted).omni.refresh()).resolves.toBeUndefined();
    }
    for (const unreadable of [undefined, "4.3.0"]) {
      await expect(session(unreadable).omni.refresh()).resolves.toBeUndefined();
    }
  });

  it("refreshes from, and sends to, a refused controller when forced", async () => {
    const { omni, sent } = session("R0409000");
    await expect(omni.refresh()).rejects.toThrow(FirmwareTooOldError);
    await expect(omni.refresh({ force: true })).resolves.toBeUndefined();
    await omni.command(
      "SetUIEquipmentCmd",
      { poolId: 1, equipmentId: 3, isOn: 1, ...timerParams() },
      { force: true },
    );
    expect(sent).toHaveLength(1);
  });
});
