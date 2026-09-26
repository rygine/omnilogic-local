import { makeBow } from "@tests/bow";
import { describe, expect, it } from "vitest";

import { nameablesOf, nameProblem } from "@/components/Names/names";

const bow = makeBow({
  waterTemp: null,
  filters: [],
  relays: [{ id: 22, name: "Blower", on: false }],
});

describe("nameablesOf", () => {
  it("offers the body first, then its named devices", () => {
    const { body, devices } = nameablesOf(bow);
    expect(body).toEqual({ id: 1, name: "Pool", kind: "Body of water" });
    expect(devices).toEqual([{ id: 22, name: "Blower", kind: "Relay" }]);
  });
});

describe("nameProblem", () => {
  it("accepts a short name and refuses an empty or over-long one", () => {
    expect(nameProblem("Blower")).toBeUndefined();
    expect(nameProblem("1234567890123")).toBeUndefined();
    expect(nameProblem("   ")).toMatch(/required/);
    expect(nameProblem("12345678901234")).toMatch(/13/);
    // bytes, not characters: 7 accented letters are 14 bytes
    expect(nameProblem("ééééééé")).toMatch(/13/);
  });
});
