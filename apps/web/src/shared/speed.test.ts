import { SPEED_PRESET } from "@rygine/omnilogic-local-sdk";
import { describe, expect, it } from "vitest";

import { formatSpeed, presetOf, SPEED_PRESET_LABELS } from "@/shared/speed";

const rpm = { min: 2000, max: 3450 };
const pct = { min: 58, max: 100 };

describe("formatSpeed", () => {
  it("formats as RPM when the pump's RPM range is known", () => {
    expect(formatSpeed(58, rpm, pct)).toBe("2000 RPM");
  });

  it("falls back to percent without an RPM range", () => {
    expect(formatSpeed(58, null, pct)).toBe("58%");
  });
});

describe("presetOf", () => {
  const presets = { low: 58, medium: 80, high: 100 };

  it("names the preset a speed equals, else null", () => {
    expect(presetOf(58, presets)).toBe("Low");
    expect(presetOf(80, presets)).toBe("Medium");
    expect(presetOf(100, presets)).toBe("High");
    expect(presetOf(70, presets)).toBeNull();
    expect(presetOf(58, null)).toBeNull();
  });

  it("uses the SDK's preset labels", () => {
    expect(SPEED_PRESET_LABELS).toEqual([
      SPEED_PRESET[0],
      SPEED_PRESET[1],
      SPEED_PRESET[2],
    ]);
  });
});
