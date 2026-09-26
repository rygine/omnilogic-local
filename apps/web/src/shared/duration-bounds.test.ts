import { describe, expect, it } from "vitest";

import { durationProblem, withinBounds } from "@/shared/duration-bounds";

describe("duration bounds", () => {
  it("priming is whole minutes from one to ten", () => {
    expect(withinBounds("primingDuration", 120)).toBe(true);
    expect(withinBounds("primingDuration", 600)).toBe(true);
    expect(durationProblem("primingDuration", 90)).toBe("Whole minutes");
    expect(durationProblem("primingDuration", 0)).toBe(
      "Between 1 and 10 minutes",
    );
    expect(durationProblem("primingDuration", 660)).toBe(
      "Between 1 and 10 minutes",
    );
  });

  it("the others are whole seconds from one to a day", () => {
    for (const setting of [
      "cooldownDuration",
      "sharedFilterTimeout",
      "freezeProtectOverrideInterval",
    ] as const) {
      expect(withinBounds(setting, 1)).toBe(true);
      expect(withinBounds(setting, 86400)).toBe(true);
      expect(durationProblem(setting, 0)).toBe("Between 1 and 86400 seconds");
      expect(durationProblem(setting, 86401)).toBe(
        "Between 1 and 86400 seconds",
      );
      expect(durationProblem(setting, 1.5)).toBe("Whole seconds");
    }
  });

  it("a blank field is not a number", () => {
    expect(durationProblem("cooldownDuration", Number.NaN)).toBe(
      "Enter a number",
    );
    expect(withinBounds("primingDuration", Number.NaN)).toBe(false);
  });
});
