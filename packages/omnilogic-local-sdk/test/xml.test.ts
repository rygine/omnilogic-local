import type { MSPConfig } from "@/types/config";
import { OmniValidationError } from "@/utils/errors";
import {
  buildMessageXml,
  parametersByName,
  parseConfig,
  parseSysInfo,
  parseTelemetry,
  parseXML,
} from "@/utils/xml";

import { fixture } from "./mocks";

describe("buildMessageXml", () => {
  it("builds the request envelope, refusing a character XML cannot carry", () => {
    const bare = buildMessageXml("RequestConfiguration");
    expect(bare).toContain("<Name>RequestConfiguration</Name>");
    expect(bare).toContain('xmlns="http://nextgen.hayward.com/api"');
    expect(bare).not.toContain("<Parameters>");
    const xml = buildMessageXml("SetUIHeaterCmd", [
      { name: "poolId", dataType: "int", value: "1" },
      { name: "temp", dataType: "int", value: "85" },
    ]);
    expect(xml).toContain(
      '<Parameter name="poolId" dataType="int">1</Parameter>',
    );
    expect(xml).toContain(
      '<Parameter name="temp" dataType="int">85</Parameter>',
    );
    expect(() =>
      buildMessageXml("X", [
        { name: "name", dataType: "string", value: "ab" },
      ]),
    ).toThrow(OmniValidationError);
  });
});

describe("parseXML", () => {
  it("camel-cases the names the controller emits", () => {
    const cases = {
      MSPConfig: "mspConfig",
      "Body-of-water": "bodyOfWater",
      "System-Id": "systemId",
      "ColorLogic-Light": "colorLogicLight",
      "SuperChlor-Timeout": "superChlorTimeout",
      "Shared-Equipment-System-ID": "sharedEquipmentSystemId",
      "UI-Filter-SimpleMode": "uiFilterSimpleMode",
      CHECKSUM: "checksum",
      DST: "dst",
      sche: "sche",
      "bow-system-id": "bowSystemId",
      PoolID: "poolId",
      ChlorID: "chlorId",
      NumComponents: "numComponents",
      HUA: "hua",
    };
    const tags = Object.keys(cases).map((t) => `<${t}>1</${t}>`);
    const parsed: { root: object } = parseXML(`<Root>${tags.join("")}</Root>`);
    expect(Object.keys(parsed.root)).toEqual(Object.values(cases));
  });

  it("camel-cases names, coerces numbers and yes/no, and keeps a name a user typed as text", () => {
    const result: {
      root: {
        systemId: number;
        FilterState?: number;
        filterState: number;
        enabled: boolean;
        disabled: boolean;
        name: string;
      };
    } = parseXML(
      '<Root systemId="1" FilterState="2" enabled="yes" disabled="no" name="test"/>',
    );
    expect(result.root).toEqual({
      systemId: 1,
      filterState: 2,
      enabled: true,
      disabled: false,
      name: "test",
    });
    const xml = fixture("config.xml")
      .replace("<Name>Pool</Name>", "<Name>2024</Name>")
      .replace("<Device-Name>MP</Device-Name>", "<Device-Name>4</Device-Name>");
    const config = parseConfig(xml);
    expect(config.backyard.bodiesOfWater[0]!.name).toBe("2024");
    expect(config.devices[0]!.deviceName).toBe("4");
    expect(config.backyard.bodiesOfWater[0]!.sizeInGallons).toBe(0);
  });

  it("yields a list tag as an array even with one child, a body's filter as an object", () => {
    const status: { status: { filter: unknown[] } } = parseXML(
      '<STATUS><Filter systemId="3" filterState="0"/></STATUS>',
    );
    expect(status.status.filter).toEqual([{ systemId: 3, filterState: 0 }]);
    const config: {
      mspConfig: { backyard: { bodyOfWater: { filter: unknown }[] } };
    } = parseXML(
      "<MSPConfig><Backyard><BodyOfWater><Filter><Name>Pump</Name></Filter></BodyOfWater></Backyard></MSPConfig>",
    );
    expect(config.mspConfig.backyard.bodyOfWater[0]?.filter).toEqual({
      name: "Pump",
    });
  });
});

describe("parametersByName", () => {
  it("coerces each value by its declared dataType", () => {
    expect(
      parametersByName([
        { name: "Temp", dataType: "int", _: "86" },
        { name: "Speed", dataType: "byte", _: "50" },
        { name: "Enabled", dataType: "bool", _: "1" },
        { name: "TargetValue", dataType: "float", _: "7.4" },
        { name: "Label", dataType: "string", _: "Spa" },
      ]),
    ).toEqual({
      temp: 86,
      speed: 50,
      enabled: true,
      targetValue: 7.4,
      label: "Spa",
    });
  });
});

// whether the pool's heating appliances say they can cool
const cooling = (c: MSPConfig) =>
  c.backyard.bodiesOfWater[0]!.heater?.operations.flatMap(
    (o) => o.heaterEquipment?.supportsCooling ?? [],
  );

describe("the config, telemetry, and sysinfo parsers", () => {
  it("refuse a reply of the wrong kind, by name", () => {
    expect(() => parseConfig("<Response/>")).toThrow(/MSPConfig/);
    expect(() => parseConfig("")).toThrow(/MSPConfig/);
    expect(() => parseTelemetry("<Response/>")).toThrow(/STATUS/);
    expect(() => parseSysInfo("<Response/>")).toThrow(/SysInfo/);
    expect(() => parseSysInfo("<SysInfo/>")).toThrow(/SysInfo/);
  });

  it("parseConfig lists every light on a body", () => {
    const one = parseConfig(fixture("config.xml")).backyard.bodiesOfWater[0]!;
    expect(one.colorLogicLights.map((l) => l.systemId)).toEqual([8]);
    const two = parseConfig(fixture("config-extra.xml")).backyard
      .bodiesOfWater[0]!;
    expect(two.colorLogicLights.map((l) => l.name)).toEqual([
      "Color Lights",
      "Sheer Lights",
    ]);
    expect(two.colorLogicLights[1]!.operations).not.toHaveLength(0);
  });

  it("parseConfig reads a favorite, a blower, and a system with no time zone", () => {
    const config = parseConfig(fixture("config-2.xml"));
    expect(config.checksum).toBe(2885919);
    expect(config.favorites).toEqual([
      {
        systemId: 23,
        indexId: 1,
        equipmentIdOrThemeId: 15,
        sequence: 0,
        data: 0,
        simpleModeEnabled: 1,
      },
    ]);
    const [pool, spa] = config.backyard.bodiesOfWater;
    expect(pool!.supportsSpillover).toBe(false);
    expect(spa!.relays.map((r) => r.function)).toEqual(["RLY_BLOWER"]);
    expect(config.system).not.toHaveProperty("timeZone");
    expect(config.system).not.toHaveProperty("dst");
    expect(config.system).not.toHaveProperty("internetTime");
  });

  it("parseConfig reads the optional fields only when sent: a filter, OmniDirect, solar, cooling, and valve speed", () => {
    const xml = fixture("config.xml");
    const extra = fixture("config-extra.xml");
    const bare = parseConfig(xml);
    expect(
      parseConfig(
        fixture("config-minimal.xml").replace(/<Filter>[\s\S]*?<\/Filter>/, ""),
      ).backyard.bodiesOfWater[0]!.filter,
    ).toBeUndefined();
    expect(bare.backyard.bodiesOfWater[0]!.colorLogicLights[0]?.v2Active).toBe(
      undefined,
    );
    const direct = xml.replace(
      "<Networked>no</Networked>",
      "<Networked>no</Networked><V2-Active>yes</V2-Active>",
    );
    expect(
      parseConfig(direct).backyard.bodiesOfWater[0]!.colorLogicLights[0]
        ?.v2Active,
    ).toBe(true);
    expect(
      bare.backyard.bodiesOfWater[0]!.heater?.solarSetPoint,
    ).toBeUndefined();
    expect(cooling(bare)).toEqual([]);
    expect(
      parseConfig(extra).backyard.bodiesOfWater[1]!.relays[1]
        ?.valveDefaultSpeed,
    ).toBeUndefined();

    const solar = parseConfig(
      xml
        // the pool's thermostat, whose set point the spa does not share
        .replace(
          "<Current-Set-Point>94</Current-Set-Point>",
          "<Current-Set-Point>94</Current-Set-Point><SolarSetPoint>86</SolarSetPoint>",
        )
        .replace(
          "<Sensor-System-Id>-1</Sensor-System-Id>",
          "<Sensor-System-Id>-1</Sensor-System-Id><SupportsCooling>yes</SupportsCooling>",
        ),
    );
    expect(solar.backyard.bodiesOfWater[0]!.heater?.solarSetPoint).toBe(86);
    expect(cooling(solar)).toEqual([true]);

    const valves = parseConfig(
      extra.replace(
        "<Type>RLY_VALVE_ACTUATOR</Type>",
        "<Type>RLY_VALVE_ACTUATOR</Type><Valve-Default-Speed>85</Valve-Default-Speed>",
      ),
    );
    const [, waterFeature] = valves.backyard.bodiesOfWater[1]!.relays;
    expect([waterFeature?.name, waterFeature?.valveDefaultSpeed]).toEqual([
      "Water Feature",
      85,
    ]);
  });

  it("parseConfig reads a chemistry module and the unit under it", () => {
    const pool = parseConfig(fixture("config-extra.xml")).backyard
      .bodiesOfWater[0]!;
    const csad = pool.csad!;
    expect(csad).toMatchObject({
      systemId: 32,
      name: "pH",
      mode: "CSAD_AUTO",
      type: "ACID",
      enabled: true,
      extendEnabled: false,
      timeout: 7200,
      forcedOnTime: 300,
      // a %1.1f float stays the string the controller wrote
      targetValue: "7.5",
      calibrationValue: "-1.0",
      phLowAlarmLevel: "6.9",
      phHighAlarmLevel: "8.1",
      orpTargetLevel: 540,
      orpRuntimeLevel: 540,
      orpLowAlarmLevel: 350,
      orpHighAlarmLevel: 950,
      orpForcedOnTime: 0,
      orpForcedEnabled: false,
    });
    // the operations are a list like every other equipment's
    expect(csad.operations).toHaveLength(2);
    expect(csad.operations[0]?.actions[0]?.actionFunction).toBe(
      "ACT_FNC_CSAD_STATUS_GET",
    );
    // the module itself hangs off an operation, as a heater's appliance does
    expect(csad.operations.flatMap((o) => o.csadEquipment ?? [])).toMatchObject(
      [
        {
          systemId: 33,
          name: "ChemSense1",
          csadType: "AQL-CHEM",
          enabled: true,
        },
      ],
    );
  });

  it("parseConfig lists a theme's commands with their parameters", () => {
    const xml = fixture("config-minimal.xml").replace(
      "</MSPConfig>",
      "<Groups><group><System-Id>29</System-Id><Name>Party</Name><Icon-Id>0</Icon-Id>" +
        '<Request><Name>SetUIEquipmentCmd</Name><Parameters><Parameter name="EquipmentID" dataType="int">7</Parameter></Parameters></Request>' +
        "</group><group><System-Id>30</System-Id><Name>Empty</Name><Icon-Id>0</Icon-Id></group></Groups></MSPConfig>",
    );
    const [party, empty] = parseConfig(xml).themes;
    expect(party!.commands).toEqual([
      {
        name: "SetUIEquipmentCmd",
        parameters: [{ name: "EquipmentID", dataType: "int", value: 7 }],
      },
    ]);
    expect(empty!.commands).toEqual([]);
  });

  it("parseSysInfo lists every board with its address and firmware", () => {
    const info = parseSysInfo(fixture("sysinfo.xml"));
    expect(info.numComponents).toBe(4);
    expect(info.components.map((c) => [c.devName, c.type, c.version])).toEqual([
      ["MSP", "MSP", "R0502000"],
      ["MP", "MP", "R 4.4.0"],
      ["Omni", "OPL", "R 5.2.0"],
      ["VSP", "EPNS", "R 1.0.15"],
    ]);
    expect(info.components[3]).toEqual({
      devName: "VSP",
      type: "EPNS",
      hua: "00-33-44-55-66",
      version: "R 1.0.15",
      nodeId: 22,
      systemId: -1,
      upgradeCapable: false,
    });
    expect(info.components[0]!.systemId).toBe(1);
    expect(info.components[0]!.upgradeCapable).toBe(true);
  });
});
