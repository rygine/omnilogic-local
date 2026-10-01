import { accessoryOf, controllerConfig, fitProblem } from "@/config";
import type { Exposable } from "@/discovery";

const load = (raw: unknown) => {
  const warned: string[] = [];
  return { block: controllerConfig(raw, (m) => warned.push(m)), warned };
};

describe("controllerConfig", () => {
  it("fills the defaults and keeps every well-formed accessory", () => {
    const entry = {
      id: "k7f2q9w1",
      type: "filterSwitch",
      equipment: 3,
      name: "Pool Filter Pump High",
      onSpeed: "high",
    };
    expect(load({ host: "192.168.1.100", accessories: [entry] }).block).toEqual(
      {
        host: "192.168.1.100",
        port: 10444,
        pollInterval: 300,
        accessories: [entry],
      },
    );
  });

  it("drops a block with a bad host, port, or refresh interval", () => {
    expect(load({}).block).toBe(
      "host undefined is not an IPv4 address or a host name",
    );
    expect(load({ host: "not a host!" }).block).toContain("not an IPv4");
    expect(load({ host: "h", port: 70000 }).block).toBe(
      "port 70000 is outside 1 to 65535",
    );
    expect(load({ host: "h", pollInterval: 5 }).block).toBe(
      "pollInterval 5 is outside 30 to 86400",
    );
  });

  it("drops every malformed accessory with a log line", () => {
    const { block, warned } = load({
      host: "h",
      accessories: [
        "light",
        { id: "x", type: "nope", equipment: 3, name: "Typo" },
        { id: "y", type: "light", equipment: "8", name: "Text Id" },
        { id: "z", type: "light", equipment: 8, name: " " },
      ],
    });
    expect(typeof block === "string" ? block : block.accessories).toEqual([]);
    expect(warned).toEqual([
      "an accessory: dropped, not an accessory entry; re-add it on the settings page",
      'Typo: dropped, type "nope" is not one the plugin knows; re-add it on the settings page',
      'Text Id: dropped, equipment "8" is not an equipment id; re-add it on the settings page',
      "z: dropped, it has no name; re-add it on the settings page",
    ]);
  });
});

describe("accessoryOf", () => {
  const base = { id: "a", type: "lightSwitch", equipment: 8, name: "Blue" };

  it("keeps an entry whose fields are its type's, of the right kind", () => {
    const entry = {
      ...base,
      show: 1,
      speed: "2x",
      brightness: 60,
      offAfter: 90,
    };
    expect(accessoryOf(entry)).toEqual(entry);
  });

  it("names what is wrong otherwise", () => {
    expect(accessoryOf({ ...base, onSpeed: "high" })).toBe(
      "onSpeed is not a setting of a lightSwitch",
    );
    expect(accessoryOf({ ...base, show: "1" })).toBe(
      'show "1" is not a whole number',
    );
    expect(accessoryOf({ ...base, offAfter: 90.5 })).toBe(
      "offAfter 90.5 is not a whole number",
    );
    expect(accessoryOf({ id: "a", equipment: 8, name: "n" })).toBe(
      "type undefined is not one the plugin knows",
    );
  });
});

describe("fitProblem", () => {
  const found: Exposable[] = [
    {
      id: 3,
      kind: "filter",
      body: "Pool",
      bodyId: 1,
      defaultName: "Pool Filter Pump",
      minSpeed: 58,
      maxSpeed: 100,
      speedType: "variable",
      presets: { low: 58, medium: 80, high: 100 },
    },
    {
      id: 8,
      kind: "light",
      body: "Pool",
      bodyId: 1,
      defaultName: "Pool Light",
      shows: [{ value: 1, name: "DEEP_BLUE_SEA" }],
      omniDirect: false,
    },
  ];
  const fit = (entry: Record<string, unknown>) => {
    const a = accessoryOf({ id: "a", name: "n", ...entry });
    if (typeof a === "string") {
      throw new Error(a);
    }
    return fitProblem(a, found);
  };

  it("passes an entry the controller's equipment can take", () => {
    expect(fit({ type: "filterSwitch", equipment: 3 })).toBeUndefined();
    expect(
      fit({
        type: "filterSwitch",
        equipment: 3,
        onSpeed: "custom",
        onPercent: 70,
      }),
    ).toBeUndefined();
    expect(fit({ type: "lightSwitch", equipment: 8, show: 1 })).toBeUndefined();
  });

  it("keeps a default saved for a field a dual- or single-speed pump no longer shows", () => {
    const pump = found[0]!;
    const dual: Exposable = {
      ...pump,
      speedType: "dual",
      presets: { low: 50, high: 100 },
    };
    const single: Exposable = {
      ...pump,
      speedType: "single",
      presets: undefined,
    };
    const fitOn = (eq: Exposable, entry: Record<string, unknown>) => {
      const a = accessoryOf({ id: "a", name: "n", equipment: 3, ...entry });
      if (typeof a === "string") {
        throw new Error(a);
      }
      return fitProblem(a, [eq]);
    };
    expect(
      fitOn(dual, { type: "filterFan", fanSpeed: "presets" }),
    ).toBeUndefined();
    expect(fitOn(dual, { type: "filterFan", fanSpeed: "percent" })).toBe(
      "fanSpeed does not apply to this filter",
    );
    expect(
      fitOn(single, { type: "filterSwitch", onSpeed: "last" }),
    ).toBeUndefined();
    expect(fitOn(single, { type: "filterSwitch", onSpeed: "high" })).toBe(
      "onSpeed does not apply to this filter",
    );
  });

  it("names equipment the controller does not report", () => {
    expect(fit({ type: "relaySwitch", equipment: 3 })).toBe(
      "relay 3 is not on the controller",
    );
  });

  it("names a choice or a number the equipment does not allow", () => {
    expect(fit({ type: "filterSwitch", equipment: 3, onSpeed: "fast" })).toBe(
      'onSpeed "fast" is not one of last, low, medium, high, custom',
    );
    expect(fit({ type: "lightSwitch", equipment: 8, show: 9 })).toBe(
      "show 9 is not one of 1",
    );
    expect(
      fit({
        type: "filterSwitch",
        equipment: 3,
        onSpeed: "custom",
        onPercent: 20,
      }),
    ).toBe("onPercent 20 is outside 58 to 100");
  });

  it("names a missing required field and one that does not apply", () => {
    expect(fit({ type: "lightSwitch", equipment: 8 })).toBe("show is missing");
    expect(fit({ type: "filterSwitch", equipment: 3, onSpeed: "custom" })).toBe(
      "onPercent is missing",
    );
    expect(fit({ type: "filterSwitch", equipment: 3, onPercent: 70 })).toBe(
      "onPercent does not apply to this filter",
    );
    expect(
      fit({ type: "lightSwitch", equipment: 8, show: 1, speed: "2x" }),
    ).toBe("speed does not apply to this light");
  });
});
