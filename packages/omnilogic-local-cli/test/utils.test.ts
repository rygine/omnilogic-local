import { COMMANDS } from "@rygine/omnilogic-local-sdk";

import {
  closestCommands,
  describeCommand,
  listCommands,
  usageOf,
} from "@/utils";

describe("listCommands", () => {
  it("has one line per command with its opcode and read or write", () => {
    const lines = listCommands().split("\n");
    expect(lines).toHaveLength(Object.keys(COMMANDS).length);
    expect(lines.find((l) => l.startsWith("GetUIPoolTempCmd"))).toMatch(
      /^GetUIPoolTempCmd\s+25\s+read$/,
    );
    expect(lines.find((l) => l.startsWith("GetUIPumpSpeed"))).toMatch(
      /^GetUIPumpSpeed\s+\d+\s+read$/,
    );
    expect(lines.find((l) => l.startsWith("SetUIPoolFilterCmd"))).toMatch(
      /^SetUIPoolFilterCmd\s+8\s+write$/,
    );
    expect(lines).toEqual([...lines].toSorted());
  });
});

describe("describeCommand", () => {
  it("shows the parameters, the reply, and the caveat", () => {
    const text = describeCommand("GetUIPoolTempCmd");
    expect(text).toContain("GetUIPoolTempCmd  opcode 25  read");
    expect(text).toContain("--poolId  int -2147483648..2147483647");
    expect(text).toContain(
      "reply: UIGetPoolTempRsp (opcode 1025): poolId int, temp int F",
    );
    const write = describeCommand("SetUIPoolSpaSpilloverCmd");
    expect(write).toContain("reply: acknowledged only");
    expect(write).toContain("caveat: moves the return valve");
  });

  it("shows a string parameter's allowed values or its length", () => {
    const withValues = (
      Object.keys(COMMANDS) as (keyof typeof COMMANDS)[]
    ).find((c) =>
      COMMANDS[c].request.some((p) => p.type === "string" && p.values),
    )!;
    expect(describeCommand(withValues)).toMatch(/ \| /);
  });
});

describe("usageOf", () => {
  it("is the command with every parameter as a flag", () => {
    expect(usageOf("GetUIPoolTempCmd")).toContain(
      "Usage: omnilogic-local command GetUIPoolTempCmd --poolId <int>",
    );
  });

  it("brackets the timer block, which has a default", () => {
    const usage = usageOf("SetUIEquipmentCmd");
    expect(usage).toContain("--isOn <int> [--isCountDownTimer <byte>]");
    expect(usage).toContain("[--recurring <byte>]");
    expect(describeCommand("SetUIEquipmentCmd")).toContain(
      "--daysActive        byte 0..255 (default: 0)",
    );
    // a schedule carries daysActive without the rest of the block: no default
    expect(usageOf("CreateUIScheduleCmd")).not.toContain("[");
    expect(describeCommand("CreateUIScheduleCmd")).not.toContain("default");
  });

  it("says how to write a negative value where one is possible", () => {
    expect(usageOf("SetCoordinates")).toContain("=-");
    expect(usageOf("SetHeaterEnable")).toContain("=-");
    expect(usageOf("GetUIAirTempCmd")).not.toContain("=-");
  });
});

describe("closestCommands", () => {
  it("finds names containing the text, case-insensitively, at most five", () => {
    expect(closestCommands("pooltemp")).toContain("GetUIPoolTempCmd");
    expect(closestCommands("Get").length).toBe(5);
    expect(closestCommands("zzz")).toEqual([]);
  });
});
