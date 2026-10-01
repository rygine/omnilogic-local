import { discover } from "@/discovery";

import { configXml, extraConfigXml, omniDirectConfigXml } from "./fixtures";
import { testSession } from "./session";
import { telemetryFixture } from "./telemetry";

const configFromFixture = () => testSession().omni.fetchConfig();

describe("discover on the backyard", () => {
  it("lists a light and a relay wired to the backyard itself under the backyard, named as is", async () => {
    const config = await testSession({
      config: extraConfigXml,
    }).omni.fetchConfig();
    const found = discover(config).filter((e) => e.body === "Backyard");
    expect(found.map((e) => [e.kind, e.id, e.defaultName])).toEqual([
      ["airTemp", 0, "Backyard Air Temperature Sensor"],
      ["light", 31, "Backyard Path Lights"],
      ["relay", 30, "Backyard Yard Lights"],
    ]);
  });
});

describe("discover for the accessory catalog", () => {
  it("offers spillover on the pool that shares its pump and names the sensors", async () => {
    const config = await configFromFixture();
    const found = discover(config);
    const one = (kind: string, body: string) =>
      found.find((e) => e.kind === kind && e.body === body);
    expect(one("spillover", "Pool")).toMatchObject({
      id: 1,
      bodyId: 1,
      defaultName: "Pool Spillover",
      minSpeed: 58,
      maxSpeed: 100,
      presets: { low: 58, medium: 80, high: 100 },
    });
    expect(one("spillover", "Spa")).toBeUndefined();
    expect(one("waterTemp", "Pool")?.defaultName).toBe(
      "Pool Water Temperature Sensor",
    );
    expect(one("airTemp", "Backyard")?.defaultName).toBe(
      "Backyard Air Temperature Sensor",
    );
    expect(one("heater", "Pool")?.cooling).toBe(false);
  });

  it("gives a variable-speed pump its configured presets, a dual-speed pump its two speeds, and a single-speed pump none", async () => {
    const speedTypeAndPresets = async (type: string) => {
      const config = await testSession({
        config: () =>
          configXml().replace(
            "<Filter-Type>FMT_VARIABLE_SPEED_PUMP</Filter-Type>",
            `<Filter-Type>${type}</Filter-Type>`,
          ),
      }).omni.fetchConfig();
      const pump = discover(config).find(
        (e) => e.kind === "filter" && e.body === "Pool",
      );
      return [pump?.speedType, pump?.presets];
    };
    expect(await speedTypeAndPresets("FMT_VARIABLE_SPEED_PUMP")).toEqual([
      "variable",
      { low: 58, medium: 80, high: 100 },
    ]);
    expect(await speedTypeAndPresets("FMT_DUAL_SPEED")).toEqual([
      "dual",
      { low: 50, high: 100 },
    ]);
    expect(await speedTypeAndPresets("FMT_SINGLE_SPEED")).toEqual([
      "single",
      undefined,
    ]);
  });

  it("marks a heater's cooling only when a heat source supports it", async () => {
    const withCooling = await testSession({
      config: () =>
        configXml().replace(
          "<Shared-Equipment-System-ID>12</Shared-Equipment-System-ID>",
          "<Shared-Equipment-System-ID>12</Shared-Equipment-System-ID><Supports-Cooling>yes</Supports-Cooling>",
        ),
    }).omni.fetchConfig();
    const found = discover(withCooling);
    const one = (body: string) =>
      found.find((e) => e.kind === "heater" && e.body === body);
    expect(one("Pool")?.cooling).toBe(true);
    expect(one("Spa")?.cooling).toBe(false);
  });
});

const poolLight = (found: ReturnType<typeof discover>) =>
  found.find((e) => e.kind === "light" && e.body === "Pool");

describe("discover", () => {
  it("lists every exposable thing on the reference config, the backyard first then each body", async () => {
    const found = discover(await configFromFixture());
    expect([...new Set(found.map((e) => e.body))]).toEqual([
      "Backyard",
      "Pool",
      "Spa",
      "Themes",
    ]);
    expect(found.filter((e) => e.kind === "theme")).toEqual([
      { id: 29, kind: "theme", body: "Themes", defaultName: "Party" },
    ]);
    const kinds = (kind: string) => found.filter((e) => e.kind === kind);
    expect(kinds("filter").map((e) => e.defaultName)).toEqual([
      "Pool Filter Pump",
      "Spa Filter Pump",
    ]);
    expect(kinds("heater").map((e) => e.defaultName)).toEqual([
      "Pool Heater",
      "Spa Heater",
    ]);
    expect(kinds("chlorinator").map((e) => e.defaultName)).toEqual([
      "Pool Chlorinator",
      "Spa Chlorinator",
    ]);
    expect(kinds("light").map((e) => e.defaultName)).toEqual([
      "Pool Color Lights",
    ]);
    expect(kinds("relay").map((e) => e.defaultName)).toEqual(["Spa Blower"]);
    expect(kinds("waterTemp").map((e) => e.defaultName)).toEqual([
      "Pool Water Temperature Sensor",
      "Spa Water Temperature Sensor",
    ]);
    expect(kinds("airTemp")).toEqual([
      {
        id: 0,
        kind: "airTemp",
        body: "Backyard",
        bodyId: 0,
        defaultName: "Backyard Air Temperature Sensor",
      },
    ]);
  });

  it("carries a filter's last speed when given telemetry that reports one", async () => {
    const telemetry = telemetryFixture();
    const found = discover(await configFromFixture(), telemetry);
    const pool = found.find((e) => e.kind === "filter" && e.body === "Pool");
    expect(pool?.lastSpeed).toBe(80);
    expect(found.find((e) => e.kind === "spillover")?.lastSpeed).toBe(80);
    telemetry.filters[0]!.lastSpeed = 0;
    const again = discover(await configFromFixture(), telemetry);
    expect(
      again.find((e) => e.kind === "filter" && e.body === "Pool")?.lastSpeed,
    ).toBeUndefined();
  });

  it("carries a filter's range and presets", async () => {
    const found = discover(await configFromFixture());
    const one = (kind: string, body: string) =>
      found.find((e) => e.kind === kind && e.body === body);
    expect(one("filter", "Pool")).toMatchObject({
      minSpeed: 58,
      maxSpeed: 100,
      presets: { low: 58, medium: 80, high: 100 },
    });
    expect(one("filter", "Pool")?.lastSpeed).toBeUndefined();
  });

  it("carries each entry's body id, even when two bodies share a name", async () => {
    const config = await testSession({
      config: () =>
        configXml().replace("<Name>Spa</Name>", "<Name>Pool</Name>"),
    }).omni.fetchConfig();
    const found = discover(config);
    expect(
      found.filter((e) => e.kind === "filter").map((e) => e.bodyId),
    ).toEqual([1, 2]);
    expect(found.find((e) => e.kind === "airTemp")?.bodyId).toBe(0);
    expect(found.find((e) => e.kind === "theme")?.bodyId).toBeUndefined();
  });

  it("keys a body's temperature by the body's own id", async () => {
    const found = discover(await configFromFixture());
    expect(
      found.find((e) => e.kind === "waterTemp" && e.body === "Pool")?.id,
    ).toBe(1);
  });

  it("carries a light's shows and the one it is showing", async () => {
    const found = discover(await configFromFixture(), telemetryFixture());
    const pool = found.find((e) => e.kind === "light" && e.body === "Pool");
    expect(pool?.shows?.length).toBe(17);
    expect(pool?.shows).toContainEqual({ value: 6, name: "CLOUD_WHITE" });
    expect(pool?.shows).toContainEqual({ value: 0, name: "VOODOO_LOUNGE" });
    expect(pool?.show).toBe(6);
    const without = discover(await configFromFixture());
    expect(
      without.find((e) => e.kind === "light" && e.body === "Pool")?.show,
    ).toBeUndefined();
  });

  it("marks an OmniDirect light, with its 28 shows and the speeds", async () => {
    expect(poolLight(discover(await configFromFixture()))?.omniDirect).toBe(
      false,
    );
    const direct = poolLight(
      discover(
        await testSession({ config: omniDirectConfigXml }).omni.fetchConfig(),
      ),
    );
    expect(direct?.omniDirect).toBe(true);
    expect(direct?.shows?.length).toBe(28);
    expect(direct?.speeds?.[4]).toBe("1x");
  });

  it("carries a heater's range and current set point", async () => {
    const found = discover(await configFromFixture(), telemetryFixture());
    const pool = found.find((e) => e.kind === "heater" && e.body === "Pool");
    expect(pool).toMatchObject({
      minSetPoint: 55,
      maxSetPoint: 94,
      setPoint: 84,
    });
    const without = discover(await configFromFixture());
    expect(
      without.find((e) => e.kind === "heater" && e.body === "Pool")?.setPoint,
    ).toBeUndefined();
  });
});
