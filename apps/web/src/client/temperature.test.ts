import { describe, expect, it } from "vitest";

import { tempColor } from "@/client/temperature";
import { formatTemp } from "@/shared/temperature";

describe("formatTemp", () => {
  it("labels the wire's °F", () => {
    expect(formatTemp(82)).toBe("82°F");
  });
});

describe("tempColor", () => {
  it("warms with the temperature in °F", () => {
    expect(tempColor(50)).toBe("blue");
    expect(tempColor(65)).toBe("cyan");
    expect(tempColor(75)).toBe("teal");
    expect(tempColor(85)).toBe("orange");
    expect(tempColor(95)).toBe("red");
  });
});
