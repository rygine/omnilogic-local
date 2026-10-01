import { CATALOG, fitting, nameFor } from "@/catalog";
import type { Exposable } from "@/discovery";

const filter: Exposable = {
  id: 3,
  kind: "filter",
  body: "Pool",
  bodyId: 1,
  defaultName: "Pool Filter Pump",
  minSpeed: 58,
  maxSpeed: 100,
  speedType: "variable",
  presets: { low: 58, medium: 80, high: 100 },
};
const light: Exposable = {
  id: 8,
  kind: "light",
  body: "Pool",
  bodyId: 1,
  defaultName: "Pool Color Lights",
  shows: [
    { value: 1, name: "DEEP_BLUE_SEA" },
    { value: 0, name: "VOODOO_LOUNGE" },
  ],
  omniDirect: false,
};
const water: Exposable = {
  id: 1,
  kind: "waterTemp",
  body: "Pool",
  bodyId: 1,
  defaultName: "Pool Water Temperature Sensor",
};

describe("catalog", () => {
  it("lists sixteen types, each fitting one discovered kind", () => {
    expect(Object.keys(CATALOG).length).toBe(16);
    expect(fitting(filter)).toEqual(["filterFan", "filterSwitch"]);
    expect(fitting(light)).toEqual(["light", "lightSwitch"]);
    expect(fitting({ ...light, omniDirect: true })).toEqual([
      "light",
      "lightSwitch",
      "lightDimmer",
    ]);
    expect(CATALOG.lightDimmer.fields.map((f) => f.key)).toEqual([
      "show",
      "speed",
      "offAfter",
    ]);
    expect(nameFor("lightDimmer", light, { show: 1 })).toBe(
      "Pool Color Lights Deep Blue Sea",
    );
    expect(
      CATALOG.lightDimmer.summary(light, {
        show: 0,
        speed: "2x",
        offAfter: 60,
      }),
    ).toBe(
      "voodoo lounge, 2x speed, brightness slider · turns off after 1 hour",
    );
    expect(fitting(water)).toEqual(["waterTemp"]);
  });

  it("names an accessory after its equipment and its choice", () => {
    expect(nameFor("filterFan", filter, {})).toBe("Pool Filter Pump");
    expect(nameFor("filterSwitch", filter, { onSpeed: "high" })).toBe(
      "Pool Filter Pump High",
    );
    expect(
      nameFor("filterSwitch", filter, {
        onSpeed: "custom",
        onPercent: 65,
      }),
    ).toBe("Pool Filter Pump 65%");
    expect(nameFor("lightSwitch", light, { show: 1 })).toBe(
      "Pool Color Lights Deep Blue Sea",
    );
    expect(nameFor("waterTemp", water, {})).toBe(
      "Pool Water Temperature Sensor",
    );
  });

  it("summarizes what an accessory does in one lower-case line", () => {
    expect(CATALOG.filterFan.summary(filter, {})).toBe(
      "slider snaps to low 58%, medium 80%, and high 100%",
    );
    expect(CATALOG.filterFan.summary(filter, { fanSpeed: "percent" })).toBe(
      "slider moves across 58% to 100%",
    );
    expect(CATALOG.filterSwitch.summary(filter, { onSpeed: "high" })).toBe(
      "turns on at high, 100%",
    );
    expect(CATALOG.lightSwitch.summary(light, { show: 1, offAfter: 120 })).toBe(
      "deep blue sea · turns off after 2 hours",
    );
    expect(CATALOG.waterTemp.summary(water, {})).toBe("");
  });

  it("explains a fan's slider with the pump's own presets or range", () => {
    expect(CATALOG.filterFan.note!(filter, {})).toBe(
      "The slider snaps to the presets in the controller's configuration: Low 58%, Medium 80%, and High 100%.",
    );
    expect(CATALOG.spilloverFan.note!(filter, { fanSpeed: "percent" })).toBe(
      "The slider moves to any percent, held to the pump's minimum and maximum speed in the controller's configuration: 58% to 100%.",
    );
    expect(CATALOG.filterSwitch.note!(filter, {})).toBe("");
  });

  it("offers a dual-speed pump its two speeds and a single-speed pump only a switch at its maximum", () => {
    const dual: Exposable = {
      ...filter,
      speedType: "dual",
      presets: { low: 50, high: 100 },
    };
    expect(fitting(dual)).toEqual(["filterFan", "filterSwitch"]);
    expect(CATALOG.filterFan.note!(dual, {})).toBe(
      "This pump runs at two speeds, so the slider snaps to Low 50% and High 100%.",
    );
    expect(CATALOG.filterFan.summary(dual, {})).toBe(
      "slider snaps to low 50% and high 100%",
    );
    const fields = (eq: Exposable) =>
      CATALOG.filterSwitch.fields
        .filter((f) => f.visible?.(eq) !== false)
        .map((f) => [f.key, f.choices?.(eq).map(([value]) => value)]);
    expect(fields(dual)).toEqual([["onSpeed", ["last", "low", "high"]]]);
    expect(CATALOG.filterFan.fields[0]!.visible!(dual)).toBe(false);

    const single: Exposable = {
      ...filter,
      speedType: "single",
      presets: undefined,
    };
    expect(fitting(single)).toEqual(["filterSwitch"]);
    expect(fields(single)).toEqual([]);
    expect(CATALOG.filterSwitch.summary(single, {})).toBe(
      "turns on at its maximum speed, 100%",
    );
    expect(CATALOG.filterSwitch.note!(single, {})).toBe(
      "This pump runs at one speed, so the switch turns it on at its maximum speed, 100%.",
    );
  });

  it("declares every option field with its control and its config key", () => {
    expect(CATALOG.filterSwitch.fields.map((f) => f.key)).toEqual([
      "onSpeed",
      "onPercent",
    ]);
    expect(CATALOG.lightSwitch.fields.map((f) => f.key)).toEqual([
      "show",
      "speed",
      "brightness",
      "offAfter",
    ]);
    expect(CATALOG.heaterSwitch.fields.map((f) => f.key)).toEqual([
      "setPoint",
      "offAfter",
    ]);
    expect(CATALOG.airTemp.fields).toEqual([]);
    const percent = CATALOG.filterSwitch.fields[1]!;
    expect(percent.range?.(filter)).toEqual({ min: 58, max: 100 });
    expect(percent.enabled?.({ onSpeed: "custom" }, filter)).toBe(true);
    expect(percent.enabled?.({ onSpeed: "high" }, filter)).toBe(false);
    const show = CATALOG.lightSwitch.fields[0]!;
    expect(show.choices?.(light)).toEqual([
      ["1", "Deep Blue Sea", "Colors"],
      ["0", "Voodoo Lounge", "Light shows"],
    ]);
    const speed = CATALOG.lightSwitch.fields[1]!;
    expect(speed.enabled?.({ show: 1 }, light)).toBe(false);
    expect(speed.enabled?.({ show: 0 }, light)).toBe(true);
  });
});
