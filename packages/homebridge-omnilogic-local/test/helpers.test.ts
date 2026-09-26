import { clampToRange, fromCelsius, snapToPreset, toCelsius } from "@/helpers";

const presets = { low: 58, medium: 80, high: 100 };

describe("snapToPreset", () => {
  it("picks the nearest preset", () => {
    expect(snapToPreset(50, presets)).toBe(58);
    expect(snapToPreset(70, presets)).toBe(80);
    expect(snapToPreset(69, presets)).toBe(58);
    expect(snapToPreset(95, presets)).toBe(100);
  });
});

describe("clampToRange", () => {
  it("keeps a percent inside the pump's range", () => {
    expect(clampToRange(40, { min: 58, max: 100 })).toBe(58);
    expect(clampToRange(120, { min: 58, max: 100 })).toBe(100);
    expect(clampToRange(73, { min: 58, max: 100 })).toBe(73);
  });
});

describe("temperatures", () => {
  it("converts the controller's Fahrenheit to Celsius", () => {
    expect(toCelsius(84)).toBeCloseTo(28.9, 1);
    expect(toCelsius(32)).toBe(0);
  });

  it("converts HomeKit's Celsius back to the controller's whole degree", () => {
    expect(fromCelsius(28.7)).toBe(84);
    expect(fromCelsius(0)).toBe(32);
  });
});
