import {
  type MSPConfig,
  OmniLogic,
  SPEED_PRESET,
} from "@rygine/omnilogic-local-sdk";
import { describe, expect, it } from "vitest";

import {
  formatSpeed,
  percentToRpm,
  presetOf,
  SPEED_PRESET_LABELS,
} from "@/shared/speed";

const rpm = { min: 2000, max: 3450 };

describe("formatSpeed", () => {
  it("formats as the percent of the pump's maximum RPM, to the nearest 10, whatever its minimum speed", () => {
    expect(formatSpeed(58, rpm)).toBe("2000 RPM");
    expect(formatSpeed(60, rpm)).toBe("2070 RPM");
    expect(formatSpeed(80, rpm)).toBe("2760 RPM");
    expect(formatSpeed(100, rpm)).toBe("3450 RPM");
  });

  it("converts every percent as the SDK's pump does", () => {
    const config = {
      backyard: {
        bodiesOfWater: [
          {
            systemId: 1,
            name: "Pool",
            type: "BOW_POOL",
            colorLogicLights: [],
            pumps: [],
            relays: [],
            sensors: [],
            filter: {
              systemId: 3,
              name: "Filter Pump",
              filterType: "FMT_VARIABLE_SPEED_PUMP",
              maxPumpRpm: rpm.max,
            },
          },
        ],
      },
    } as unknown as MSPConfig;
    const filter = new OmniLogic({ host: "127.0.0.1", config }).backyard.pool!
      .filter!;
    for (let p = 0; p <= 100; p++) {
      expect(percentToRpm(p, rpm)).toBe(filter.toRpm(p));
    }
  });

  it("falls back to percent without an RPM range", () => {
    expect(formatSpeed(58, null)).toBe("58%");
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
