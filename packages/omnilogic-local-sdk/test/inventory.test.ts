import type { BodyOfWater, MSPConfig } from "@/types/config";
import { discover, installedAt, systemIdAt } from "@/utils/inventory";

import { loadConfigFixture } from "./mocks";

// a one-body config with the given equipment on the pool
const oneBody = (equipment: Record<string, unknown>, system = {}) =>
  discover({
    system,
    backyard: {
      bodiesOfWater: [
        {
          systemId: 1,
          name: "Pool",
          type: "BOW_POOL",
          supportsSpillover: false,
          sensors: [],
          relays: [],
          pumps: [],
          colorLogicLights: [],
          ...equipment,
        },
      ],
    },
  } as unknown as MSPConfig).bodies[0]!;

// the pool of the config fixture with extra merged in
const poolWith = (extra: Partial<BodyOfWater>) => {
  const config = loadConfigFixture();
  const bodies = config.backyard.bodiesOfWater;
  return discover({
    ...config,
    backyard: {
      ...config.backyard,
      bodiesOfWater: bodies.map((b) =>
        b.systemId === 1 ? { ...b, ...extra } : b,
      ),
    },
  }).bodies.find((b) => b.systemId === 1)!;
};

const CSAD = { systemId: 99, type: "CSAD" } as unknown as BodyOfWater["csad"];

describe("discover", () => {
  it("reads the fixture: every device, its ids, and the dotted paths, serializable", () => {
    const inventory = discover(loadConfigFixture());
    expect(inventory.bodies.map((b) => b.systemId)).toEqual([1, 2]);
    const [pool, spa] = inventory.bodies;
    expect(pool!.chlorinator).toMatchObject({
      installed: true,
      systemId: 6,
      cell: {
        installed: true,
        systemId: 7,
        cellType: "CELL_TYPE_TCELLS340",
        feeder: false,
      },
    });
    // switched off in the config, still installed: Enabled is state
    expect(spa!.chlorinator).toMatchObject({
      installed: true,
      systemId: 13,
      cell: { installed: true, systemId: 14 },
    });
    expect(pool!.heater).toMatchObject({
      installed: true,
      heaterType: "HTR_GAS",
      gas: true,
    });
    expect(pool!.filter).toEqual({
      installed: true,
      systemId: 3,
      vsp: true,
    });
    expect(spa!.blower).toEqual({ installed: true, systemId: 22 });
    expect(pool!.blower).toEqual({ installed: false });
    expect(installedAt(pool!, "chlorinator.cell")).toBe(true);
    expect(systemIdAt(pool!, "chlorinator.cell")).toBe(7);
    expect(installedAt(pool!, "chlorinator.feeder")).toBe(false);
    expect(systemIdAt(pool!, "chlorinator")).toBe(6);
    // the thermostat (<Heater>) and the appliance (<Heater-Equipment>)
    expect(systemIdAt(pool!, "heater")).toBe(4);
    expect(systemIdAt(pool!, "heater.unit")).toBe(5);
    expect(systemIdAt(spa!, "heater")).toBe(11);
    expect(systemIdAt(spa!, "heater.unit")).toBe(12);
    expect(installedAt(pool!, "csad")).toBe(false);
    expect(systemIdAt(pool!, "csad")).toBeUndefined();
    // the pool and spa share the filter pump
    expect(pool!.spillover).toBe(true);
    expect(spa!.spillover).toBe(true);
    expect(systemIdAt(pool!, "spillover")).toBeUndefined();
    expect(systemIdAt(pool!, "blower")).toBeUndefined();
    expect(JSON.parse(JSON.stringify(inventory))).toEqual(inventory);

    // a body with two lights gates on the first
    const two = discover(loadConfigFixture("config-extra.xml"));
    expect(two.bodies[0]!.light).toEqual({
      installed: true,
      systemId: 8,
      networked: false,
    });
  });

  it("places a liquid or tablet cell child as the feeder", () => {
    const cell = (cellType: string) =>
      oneBody({
        chlorinator: {
          systemId: 6,
          cellType,
          operations: [
            { chlorinatorEquipment: { systemId: 7, operations: [] } },
          ],
        },
      });
    expect(installedAt(cell("CELL_TYPE_LIQUID"), "chlorinator.feeder")).toBe(
      true,
    );
    expect(systemIdAt(cell("CELL_TYPE_LIQUID"), "chlorinator.feeder")).toBe(7);
    expect(installedAt(cell("CELL_TYPE_TABLET"), "chlorinator.feeder")).toBe(
      true,
    );
    expect(installedAt(cell("CELL_TYPE_T15"), "chlorinator.feeder")).toBe(
      false,
    );
    expect(installedAt(cell("CELL_TYPE_FUTURE"), "chlorinator.feeder")).toBe(
      true,
    );
  });

  it("marks a heater's unit absent without a <Heater-Equipment>, and a body gas-fired when any appliance burns gas", () => {
    const thermostatOnly = oneBody({ heater: { systemId: 4, operations: [] } });
    expect(thermostatOnly.heater).toMatchObject({
      installed: true,
      systemId: 4,
    });
    expect(installedAt(thermostatOnly, "heater.unit")).toBe(false);
    expect(systemIdAt(thermostatOnly, "heater.unit")).toBeUndefined();
    expect(installedAt(oneBody({}), "heater.unit")).toBe(false);

    const config = loadConfigFixture("config-extra.xml");
    expect(installedAt(discover(config).bodies[0]!, "heater.gas")).toBe(true);
    // the same two appliances, solar first
    const flipped = structuredClone(config);
    const ops = flipped.backyard.bodiesOfWater[0]!.heater!.operations;
    const withUnits = ops.filter((o) => o.heaterEquipment !== undefined);
    [withUnits[0]!.heaterEquipment, withUnits[1]!.heaterEquipment] = [
      withUnits[1]!.heaterEquipment,
      withUnits[0]!.heaterEquipment,
    ];
    expect(installedAt(discover(flipped).bodies[0]!, "heater.gas")).toBe(true);
  });

  it("places a CSAD node as csad, with or without a chlorinator", () => {
    const module = { installed: true, systemId: 99 };
    expect(poolWith({ csad: CSAD }).csad).toEqual(module);
    const noChlorinator = poolWith({ csad: CSAD, chlorinator: undefined });
    expect(noChlorinator.chlorinator).toEqual({ installed: false });
    expect(noChlorinator.csad).toEqual(module);
  });

  it("leaves a body without an id out", () => {
    const config = loadConfigFixture();
    const [pool, spa] = config.backyard.bodiesOfWater;
    const nameless = { ...spa, systemId: undefined } as unknown as BodyOfWater;
    const bodies = discover({
      ...config,
      backyard: { ...config.backyard, bodiesOfWater: [pool!, nameless] },
    }).bodies;
    expect(bodies.map((b) => b.systemId)).toEqual([1]);
  });

  it("marks missing equipment not installed, and does not rule out a type it has never seen", () => {
    const minimal = discover(loadConfigFixture("config-minimal.xml")).bodies;
    expect(minimal).toHaveLength(1);
    expect(minimal[0]!.chlorinator).toEqual({ installed: false });
    expect(minimal[0]!.heater).toEqual({ installed: false });
    expect(minimal[0]!.light.installed).toBe(true);
    expect(minimal[0]!.filter.installed).toBe(true);

    // the fixture's light is not networked
    expect(installedAt(minimal[0]!, "light.networked")).toBe(false);
    const networked = oneBody({
      colorLogicLights: [{ systemId: 8, networked: true }],
    });
    expect(installedAt(networked, "light.networked")).toBe(true);
    expect(systemIdAt(networked, "light.networked")).toBe(8);
    const secondNetworked = oneBody({
      colorLogicLights: [
        { systemId: 8, networked: false },
        { systemId: 9, networked: true },
      ],
    });
    expect(installedAt(secondNetworked, "light.networked")).toBe(true);
    expect(installedAt(oneBody({}), "light.networked")).toBe(false);

    const pond = oneBody(
      {
        type: "BOW_KOI",
        filter: { systemId: 3, filterType: "FMT_WATERWHEEL" },
      },
      { units: "Cubits", mspVspSpeedFormat: "Furlongs" },
    );
    expect(pond.filter).toEqual({
      installed: true,
      systemId: 3,
      vsp: true,
    });
    expect(pond.chlorinator).toEqual({ installed: false });
    // no sharing declared
    expect(pond.spillover).toBe(false);
    expect(oneBody({ sharedType: "BOW_NO_EQUIPMENT_SHARED" }).spillover).toBe(
      false,
    );
    // shared with a body the config does not list
    expect(
      oneBody({
        sharedType: "BOW_SHARED_EQUIPMENT",
        sharedEquipmentSystemId: 9,
      }).spillover,
    ).toBe(true);
    expect(
      discover({
        system: {},
        backyard: { bodiesOfWater: [] },
      } as unknown as MSPConfig),
    ).toEqual({ bodies: [] });
  });
});
