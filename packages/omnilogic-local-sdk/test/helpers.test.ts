import {
  bcdWatts,
  cellAmps,
  cellVolts,
  displayRevision,
  driveRevision,
  thermistorF,
} from "@/utils/decode";
import { defined, isRecord, matches } from "@/utils/helpers";

// ASCII codes of a plain-digit string, the way the drive reports a revision
const ascii = (s: string): number[] =>
  Array.from({ length: s.length }, (_, i) => s.charCodeAt(i));

describe("helpers", () => {
  it("isRecord accepts a plain object and nothing else", () => {
    expect(isRecord({ a: 1 })).toBe(true);
    expect(isRecord(Object.create(null))).toBe(true);
    for (const v of [
      [],
      null,
      undefined,
      "x",
      () => 1,
      new Date(),
      new Map(),
    ]) {
      expect(isRecord(v)).toBe(false);
    }
  });

  it("defined drops undefined fields and keeps falsy ones", () => {
    expect(defined({ a: 1, b: undefined, c: 0, d: false })).toEqual({
      a: 1,
      c: 0,
      d: false,
    });
  });

  it("matches compares the expected fields alone", () => {
    const record = { a: 1, b: "x", c: true };
    expect(matches(record, { a: 1, b: "x" })).toBe(true);
    expect(matches({ a: 1, b: "x" }, { a: 1, b: "y" })).toBe(false);
    expect(matches({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(matches(undefined, { a: 1 })).toBe(false);
  });
});

describe("record decoders", () => {
  it("decode the diagnostics bytes as the panel displays them", () => {
    expect(cellVolts(204)).toBeCloseTo(32.6, 2);
    expect(cellAmps(0)).toBe(0);
    expect(cellAmps(51)).toBeCloseTo(2.045, 3);
    expect(thermistorF(432)).toBeCloseTo(89.5, 1);
    expect(Number.isNaN(thermistorF(0))).toBe(true);
    expect(Number.isNaN(thermistorF(640))).toBe(true);
    expect(bcdWatts(4, 0x58)).toBe(458);
    expect(bcdWatts(4, 0x88)).toBe(488);
    expect(displayRevision([...ascii("1015 "), 0])).toBe("10.1.5");
    expect(driveRevision([...ascii("0073"), 0, 0])).toBe("0.73");
    expect(driveRevision(ascii("07"))).toBe("07");
  });
});
