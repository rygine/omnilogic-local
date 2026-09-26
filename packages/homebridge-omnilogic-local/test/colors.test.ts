import { ColorLogicShow, getAvailableShows } from "@rygine/omnilogic-local-sdk";

import { colorForShow, showForColor } from "@/colors";

const ucl = Object.entries(ColorLogicShow).map(([name, value]) => ({
  value,
  name,
}));

describe("show colors", () => {
  it("finds the nearest mapped show the light has", () => {
    expect(showForColor({ hue: 240, saturation: 100 }, ucl)).toBe(
      ColorLogicShow.DEEP_BLUE_SEA,
    );
    expect(showForColor({ hue: 0, saturation: 100 }, ucl)).toBe(
      ColorLogicShow.WARM_RED,
    );
    // white is matched on saturation, whatever the hue
    expect(showForColor({ hue: 180, saturation: 0 }, ucl)).toBe(
      ColorLogicShow.CLOUD_WHITE,
    );
  });

  it("only offers the shows the installed light has", () => {
    // a base UCL light has no Yellow (show 17 is the V2 tail)
    const base = getAvailableShows("COLOR_LOGIC_UCL");
    expect(base.some((s) => s.value === ColorLogicShow.YELLOW)).toBe(false);
    expect(showForColor({ hue: 60, saturation: 100 }, base)).not.toBe(
      ColorLogicShow.YELLOW,
    );
    // a Pentair light answers with its own table
    const pentair = getAvailableShows("CL_P_COLOR");
    expect(
      pentair.find(
        (s) => s.value === showForColor({ hue: 240, saturation: 100 }, pentair),
      )?.name,
    ).toBe("BLUE");
    expect(
      pentair.find(
        (s) => s.value === showForColor({ hue: 0, saturation: 0 }, pentair),
      )?.name,
    ).toBe("WHITE");
    // a Zodiac light too
    const zodiac = getAvailableShows("CL_Z_COLOR");
    expect(
      zodiac.find(
        (s) => s.value === showForColor({ hue: 0, saturation: 0 }, zodiac),
      )?.name,
    ).toBe("ALPINE_WHITE");
  });

  it("maps every solid show of every family and no animated one", () => {
    for (const type of ["COLOR_LOGIC_UCL", "CL_P_COLOR", "CL_Z_COLOR"]) {
      const names = getAvailableShows(type).map((s) => s.name);
      const mapped = names.filter((n) => colorForShow(n) !== undefined);
      expect(mapped.length).toBeGreaterThan(3);
    }
    for (const name of [
      "SAM",
      "PARTY",
      "ROMANCE",
      "CARIBBEAN",
      "AMERICAN",
      "CALIFORNIA_SUNSET",
      "SLOW_COLOR_SPLASH",
      "FAST_COLOR_SPLASH",
      "AMERICA_THE_BEAUTIFUL",
      "FAT_TUESDAY",
      "DISCO_TECH",
      "VOODOO_LOUNGE",
      "TWILIGHT",
      "TRANQUILITY",
      "GEMSTONE",
      "USA",
      "MARDI_GRAS",
      "COOL_CABARET",
      "WATERFIRE",
    ]) {
      expect(colorForShow(name)).toBeUndefined();
    }
  });

  it("keeps every white in a family reachable", () => {
    // a V2-active UCL light lists both Cloud White and Pure White
    const v2 = getAvailableShows("COLOR_LOGIC_UCL", true);
    expect(showForColor({ hue: 0, saturation: 8 }, v2)).toBe(
      ColorLogicShow.PURE_WHITE,
    );
    expect(showForColor({ hue: 0, saturation: 0 }, v2)).toBe(
      ColorLogicShow.CLOUD_WHITE,
    );
  });

  it("reports a show's color", () => {
    expect(colorForShow("DEEP_BLUE_SEA")).toEqual({
      hue: 240,
      saturation: 100,
    });
    expect(colorForShow("VOODOO_LOUNGE")).toBeUndefined();
  });
});
