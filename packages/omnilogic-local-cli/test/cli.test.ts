import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  COMMANDS,
  parseConfig,
  SWITCH_OPCODE,
} from "@rygine/omnilogic-local-sdk";
import { vi } from "vitest";

import {
  cli,
  CONFIG_XML,
  POOL_TEMP_REPLY,
  SYSINFO_XML,
  TELEMETRY_XML,
} from "./harness";

const HOST = ["--host", "192.168.1.100"];

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("help and version", () => {
  it("prints the help with no command, --help, or -h, and exits 0", async () => {
    for (const args of [[], ["--help"], ["-h"], ["config", "--help"]]) {
      const r = await cli(args);
      expect(r.code).toBe(0);
      expect(r.stdout).toContain("Usage: omnilogic-local <command> [options]");
      expect(r.stdout).toContain("(default: 300)");
      expect(r.sent).toEqual([]);
    }
  });

  it("matches the help shown in the guide", async () => {
    const r = await cli(["--help"]);
    const guide = readFileSync(
      join(import.meta.dirname, "../../../apps/docs/guide/cli.md"),
      "utf8",
    );
    expect(guide).toContain("```\n" + r.stdout + "```\n");
  });

  it("prints the version", async () => {
    const r = await cli(["--version"]);
    expect(r.code).toBe(0);
    expect(r.stdout).toMatch(/^\d+\.\d+\.\d+\n$/);
  });

  it("rejects an unknown command with exit 2", async () => {
    const r = await cli(["frobnicate", ...HOST]);
    expect(r.code).toBe(2);
    expect(r.stderr).toContain('unknown command "frobnicate"');
    expect(r.stdout).toBe("");
  });

  it("names the command before anything else is read", async () => {
    const r = await cli(["frobnicate"]);
    expect(r.code).toBe(2);
    expect(r.stderr).toContain('unknown command "frobnicate"');
    expect(r.stdout).toBe("");
  });

  it("suggests a command name before its flags are parsed", async () => {
    const r = await cli(["command", "GetUIPoolTemp", "--poolId", "1", ...HOST]);
    expect(r.code).toBe(2);
    expect(r.stderr).toContain("did you mean GetUIPoolTempCmd");
    expect(r.sent).toEqual([]);
  });

  it("reads options placed before the command name", async () => {
    const r = await cli(
      ["--poolId", "1", ...HOST, "command", "GetUIPoolTempCmd"],
      {
        answers: {
          [SWITCH_OPCODE.RequestConfiguration]: CONFIG_XML,
          [SWITCH_OPCODE.GetTelemetry]: TELEMETRY_XML,
          [COMMANDS.GetUIPoolTempCmd.opcode]: POOL_TEMP_REPLY,
        },
      },
    );
    expect(r.code).toBe(0);
    expect(r.stdout).toBe(`${POOL_TEMP_REPLY}\n`);
  });

  it("rejects an unknown option with exit 2", async () => {
    const r = await cli(["config", "--bogus", ...HOST]);
    expect(r.code).toBe(2);
    expect(r.stderr).toMatch(/--bogus/);
  });
});

describe("host and port", () => {
  it("needs a host from the flag or the environment", async () => {
    const r = await cli(["config"]);
    expect(r.code).toBe(2);
    expect(r.stderr).toContain("--host or OMNILOGIC_LOCAL_HOST is required");
    vi.stubEnv("OMNILOGIC_LOCAL_HOST", "192.168.1.100");
    const ok = await cli(["config"], {
      answers: { [SWITCH_OPCODE.RequestConfiguration]: CONFIG_XML },
    });
    expect(ok.code).toBe(0);
    expect(ok.stderr).toContain("192.168.1.100");
  });

  it("rejects a port outside 1..65535", async () => {
    const r = await cli(["config", ...HOST, "--port", "70000"]);
    expect(r.code).toBe(2);
    expect(r.stderr).toContain("--port");
  });

  it("takes only a whole number for --port and --cache-ttl", async () => {
    for (const flag of ["--port", "--cache-ttl"]) {
      for (const text of ["", " 80", "0x10", "1e3", "8.0"]) {
        const r = await cli(["config", ...HOST, `${flag}=${text}`]);
        expect(r.code, `${flag} "${text}"`).toBe(2);
        expect(r.stderr).toContain(`${flag} must be a whole number`);
        expect(r.sent).toEqual([]);
      }
    }
  });

  it("takes the default port when the environment leaves it blank", async () => {
    vi.stubEnv("OMNILOGIC_LOCAL_PORT", "");
    const r = await cli(["config", ...HOST], {
      answers: { [SWITCH_OPCODE.RequestConfiguration]: CONFIG_XML },
    });
    expect(r.code).toBe(0);
    expect(r.stderr).toContain("192.168.1.100:10444");
  });
});

describe("the fetches", () => {
  it("prints the configuration XML verbatim and caches it", async () => {
    const r = await cli(["config", ...HOST], {
      answers: { [SWITCH_OPCODE.RequestConfiguration]: CONFIG_XML },
    });
    expect(r.code).toBe(0);
    // the fixture ends in a newline
    expect(r.stdout).toBe(CONFIG_XML);
    expect(r.sent.map((s) => s.opcode)).toEqual([
      SWITCH_OPCODE.RequestConfiguration,
    ]);
    expect(r.stderr).toContain("config: fetching from 192.168.1.100:10444");
    const again = await cli(["config", ...HOST, "--format", "json"], {
      answers: { [SWITCH_OPCODE.RequestConfiguration]: CONFIG_XML },
      dir: r.dir,
    });
    expect(
      JSON.parse(again.stdout).backyard.bodiesOfWater.length,
    ).toBeGreaterThan(0);
  });

  it("prints telemetry and sysinfo, XML or JSON", async () => {
    const answers = {
      [SWITCH_OPCODE.GetTelemetry]: TELEMETRY_XML,
      [SWITCH_OPCODE.GetSysInfo]: SYSINFO_XML,
    };
    const t = await cli(["telemetry", ...HOST], { answers });
    expect(t.stdout).toBe(`${TELEMETRY_XML}\n`);
    const tj = await cli(["telemetry", ...HOST, "--format", "json"], {
      answers,
    });
    expect(JSON.parse(tj.stdout).backyard.airTemp).toBe(72);
    const s = await cli(["sysinfo", ...HOST, "--format=json"], { answers });
    expect(JSON.parse(s.stdout).components[0].devName).toBe("MSP");
  });

  it("rejects a format other than xml or json", async () => {
    const r = await cli(["telemetry", ...HOST, "--format", "yaml"]);
    expect(r.code).toBe(2);
    expect(r.sent).toEqual([]);
  });

  it("says nothing on stderr with --quiet", async () => {
    const r = await cli(["telemetry", ...HOST, "-q"], {
      answers: { [SWITCH_OPCODE.GetTelemetry]: TELEMETRY_XML },
    });
    expect(r.stderr).toBe("");
  });

  it("turns the SDK log on with --debug unless LOG_LEVEL is already set", async () => {
    vi.stubEnv("LOG_LEVEL", undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    await cli(["telemetry", ...HOST, "--debug"], {
      answers: { [SWITCH_OPCODE.GetTelemetry]: TELEMETRY_XML },
    });
    expect(process.env.LOG_LEVEL).toBe("debug");
    vi.stubEnv("LOG_LEVEL", "trace");
    await cli(["telemetry", ...HOST, "--debug"], {
      answers: { [SWITCH_OPCODE.GetTelemetry]: TELEMETRY_XML },
    });
    expect(process.env.LOG_LEVEL).toBe("trace");
    error.mockRestore();
  });

  it("reports a transport failure on one line with exit 1", async () => {
    const r = await cli(["telemetry", ...HOST], {
      answers: { [SWITCH_OPCODE.GetTelemetry]: "<nope/>" },
    });
    expect(r.code).toBe(1);
    expect(r.stderr).toContain("no <STATUS> element");
  });
});

describe("info", () => {
  it("lists every command, or describes one", async () => {
    const list = await cli(["info"]);
    expect(list.code).toBe(0);
    expect(list.stdout).toMatch(/^GetUIPoolTempCmd\s+25\s+read$/m);
    const one = await cli(["info", "SetUIPoolFilterCmd"]);
    expect(one.stdout).toContain("SetUIPoolFilterCmd  opcode 8  write");
    const json = await cli(["info", "SetUIPoolFilterCmd", "--format", "json"]);
    expect(JSON.parse(json.stdout).opcode).toBe(8);
    expect(list.sent).toEqual([]);
  });

  it("suggests names for an unknown command", async () => {
    const r = await cli(["info", "pooltemp"]);
    expect(r.code).toBe(2);
    expect(r.stderr).toContain("GetUIPoolTempCmd");
  });
});

describe("command", () => {
  const CONFIG = {
    [SWITCH_OPCODE.RequestConfiguration]: CONFIG_XML,
    [SWITCH_OPCODE.GetTelemetry]: TELEMETRY_XML,
  };
  const POOL_TEMP = {
    ...CONFIG,
    [COMMANDS.GetUIPoolTempCmd.opcode]: POOL_TEMP_REPLY,
  };

  it("sends a read without asking and prints the reply", async () => {
    const r = await cli(
      ["command", "GetUIPoolTempCmd", "--poolId", "1", ...HOST],
      {
        answers: POOL_TEMP,
      },
    );
    expect(r.code).toBe(0);
    expect(r.stdout).toBe(`${POOL_TEMP_REPLY}\n`);
    expect(r.sent.map((s) => s.opcode)).toEqual([
      SWITCH_OPCODE.RequestConfiguration,
      SWITCH_OPCODE.GetTelemetry,
      COMMANDS.GetUIPoolTempCmd.opcode,
    ]);
    expect(r.stderr).toContain("config: fetching");
    expect(r.stderr).toContain("GetUIPoolTempCmd: poolId=1");
    expect(r.stderr).not.toContain("Send it?");
  });

  it("prints the parsed reply with --format json", async () => {
    const r = await cli(
      [
        "command",
        "GetUIPoolTempCmd",
        "--poolId",
        "1",
        "--format",
        "json",
        ...HOST,
      ],
      {
        answers: POOL_TEMP,
      },
    );
    expect(JSON.parse(r.stdout)).toEqual({ poolId: 1, temp: 86 });
  });

  it("reuses a cached config younger than the ttl and refetches an older one", async () => {
    const first = await cli(["config", ...HOST], { answers: CONFIG });
    const r = await cli(
      ["command", "GetUIPoolTempCmd", "--poolId", "1", ...HOST],
      {
        answers: POOL_TEMP,
        dir: first.dir,
      },
    );
    expect(r.sent.map((s) => s.opcode)).toEqual([
      SWITCH_OPCODE.GetTelemetry,
      COMMANDS.GetUIPoolTempCmd.opcode,
    ]);
    expect(r.stderr).toMatch(/config: cached \d+s ago/);
    const forced = await cli(
      [
        "command",
        "GetUIPoolTempCmd",
        "--poolId",
        "1",
        "--cache-ttl",
        "0",
        ...HOST,
      ],
      {
        answers: POOL_TEMP,
        dir: first.dir,
      },
    );
    expect(forced.sent.map((s) => s.opcode)).toEqual([
      SWITCH_OPCODE.RequestConfiguration,
      SWITCH_OPCODE.GetTelemetry,
      COMMANDS.GetUIPoolTempCmd.opcode,
    ]);
  });

  it("asks before a write and sends on y", async () => {
    const r = await cli(
      [
        "command",
        "SetUIFilterSpeedCmd",
        "--poolId",
        "1",
        "--equipmentId",
        "3",
        "--data",
        "75",
        ...HOST,
      ],
      {
        answers: CONFIG,
        stdin: "y\n",
        tty: true,
      },
    );
    expect(r.code).toBe(0);
    expect(r.stderr).toContain(
      "SetUIFilterSpeedCmd writes to the controller. Send it? [y/N/a]",
    );
    expect(r.sent.map((s) => s.opcode)).toEqual([
      SWITCH_OPCODE.RequestConfiguration,
      SWITCH_OPCODE.GetTelemetry,
      COMMANDS.SetUIFilterSpeedCmd.opcode,
    ]);
    expect(r.stdout).toBe("");
    expect(r.stderr).toContain("sent; acknowledged");
  });

  it("sends nothing and exits 3 on any other answer, including EOF", async () => {
    for (const stdin of ["n\n", "\n", "maybe\n", ""]) {
      const r = await cli(
        [
          "command",
          "SetUIFilterSpeedCmd",
          "--poolId",
          "1",
          "--equipmentId",
          "3",
          "--data",
          "75",
          ...HOST,
        ],
        {
          answers: CONFIG,
          stdin,
          tty: true,
        },
      );
      expect(r.code).toBe(3);
      expect(r.sent.map((s) => s.opcode)).toEqual([
        SWITCH_OPCODE.RequestConfiguration,
        SWITCH_OPCODE.GetTelemetry,
      ]);
      expect(r.stderr).toContain("SetUIFilterSpeedCmd not sent");
    }
  });

  it("sends nothing and exits 3 on ctrl-c at the prompt", async () => {
    const r = await cli(
      [
        "command",
        "SetUIFilterSpeedCmd",
        "--poolId",
        "1",
        "--equipmentId",
        "3",
        "--data",
        "75",
        ...HOST,
      ],
      { answers: CONFIG, stdin: "\x03", tty: true },
    );
    expect(r.code).toBe(3);
    expect(r.sent.map((s) => s.opcode)).not.toContain(
      COMMANDS.SetUIFilterSpeedCmd.opcode,
    );
    expect(r.stderr).toContain("SetUIFilterSpeedCmd not sent");
  });

  it("remembers the command on a, and never asks again", async () => {
    const args = [
      "command",
      "SetUIFilterSpeedCmd",
      "--poolId",
      "1",
      "--equipmentId",
      "3",
      "--data",
      "75",
      ...HOST,
    ];
    const first = await cli(args, { answers: CONFIG, stdin: "a\n", tty: true });
    expect(first.code).toBe(0);
    expect(
      JSON.parse(readFileSync(join(first.dir, "safe.json"), "utf8")),
    ).toEqual(["SetUIFilterSpeedCmd"]);
    const second = await cli(args, {
      answers: CONFIG,
      stdin: "",
      tty: true,
      dir: first.dir,
    });
    expect(second.code).toBe(0);
    expect(second.stderr).not.toContain("Send it?");
    expect(second.sent.map((s) => s.opcode)).toContain(
      COMMANDS.SetUIFilterSpeedCmd.opcode,
    );
  });

  it("fills the timer block with no timer when its flags are left out", async () => {
    const r = await cli(
      [
        "command",
        "SetUIEquipmentCmd",
        "--poolId",
        "1",
        "--equipmentId",
        "3",
        "--isOn",
        "1",
        "-y",
        ...HOST,
      ],
      { answers: CONFIG },
    );
    expect(r.code).toBe(0);
    const values = [
      ...r.sent[2]!.xml.matchAll(/<Parameter\b[^>]*>([^<]*)<\/Parameter>/g),
    ].map((m) => m[1]);
    expect(values).toEqual(["1", "3", "1", "0", "0", "0", "0", "0", "0", "0"]);
    const given = await cli(
      [
        "command",
        "SetUIEquipmentCmd",
        "--poolId",
        "1",
        "--equipmentId",
        "3",
        "--isOn",
        "1",
        "--daysActive",
        "127",
        "-y",
        ...HOST,
      ],
      { answers: CONFIG },
    );
    expect(given.sent[2]!.xml).toContain(
      'name="daysActive" dataType="byte">127<',
    );
    // daysActive on a schedule is not a timer field: still required
    const schedule = await cli(["command", "SaveNewGroupCmd", "--help"]);
    expect(schedule.stdout).toContain("--daysActive <byte>");
    expect(schedule.stdout).not.toContain("[--daysActive");
  });

  it("refuses a write outside normal operation, unless forced", async () => {
    const r = await cli(
      ["command", "SetBackLight", "--data", "1", "-y", ...HOST],
      {
        answers: {
          ...CONFIG,
          [SWITCH_OPCODE.GetTelemetry]: TELEMETRY_XML.replace(
            'state="1"',
            'state="3"',
          ),
        },
      },
    );
    expect(r.code).toBe(1);
    expect(r.stderr).toContain(
      "SetBackLight refused: the controller must be in a normal operating state (state: Config Mode).\n\nPass --force to ignore this error.\n",
    );
    expect(r.sent.map((s) => s.opcode)).toEqual([
      SWITCH_OPCODE.RequestConfiguration,
      SWITCH_OPCODE.GetTelemetry,
    ]);

    const forced = await cli([
      "command",
      "SetBackLight",
      "--data",
      "1",
      "-y",
      "--force",
      ...HOST,
    ]);
    expect(forced.code).toBe(0);
    expect(forced.sent.map((s) => s.opcode)).toEqual([
      COMMANDS.SetBackLight.opcode,
    ]);
  });

  it("refuses unsupported firmware, naming the minimum and --force", async () => {
    const older = await cli(
      ["command", "SetBackLight", "--data", "1", "-y", ...HOST],
      {
        answers: {
          ...CONFIG,
          [SWITCH_OPCODE.GetTelemetry]: TELEMETRY_XML.replace(
            'mspVersion="R0502000"',
            'mspVersion="R0501000"',
          ),
        },
      },
    );
    expect(older.code).toBe(1);
    expect(older.stderr).toContain(
      "Firmware R0501000 is not supported: R0502000 or newer required.\n\nPass --force to ignore this error.\n",
    );
    expect(older.sent.map((s) => s.opcode)).toEqual([
      SWITCH_OPCODE.RequestConfiguration,
      SWITCH_OPCODE.GetTelemetry,
    ]);

    const unknown = await cli(
      ["command", "SetBackLight", "--data", "1", "-y", ...HOST],
      {
        answers: {
          ...CONFIG,
          [SWITCH_OPCODE.GetTelemetry]: TELEMETRY_XML.replace(
            ' mspVersion="R0502000"',
            "",
          ),
        },
      },
    );
    expect(unknown.code).toBe(1);
    expect(unknown.stderr).toContain(
      "Firmware version unknown: R0502000 or newer required.\n\nPass --force to ignore this error.\n",
    );
    expect(unknown.sent.map((s) => s.opcode)).toEqual([
      SWITCH_OPCODE.RequestConfiguration,
      SWITCH_OPCODE.GetTelemetry,
    ]);
  });

  it("prints a refusal's stack trace with --debug", async () => {
    const r = await cli(
      ["command", "SetBackLight", "--data", "1", "-y", "--debug", ...HOST],
      {
        answers: {
          ...CONFIG,
          [SWITCH_OPCODE.GetTelemetry]: TELEMETRY_XML.replace(
            'mspVersion="R0502000"',
            'mspVersion="R0501000"',
          ),
        },
      },
    );
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(
      /FirmwareTooOldError: Firmware R0501000[\s\S]*\n {4}at /,
    );
    expect(r.stderr).toContain("\n\nPass --force to ignore this error.\n");
  });

  it("sends with --yes and leaves safe.json alone", async () => {
    const r = await cli(
      [
        "command",
        "SetUIFilterSpeedCmd",
        "--poolId",
        "1",
        "--equipmentId",
        "3",
        "--data",
        "75",
        "-y",
        ...HOST,
      ],
      {
        answers: CONFIG,
      },
    );
    expect(r.code).toBe(0);
    expect(r.stderr).not.toContain("Send it?");
    expect(existsSync(join(r.dir, "safe.json"))).toBe(false);
  });

  it("refuses a write without a terminal and without --yes", async () => {
    const r = await cli(
      [
        "command",
        "SetUIFilterSpeedCmd",
        "--poolId",
        "1",
        "--equipmentId",
        "3",
        "--data",
        "75",
        ...HOST,
      ],
      {
        answers: CONFIG,
        tty: false,
      },
    );
    expect(r.code).toBe(3);
    expect(r.stderr).toContain(
      "refusing to send SetUIFilterSpeedCmd without --yes",
    );
    expect(r.sent.map((s) => s.opcode)).toEqual([
      SWITCH_OPCODE.RequestConfiguration,
      SWITCH_OPCODE.GetTelemetry,
    ]);
  });

  it("checks every id against the configuration", async () => {
    const r = await cli(
      ["command", "GetUIPoolTempCmd", "--poolId", "99", ...HOST],
      {
        answers: POOL_TEMP,
      },
    );
    expect(r.code).toBe(2);
    expect(r.stderr).toContain(
      "poolId 99: nothing in the configuration has that id",
    );
    expect(r.sent.map((s) => s.opcode)).toEqual([
      SWITCH_OPCODE.RequestConfiguration,
      SWITCH_OPCODE.GetTelemetry,
    ]);
  });

  it("fetches a cached config again when the controller's has changed", async () => {
    const first = await cli(["config", ...HOST], { answers: CONFIG });
    const r = await cli(
      ["command", "GetUIPoolTempCmd", "--poolId", "1", ...HOST],
      {
        answers: {
          ...POOL_TEMP,
          [SWITCH_OPCODE.GetTelemetry]: TELEMETRY_XML.replace(
            'configChksum="2824508"',
            'configChksum="2824509"',
          ),
        },
        dir: first.dir,
      },
    );
    expect(r.code).toBe(0);
    expect(r.sent.map((s) => s.opcode)).toEqual([
      SWITCH_OPCODE.GetTelemetry,
      SWITCH_OPCODE.RequestConfiguration,
      COMMANDS.GetUIPoolTempCmd.opcode,
    ]);
    expect(r.stderr).toContain("config: changed on the controller");
  });

  it("resolves a scheduleId against the configuration's schedules", async () => {
    // the fixture's <Schedules> holds a <sche> with <schedule-system-id>21</schedule-system-id>
    const r = await cli(
      ["command", "DeleteUIScheduleCmd", "--scheduleId", "21", "-y", ...HOST],
      { answers: CONFIG },
    );
    expect(r.code).toBe(0);
    expect(r.sent.map((s) => s.opcode)).toEqual([
      SWITCH_OPCODE.RequestConfiguration,
      SWITCH_OPCODE.GetTelemetry,
      COMMANDS.DeleteUIScheduleCmd.opcode,
    ]);
    const bad = await cli(
      ["command", "DeleteUIScheduleCmd", "--scheduleId", "999", "-y", ...HOST],
      { answers: CONFIG },
    );
    expect(bad.code).toBe(2);
    expect(bad.stderr).toContain(
      "scheduleId 999: nothing in the configuration has that id",
    );
    expect(bad.sent.map((s) => s.opcode)).toEqual([
      SWITCH_OPCODE.RequestConfiguration,
      SWITCH_OPCODE.GetTelemetry,
    ]);
  });

  it("skips the fetch and the checks with --force", async () => {
    const r = await cli(
      ["command", "GetUIPoolTempCmd", "--poolId", "99", "--force", ...HOST],
      {
        answers: POOL_TEMP,
      },
    );
    expect(r.code).toBe(0);
    expect(r.sent.map((s) => s.opcode)).toEqual([
      COMMANDS.GetUIPoolTempCmd.opcode,
    ]);
  });

  it("rejects a missing, non-numeric, or out-of-range parameter before any send", async () => {
    const missing = await cli(["command", "GetUIPoolTempCmd", ...HOST], {
      answers: POOL_TEMP,
    });
    expect(missing.code).toBe(2);
    expect(missing.stderr).toContain("--poolId is required");
    const text = await cli(
      ["command", "GetUIPoolTempCmd", "--poolId", "one", ...HOST],
      { answers: POOL_TEMP },
    );
    expect(text.code).toBe(2);
    expect(text.stderr).toContain("--poolId must be a number");
    const range = await cli(
      ["command", "GetUIPoolTempCmd", "--poolId", "9999999999", ...HOST],
      { answers: POOL_TEMP },
    );
    expect(range.code).toBe(2);
    expect(range.stderr).toMatch(/between -2147483648 and 2147483647/);
    expect(missing.sent).toEqual([]);
    expect(text.sent).toEqual([]);
    expect(range.sent).toEqual([]);
  });

  it("rejects a numeric parameter that is not plain decimal", async () => {
    for (const text of ["", " ", "0x10", "1e3"]) {
      const r = await cli(
        ["command", "GetUIPoolTempCmd", `--poolId=${text}`, ...HOST],
        { answers: POOL_TEMP },
      );
      expect(r.code, `--poolId "${text}"`).toBe(2);
      expect(r.stderr).toContain("--poolId must be a number");
      expect(r.sent).toEqual([]);
    }
  });

  it("refetches when the cached configuration will not parse", async () => {
    const dir = mkdtempSync(join(tmpdir(), "omnilogic-local-"));
    writeFileSync(join(dir, "config.json"), "<nope/>");
    const r = await cli(
      ["command", "GetUIPoolTempCmd", "--poolId", "1", ...HOST],
      { answers: POOL_TEMP, dir },
    );
    expect(r.code).toBe(0);
    expect(r.sent.map((s) => s.opcode)).toEqual([
      SWITCH_OPCODE.RequestConfiguration,
      SWITCH_OPCODE.GetTelemetry,
      COMMANDS.GetUIPoolTempCmd.opcode,
    ]);
    // the unreadable file is replaced
    expect(
      JSON.parse(readFileSync(join(r.dir, "config.json"), "utf8")),
    ).toEqual(parseConfig(CONFIG_XML));
  });

  it("refetches when the cached configuration has another shape", async () => {
    for (const text of ["null", "{}", "[]", '{"checksum":1}', '"x"']) {
      const dir = mkdtempSync(join(tmpdir(), "omnilogic-local-"));
      writeFileSync(join(dir, "config.json"), text);
      const r = await cli(
        ["command", "GetUIPoolTempCmd", "--poolId", "1", ...HOST],
        { answers: POOL_TEMP, dir },
      );
      expect(r.code, `config.json ${text}`).toBe(0);
      expect(r.sent[0]?.opcode).toBe(SWITCH_OPCODE.RequestConfiguration);
    }
  });

  it("fetches the configuration and telemetry even when no parameter names an id", async () => {
    const r = await cli(
      ["command", "SetBackLight", "--data", "1", "-y", ...HOST],
      {
        answers: CONFIG,
      },
    );
    expect(r.code).toBe(0);
    expect(r.sent.map((s) => s.opcode)).toEqual([
      SWITCH_OPCODE.RequestConfiguration,
      SWITCH_OPCODE.GetTelemetry,
      COMMANDS.SetBackLight.opcode,
    ]);
    expect(r.stderr).toContain("config: fetching");
  });

  it("rejects an unknown flag and a stray positional", async () => {
    const flag = await cli([
      "command",
      "GetUIPoolTempCmd",
      "--poolId",
      "1",
      "--poolID",
      "1",
      ...HOST,
    ]);
    expect(flag.code).toBe(2);
    const stray = await cli(["command", "GetUIPoolTempCmd", "1", ...HOST]);
    expect(stray.code).toBe(2);
    expect(stray.stderr).toContain('unexpected argument "1"');
  });

  it("shows the request XML and what each id names with --verbose", async () => {
    const r = await cli(
      ["command", "GetUIPoolTempCmd", "--poolId", "1", "-v", ...HOST],
      {
        answers: POOL_TEMP,
      },
    );
    expect(r.stderr).toContain("request: <?xml");
    expect(r.stderr).toMatch(/poolId 1: ".+"/);
  });

  it("prints a command's own help", async () => {
    const r = await cli(["command", "GetUIPoolTempCmd", "--help"]);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain(
      "Usage: omnilogic-local command GetUIPoolTempCmd --poolId <int>",
    );
    expect(r.sent).toEqual([]);
  });
});
