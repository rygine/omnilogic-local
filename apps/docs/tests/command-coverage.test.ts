import { COMMANDS, SWITCH_OPCODE } from "@rygine/omnilogic-local-sdk";

import { readCommandPages } from "../.vitepress/commands/pages";

// opcodes the firmware handles and the SDK never sends
const DOCUMENTED_ONLY: Record<string, number> = {
  FrmUpgradeCmd: 165,
  GetAllAlarmList: 304,
  GetFile: 30,
  GetLogFileConfig: 31,
  SetDefualtLogSetting: 33,
  SetTelemetrySpeed: 305,
};

describe("command coverage", () => {
  const pages = new Map(readCommandPages().map((p) => [p.name, p.frontmatter]));
  const spec = new Map<string, number>([
    ...Object.entries(COMMANDS).map(([n, c]) => [n, c.opcode] as const),
    ...Object.entries(SWITCH_OPCODE),
  ]);

  it("has a page for every SDK command and switch opcode, with its opcode", () => {
    const missing = [...spec.keys()].filter((n) => !pages.has(n));
    expect(missing).toEqual([]);
    const wrong = [...spec].filter(([n, op]) => pages.get(n)?.opcode !== op);
    expect(wrong).toEqual([]);
  });

  it("has no page the SDK or the documented-only list does not know", () => {
    const unknown = [...pages.keys()].filter(
      (n) => !spec.has(n) && !(n in DOCUMENTED_ONLY),
    );
    expect(unknown).toEqual([]);
  });

  it("gives every documented-only page its opcode", () => {
    const wrong = Object.entries(DOCUMENTED_ONLY).filter(
      ([n, op]) => pages.get(n)?.opcode !== op,
    );
    expect(wrong).toEqual([]);
  });
});
