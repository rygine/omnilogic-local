import {
  bitmaskNames,
  CHLORINATOR_ALERTS,
  CHLORINATOR_ERRORS,
  CHLORINATOR_STATUS,
  packedNames,
} from "@/constants/labels";
import { getAvailableShows } from "@/constants/lightShows";

describe("bitmaskNames", () => {
  it("names each set flag, None for zero", () => {
    expect(bitmaskNames(4, CHLORINATOR_STATUS)).toBe("Generating");
    expect(bitmaskNames(0b10000110, CHLORINATOR_STATUS)).toBe(
      "Alert Present, Generating, K2 Active",
    );
    expect(bitmaskNames(0, CHLORINATOR_STATUS)).toBe("None");
  });
});

describe("packedNames", () => {
  it("reads each field out of the word, None for zero", () => {
    expect(packedNames(0b0000_0001_0000_0010, CHLORINATOR_ALERTS)).toBe(
      "Very Low Salt, ORP Overfeed Timeout",
    );
    // the one-bit fields sit between the two-bit ones
    expect(packedNames(0b0000_0000_1000_1100, CHLORINATOR_ALERTS)).toBe(
      "High Cell Current, Low Cell Voltage, Board Temp Clearing",
    );
    expect(packedNames(0b0000_0101_0000_0000, CHLORINATOR_ERRORS)).toBe(
      "Relay K1 Shorted, Relay K2 Shorted",
    );
    expect(packedNames(0b0001_0000_0000_0000, CHLORINATOR_ERRORS)).toBe(
      "Non-Hayward Cell",
    );
    expect(packedNames(0, CHLORINATOR_ALERTS)).toBe("None");
  });

  it("calls a value the firmware does not name Unknown", () => {
    expect(packedNames(0b0011_0000_0000_0000, CHLORINATOR_ERRORS)).toBe(
      "Unknown",
    );
    expect(bitmaskNames(256, CHLORINATOR_STATUS)).toBe("Unknown");
  });
});

describe("getAvailableShows", () => {
  it("lists each light type's shows, the UCL shows for an unknown type", () => {
    const counts = {
      COLOR_LOGIC_2_5: 12,
      COLOR_LOGIC_4_0: 12,
      CL_P_COLOR: 12,
      CL_Z_COLOR: 14,
      UNKNOWN_TYPE: 17,
    };
    expect(
      Object.fromEntries(
        Object.keys(counts).map((type) => [
          type,
          getAvailableShows(type).length,
        ]),
      ),
    ).toEqual(counts);
    expect(getAvailableShows("COLOR_LOGIC_UCL", false)).toHaveLength(17);
    expect(getAvailableShows("COLOR_LOGIC_UCL", true)).toHaveLength(28);
    expect(getAvailableShows("COLOR_LOGIC_SAM", false)).toHaveLength(17);
    expect(getAvailableShows("COLOR_LOGIC_SAM", true)).toHaveLength(28);
    expect(getAvailableShows("COLOR_LOGIC_2_5")[0]).toEqual({
      value: 0,
      name: "VOODOO_LOUNGE",
    });
    expect(getAvailableShows("COLOR_LOGIC_UCL", true)[27]).toEqual({
      value: 27,
      name: "WATERFIRE",
    });
    expect(getAvailableShows("CL_P_COLOR")[0]).toEqual({
      value: 0,
      name: "SAM",
    });
    expect(getAvailableShows("CL_Z_COLOR")[13]).toEqual({
      value: 13,
      name: "DISCO_TECH",
    });
  });
});
