import {
  COMMANDS,
  type CommandName,
  type CommandParams,
  type CommandRequestParam,
  type CommandResult,
} from "@/client/spec";

import { makeRecorder } from "./mocks";

const entries = Object.entries(COMMANDS);
const names = Object.keys(COMMANDS) as CommandName[];

const strings = entries.flatMap(([name, spec]) =>
  spec.request
    .filter(
      (p): p is Extract<CommandRequestParam, { type: "string" }> =>
        p.type === "string",
    )
    .map((p) => ({ where: `${name}.${p.name}`, p })),
);

const isAGet = (name: CommandName) => /^(get|uiget)/i.test(name);

describe("command spec integrity", () => {
  it("mirrors the dispatch table: switch opcodes excluded, opcodes and parameter names unique", () => {
    const opcodes = entries.map(([, s]) => s.opcode);
    expect(new Set(opcodes).size).toBe(opcodes.length);
    for (const opcode of [1, 30, 31, 33, 165, 300, 304, 305, 411]) {
      expect(opcodes, `opcode ${opcode} is switch-handled`).not.toContain(
        opcode,
      );
    }
    for (const [name, spec] of entries) {
      const n = spec.request.map((p) => p.name);
      expect(new Set(n).size, `duplicate param in ${name}`).toBe(n.length);
    }
  });

  it("response opcodes follow the +1000 rule, except three", () => {
    const exceptions: Partial<Record<CommandName, number>> = {
      GetUIDisplayModeState: 1368,
      GetUIFreezeProtectOverride: 1370,
      GetUIFreezeProtectOverrideInterval: 1371,
    };
    const withResponse = entries.filter(([, s]) => s.response);
    expect(withResponse.length).toBeGreaterThan(0);
    const mismatches = withResponse
      .filter(
        ([name, s]) =>
          s.response!.opcode !==
          (exceptions[name as CommandName] ?? s.opcode + 1000),
      )
      .map(([name]) => name);
    expect(mismatches).toEqual([]);
  });

  it("bounds each string by what survives the firmware, values within it", () => {
    const constrained = strings.filter((e) => e.p.values);
    expect(constrained.length).toBeGreaterThan(0);
    for (const { where, p } of constrained) {
      expect(new Set(p.values).size, `${where} values`).toBe(p.values!.length);
      for (const v of p.values!) {
        expect(v.length, `${where} value ${v}`).toBeLessThanOrEqual(
          p.maxLength,
        );
      }
    }
  });

  it("marks every Get/UIGet taking nothing but ids as a read, and nothing else", () => {
    const ids = new Set(["poolId", "equipmentId"]);
    expect(
      names.filter((c) => COMMANDS[c].read === true && !isAGet(c)),
    ).toEqual([]);
    expect(
      names.filter(
        (c) =>
          isAGet(c) &&
          COMMANDS[c].request.every((p) => ids.has(p.name)) &&
          COMMANDS[c].read !== true,
      ),
    ).toEqual([]);
  });

  it("puts a caveat on the percent override pair, each alternative caveat-free", () => {
    expect(COMMANDS.SetChlorinatorScheduleCmd.caveat).toBeDefined();
    expect(COMMANDS.RestoreChlorinatorPercentCmd.caveat).toBeDefined();
    expect(COMMANDS.SetCHLORTimePercent.caveat).toBeUndefined();
    const caveatedAlternatives = entries
      .filter(([, spec]) => spec.caveat?.alternative !== undefined)
      .filter(([, spec]) => COMMANDS[spec.caveat!.alternative!].caveat)
      .map(([name]) => name);
    expect(caveatedAlternatives).toEqual([]);
  });
});

// compile-time assertions
describe("derived types", () => {
  it("derive each command's parameters and result from its spec entry", () => {
    expectTypeOf<CommandParams<"GetUIPoolTempCmd">>().toEqualTypeOf<{
      poolId: number;
    }>();
    expectTypeOf<CommandParams<"UiEditConfigObjectName">>().toEqualTypeOf<{
      equipmentId: number;
      name: string;
    }>();
    expectTypeOf<CommandParams<"UISetCSADTargetValue">>().toEqualTypeOf<{
      poolId: number;
      equipmentId: number;
      targetValue: number;
    }>();
    expectTypeOf<CommandParams<"SetTime">>().toEqualTypeOf<{
      is24Hour: number;
      hour: number;
      minute: number;
      amPm: "AM" | "PM";
    }>();
    expectTypeOf<keyof CommandParams<"GetUIAirTempCmd">>().toBeNever();
    expectTypeOf<CommandResult<"GetUIPoolTempCmd">>().toEqualTypeOf<{
      poolId: number;
      temp: number;
    }>();
    expectTypeOf<CommandResult<"GetCoordinates">>().toEqualTypeOf<{
      latitude: number;
      longitude: number;
    }>();
    expectTypeOf<CommandResult<"GetTime">>().toEqualTypeOf<{
      format: boolean;
      hour: number;
      minute: number;
      amPm: string;
    }>();
    expectTypeOf<CommandResult<"SetTime">>().toEqualTypeOf<void>();
  });

  it("reject what the spec rules out, while the dynamic overload compiles freely", () => {
    const { omni } = makeRecorder();
    // @ts-expect-error — not a command
    const bad: CommandName = "NotACommand";
    // @ts-expect-error — poolId is required
    const missing: CommandParams<"GetUIPoolTempCmd"> = {};
    // @ts-expect-error — poolId must be a number
    const wrongType: CommandParams<"GetUIPoolTempCmd"> = { poolId: "1" };
    // @ts-expect-error — nope is not in the spec
    const extra: CommandParams<"GetUIPoolTempCmd"> = { poolId: 1, nope: 2 };
    const outside: CommandParams<"SetTime"> = {
      is24Hour: 0,
      hour: 7,
      minute: 30,
      // @ts-expect-error — amPm is "AM" | "PM"
      amPm: "noon",
    };
    const notString: CommandParams<"UiEditConfigObjectName"> = {
      equipmentId: 1,
      // @ts-expect-error — name is a string parameter
      name: 3,
    };
    // @ts-expect-error — handled by the network switch, use fetchConfig()
    expect(() => omni.command("RequestConfiguration")).toBeDefined();
    expect(() =>
      // @ts-expect-error poolId is an int
      omni.command("GetUIPoolTempCmd", { poolId: "1" }, { raw: true }),
    ).toBeDefined();
    const name = "SetUIEquipmentCmd" as CommandName;
    const params: Record<string, number | string> = { poolId: 1 };
    expect(() => omni.command(name, params)).toBeDefined();
    const send = <N extends CommandName>(
      n: N,
      p: CommandParams<N>,
    ): Promise<CommandResult<N>> => omni.command(n, p);
    expect(send).toBeDefined();
    expect([bad, missing, wrongType, extra, outside, notString]).toBeDefined();
  });
});
