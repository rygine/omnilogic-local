import type { OmniLogic } from "@/client/omnilogic";
import { Backyard } from "@/equipment/backyard";
import type { MSPConfig } from "@/types/config";
import {
  OmniLogicError,
  OmniValidationError,
  ReadingUnavailableError,
} from "@/utils/errors";
import { discover } from "@/utils/inventory";

import {
  EMPTY_TELEMETRY,
  loadConfigFixture,
  makeRecorder,
  seededOmni,
  valuesOf,
} from "./mocks";

// a session over a config, recording what the devices send and answering with `reply`
const sessionFor = (
  config: MSPConfig,
  reply?: unknown,
  telemetry?: unknown,
) => {
  const sent: { name: string; params: unknown }[] = [];
  const session = {
    command: (name: string, params: unknown) => {
      sent.push({ name, params });
      return Promise.resolve(reply);
    },
    config,
    telemetry: telemetry ?? null,
    refresh: () => Promise.resolve(),
    inventory: discover(config),
  } as unknown as OmniLogic;
  return { eq: new Backyard(session), sent };
};

// filter and equipment telemetry at speed 58, for any backyard state
const telemetryIn = (state: number) => ({
  ...EMPTY_TELEMETRY,
  backyard: { state },
  bodiesOfWater: [{ systemId: 1, waterTemp: -1, flow: 255 }],
  filters: [
    {
      systemId: 3,
      filterState: 2,
      filterSpeed: 58,
      lastSpeed: 58,
      valvePosition: 3,
      whyFilterIsOn: 17,
    },
  ],
  relays: [{ systemId: 22, relayState: 1, whyOn: 6 }],
  colorLogicLights: [
    { systemId: 8, lightState: 6, currentShow: 0, speed: 5, brightness: 2 },
  ],
  chlorinators: [
    {
      systemId: 6,
      enable: 0,
      scMode: 1,
      operatingState: 2,
      avgSaltLevel: 2800,
      instantSaltLevel: 2700,
    },
  ],
  heaters: [{ systemId: 5, heaterState: 1 }],
  virtualHeaters: [
    { systemId: 4, currentSetPoint: 94, enable: 0, solarSetPoint: 96 },
  ],
  themes: [{ systemId: 28, groupState: 1 }],
});

// a backyard whose telemetry reports the given pool water temperature and filter state
const backyard = async (
  waterTemp: number,
  filterState: number,
  airTemp = 72,
  filterSpeed = filterState === 0 ? 0 : 58,
  state = 1,
) => {
  const { omni } = makeRecorder({
    telemetry: () => ({
      ...EMPTY_TELEMETRY,
      backyard: { configChksum: 1, state, airTemp },
      bodiesOfWater: [{ systemId: 1, waterTemp }],
      filters: [{ systemId: 3, filterState, filterSpeed }],
    }),
    config: () => loadConfigFixture(),
  });
  await omni.refresh({ refetch: true });
  return omni.backyard;
};

describe("Backyard", () => {
  it("resolves bodies by type, name, or id, and each device's ids from the config", () => {
    const { eq } = sessionFor(loadConfigFixture());
    expect(eq.pool?.name).toBe("Pool");
    expect(eq.spa?.name).toBe("Spa");
    expect(eq.bodies.map((b) => b.name).toSorted()).toEqual(["Pool", "Spa"]);
    expect(eq.body("Spa")?.systemId).toBe(2);
    expect(eq.body(1)?.name).toBe("Pool");
    expect(eq.body("Hot Tub")).toBeUndefined();
    expect(eq.pool?.spilloverEnabled).toBe(true);
    expect(eq.pool?.filter?.poolId).toBe(1);
    expect(eq.pool?.filter?.equipmentId).toBe(3);
    expect(eq.spa?.filter?.equipmentId).toBe(10);
    expect(eq.pool?.chlorinator?.equipmentId).toBe(6);
    expect(eq.spa?.chlorinator?.equipmentId).toBe(13);
    // the thermostat, not the appliance (5), whose settings read through it
    expect(eq.pool?.heater?.equipmentId).toBe(4);
    expect(eq.pool?.heater?.allowLowSpeed).toBe(true);
    // each body's own three presets, from the configuration
    const pool = eq.pool!.filter!;
    expect([pool.lowSpeed, pool.mediumSpeed, pool.highSpeed]).toEqual([
      58, 80, 100,
    ]);
    expect(eq.spa!.filter!.lowSpeed).toBe(60);
    // a collection is handed out as a copy, so pushing into it changes nothing
    const spa = eq.spa!;
    spa.relays.push(spa.relays[0]!);
    expect(spa.relays).toHaveLength(1);

    const config = loadConfigFixture();
    const bodies = [...config.backyard.bodiesOfWater];
    const twoPools = sessionFor({
      ...config,
      backyard: {
        ...config.backyard,
        bodiesOfWater: [
          bodies[0]!,
          { ...bodies[0]!, systemId: 9, name: "Pool 2" },
        ],
      },
    }).eq;
    expect(() => twoPools.pool).toThrow(/more than one body of water of type/i);
  });

  it("reads water and air only from a reporting sensor in normal operation", async () => {
    expect((await backyard(82, 1)).pool!.waterTemp).toBe(82);
    const off = (await backyard(-1, 0)).pool!;
    expect(off.waterTemp).toBeUndefined();
    expect(off.state.waterTemp).toBe(-1);
    // the pump running does not make -1 a temperature
    expect((await backyard(-1, 1)).pool!.waterTemp).toBeUndefined();
    expect((await backyard(80, 1, 65)).airTemp).toBe(65);
    const faulted = await backyard(80, 1, -1);
    expect(faulted.airTemp).toBeUndefined();
    expect(faulted.state.airTemp).toBe(-1);
    // the panel reports a placeholder outside normal operation
    const configMode = await backyard(80, 1, 255, 58, 3);
    expect(configMode.airTemp).toBeUndefined();
    expect(configMode.state.airTemp).toBe(255);
    // the filter reports flow it does not have there, so the water reads nothing
    expect(configMode.pool!.waterTemp).toBeUndefined();
    expect(configMode.pool!.state.waterTemp).toBe(80);
  });

  it("reads a pump as on but not running while it waits to turn off", async () => {
    const waiting = await backyard(80, 3, 72, 0);
    expect(waiting.pool?.filter?.isOn).toBe(true);
    expect(waiting.pool?.filter?.isRunning).toBe(false);
    const running = await backyard(80, 1);
    expect(running.pool?.filter?.isOn).toBe(true);
    expect(running.pool?.filter?.isRunning).toBe(true);
    const off = await backyard(80, 0);
    expect(off.pool?.filter?.isOn).toBe(false);
    expect(off.pool?.filter?.isRunning).toBe(false);
  });

  it("reads equipment as off, and settings as unavailable, outside normal operation", () => {
    const config = loadConfigFixture();
    const at = (state: number) =>
      sessionFor(config, undefined, telemetryIn(state)).eq;

    const config3 = at(3);
    const pool = config3.pool!;
    expect(pool.filter?.isOn).toBe(false);
    expect(pool.filter?.speed).toBe(0);
    expect(pool.filter?.status).toBe("Off");
    expect(
      config3.bodies.flatMap((b) => b.relays).find((r) => r.equipmentId === 22)
        ?.isOn,
    ).toBe(false);
    expect(pool.lights[0]?.isOn).toBe(false);
    expect(pool.chlorinator?.isSuperchlorinating).toBe(false);
    expect(pool.waterTemp).toBeUndefined();
    expect(() => pool.heater?.setPoint).toThrow(ReadingUnavailableError);
    expect(() => pool.heater?.appliances[0]?.enabled).toThrow(
      ReadingUnavailableError,
    );
    expect(() => pool.chlorinator?.enabled).toThrow(ReadingUnavailableError);
    expect(() => pool.lights[0]?.show).toThrow(ReadingUnavailableError);
    expect(() => pool.lights[0]?.speed).toThrow(ReadingUnavailableError);
    expect(() => pool.lights[0]?.brightness).toThrow(ReadingUnavailableError);
    expect(config3.running).toBe(false);
    expect(config3.systemState).toBe("Config Mode");
    expect(pool.filter?.isPriming).toBe(false);
    expect(pool.filter?.lastSpeed).toBe(58);
    expect(pool.spilloverOn).toBe(false);
    expect(pool.spilloverOnCountdown).toBe(false);
    expect(pool.lights[0]?.powerState).toBe("OFF");
    expect(pool.heater?.applianceState).toBe("Off");
    expect(pool.chlorinator?.operatingState).toBe("Off");
    expect(() => pool.chlorinator?.averageSalt).toThrow(
      ReadingUnavailableError,
    );

    const normal = at(1).pool!;
    expect(normal.filter?.isOn).toBe(true);
    expect(normal.filter?.speed).toBe(58);
    expect(normal.lights[0]?.isOn).toBe(true);
    expect(normal.heater?.setPoint).toBe(94);
    // a filter the controller sent no row for moves no water
    const noFilterRow = sessionFor(config, undefined, {
      ...telemetryIn(1),
      bodiesOfWater: [{ systemId: 1, waterTemp: -1, flow: 1 }],
      filters: [],
    }).eq.pool!;
    expect(noFilterRow.waterTemp).toBeUndefined();
    expect(noFilterRow.spilloverOn).toBe(false);
    expect(noFilterRow.spilloverOnCountdown).toBe(false);
    expect(normal.filter?.isPriming).toBe(true);
    expect(normal.filter?.onCountdown).toBe(false);
    expect(normal.spilloverOn).toBe(true);
    expect(normal.spilloverOnCountdown).toBe(true);
    expect(normal.lights[0]?.powerState).toBe("ACTIVE");
    expect(normal.lights[0]?.speed).toBe("2x");
    expect(normal.lights[0]?.brightness).toBe(60);
    expect(normal.heater?.applianceState).toBe("On");
    expect(normal.chlorinator?.operatingState).toBe("Generating");
    expect(normal.chlorinator?.averageSalt).toBe(2800);
    expect(normal.chlorinator?.instantSalt).toBe(2700);
    const running = at(1);
    expect(running.systemState).toBe("On");
    expect(running.themes.activeIds).toEqual([28]);
    expect(
      running.bodies.flatMap((b) => b.relays).find((r) => r.equipmentId === 22)
        ?.onCountdown,
    ).toBe(true);
  });

  it("reads every relay type from whichever telemetry list reports it", () => {
    const { eq } = sessionFor(
      loadConfigFixture("config-extra.xml"),
      undefined,
      {
        ...telemetryIn(1),
        relays: [{ systemId: 22, relayState: 4, whyOn: 6 }],
        valveActuators: [{ systemId: 23, valveActuatorState: 0, whyOn: 0 }],
        smartValveActuators: [
          {
            systemId: 24,
            valveActuatorState: 1,
            whyOn: 0,
            smartValveTarget: 40,
          },
        ],
      },
    );
    const [blower, waterFeature, deckJets] = eq.spa!.relays;
    expect(eq.spa!.relays.map((r) => [r.type, r.function])).toEqual([
      ["RLY_HIGH_VOLTAGE_RELAY", "RLY_BLOWER"],
      ["RLY_VALVE_ACTUATOR", "RLY_WATER_FEATURE"],
      ["RLY_SMART_VALVE_ACTUATOR", "RLY_LAMINARS"],
    ]);
    expect(blower!.isOn).toBe(true);
    expect(blower!.status).toBe("Paused");
    expect(blower!.onCountdown).toBe(true);
    expect(waterFeature!.isOn).toBe(false);
    expect(waterFeature!.status).toBe("Off");
    expect(waterFeature!.onCountdown).toBe(false);
    expect(deckJets!.isOn).toBe(true);
    expect(deckJets!.status).toBe("On");
    // only a smart valve actuator reports where it is driving to
    expect([
      blower!.smartValveTarget,
      waterFeature!.smartValveTarget,
      deckJets!.smartValveTarget,
    ]).toEqual([undefined, undefined, 40]);
    // and only a valve actuator that carries one has a default pump speed
    expect(waterFeature!.valveDefaultSpeed).toBeUndefined();
  });

  it("reaches a relay and a light wired to the backyard, at the backyard's id", () => {
    const { eq, sent } = sessionFor(
      loadConfigFixture("config-extra.xml"),
      undefined,
      {
        ...telemetryIn(1),
        relays: [{ systemId: 30, relayState: 1, whyOn: 5 }],
      },
    );
    const [yardLights] = eq.relays;
    expect([yardLights!.name, yardLights!.function]).toEqual([
      "Yard Lights",
      "RLY_LIGHT",
    ]);
    // the backyard's own id, not a body of water's
    expect(yardLights!.poolId).toBe(0);
    expect(yardLights!.isOn).toBe(true);
    expect(eq.lights.map((l) => [l.name, l.poolId, l.equipmentId])).toEqual([
      ["Path Lights", 0, 31],
    ]);

    void yardLights!.off();
    expect(sent[0]?.name).toBe("SetUIEquipmentCmd");
    expect(sent[0]?.params).toMatchObject({ poolId: 0, equipmentId: 30 });
  });

  it("lists the filter pump and the auxiliary pumps together, each on its own telemetry", () => {
    const { eq } = sessionFor(
      loadConfigFixture("config-extra.xml"),
      undefined,
      {
        ...telemetryIn(1),
        filters: [
          {
            systemId: 10,
            filterState: 2,
            filterSpeed: 58,
            lastSpeed: 58,
            whyFilterIsOn: 10,
          },
        ],
        pumps: [
          {
            systemId: 25,
            pumpState: 2,
            pumpSpeed: 75,
            lastSpeed: 75,
            whyOn: 9,
          },
        ],
      },
    );
    const spa = eq.spa!;
    const [filter, jets] = spa.pumps;
    expect(spa.pumps.map((p) => [p.name, p.type, p.function])).toEqual([
      ["Filter Pump", "FMT_VARIABLE_SPEED_PUMP", undefined],
      ["Jet Pump", "PMP_VARIABLE_SPEED_PUMP", "PMP_JETS"],
    ]);
    // the filter pump is the same object, not a copy alongside itself
    expect(filter).toBe(spa.filter);
    // every controller reports one, fitted with solar or not
    expect(eq.pool!.heater!.solarSetPoint).toBe(96);
    // state 2 and why-on 10 read against the filter's own tables
    expect([filter!.speed, filter!.status, filter!.onCountdown]).toEqual([
      58,
      "Priming",
      true,
    ]);
    // the same two numbers mean something else for a pump
    expect([jets!.speed, jets!.status, jets!.onCountdown]).toEqual([
      75,
      "On (Freeze Protect)",
      true,
    ]);
  });

  it("lists every heat source under one thermostat, each on its own row", () => {
    const { eq, sent } = sessionFor(
      loadConfigFixture("config-extra.xml"),
      undefined,
      {
        ...telemetryIn(1),
        heaters: [
          {
            systemId: 5,
            heaterState: 0,
            temp: 65535,
            enable: 0,
            priority: 1,
            maintainFor: 24,
          },
          {
            systemId: 26,
            heaterState: 1,
            temp: 79,
            enable: 1,
            priority: 0,
            maintainFor: 8,
          },
        ],
      },
    );
    const heater = eq.pool!.heater!;
    // one thermostat, and it is not one of the appliances
    expect(heater.equipmentId).toBe(4);
    expect(
      heater.appliances.map((a) => [
        a.equipmentId,
        a.type,
        a.enabled,
        a.priority,
      ]),
    ).toEqual([
      [5, "HTR_GAS", false, "Priority 2"],
      [26, "HTR_SOLAR", true, "Priority 1"],
    ]);
    const [gas, solar] = heater.appliances;
    // the gas unit reports no temperature, the solar loop reads 79
    expect([gas!.temp, gas!.status, gas!.isOn]).toEqual([
      undefined,
      "Off",
      false,
    ]);
    expect([solar!.temp, solar!.status, solar!.isOn]).toEqual([79, "On", true]);
    expect([gas!.supportsCooling, solar!.supportsCooling]).toEqual([
      undefined,
      true,
    ]);

    // a write goes to the appliance, never to the thermostat
    void solar!.setEnabled(false);
    // 254 is the code the firmware reserves for a solar loop
    void solar!.setPriority(254);
    expect(sent.map((c) => [c.name, c.params])).toEqual([
      ["SetHeaterEnable", { poolId: 1, equipmentId: 26, data: 0 }],
      ["SetUIHeaterPriorityCmd", { poolId: 1, equipmentId: 26, data: 254 }],
    ]);
    // the firmware names five ranks and solar, nothing else is a rank
    expect(() => solar!.setPriority(7)).toThrow(OmniValidationError);
    // and "solar first" is the panel's solar toggle, not a rank a burner takes
    expect(() => gas!.setPriority(254)).toThrow(OmniValidationError);
  });

  it("reads a device the controller does not report as off", () => {
    // the controller is on, and sends no row for any of them
    const { eq } = sessionFor(
      loadConfigFixture("config-extra.xml"),
      undefined,
      {
        ...telemetryIn(1),
        filters: [],
        pumps: [],
        heaters: [],
        chlorinators: [],
        relays: [],
      },
    );
    const spa = eq.spa!;
    expect(spa.filter?.status).toBe("Off");
    expect(spa.filter?.onCountdown).toBe(false);
    expect(spa.filter?.isOn).toBe(false);
    expect(spa.pumps[1]?.status).toBe("Off");
    expect(spa.pumps[1]?.onCountdown).toBe(false);
    const [gas] = eq.pool!.heater!.appliances;
    expect(gas!.status).toBe("Off");
    expect(gas!.isOn).toBe(false);
    expect(gas!.temp).toBeUndefined();
    // a setting has no value to give, rather than an out-of-date one
    expect(() => gas!.enabled).toThrow(/No telemetry/);
    // the pump's resume speed is unknown rather than an error
    expect(spa.pumps[1]?.lastSpeed).toBe(0);
    // every reading on the filter answers, none of them throws
    expect([
      spa.filter?.valvePosition,
      spa.filter?.reportedSpeed,
      spa.filter?.isPriming,
      spa.filter?.whyOn,
    ]).toEqual(["Unknown", 0, false, "Off"]);
    // and a pump says it in its own words
    expect(spa.pumps[1]?.whyOn).toBe("No Message");
    // a relay reads the same way, across all three of its telemetry lists
    expect([
      spa.relays[0]?.status,
      spa.relays[0]?.isOn,
      spa.relays[0]?.whyOn,
      spa.relays[0]?.onCountdown,
    ]).toEqual(["Off", false, "No Message", false]);
    const chlor = eq.pool!.chlorinator!;
    expect([chlor.operatingMode, chlor.conditions]).toEqual([
      "Not Config",
      "None",
    ]);
    // an alert of zero would be a false all-clear, so it refuses instead
    expect(() => chlor.alert).toThrow(/No telemetry/);
    const chem = eq.pool!.csad!;
    expect([chem.ph, chem.orp, chem.mode, chem.isDispensing]).toEqual([
      undefined,
      undefined,
      "Off",
      false,
    ]);
  });

  it("reads chemistry, a probe not reporting as no reading, and takes a target only on the panel's scale", () => {
    const reading = (csad: Record<string, unknown>) =>
      sessionFor(loadConfigFixture("config-extra.xml"), undefined, {
        ...telemetryIn(1),
        csads: [{ systemId: 32, ...csad }],
      }).eq.pool!.csad!;

    const idle = reading({ ph: "0.0", orp: -1, status: 0, mode: 0 });
    expect([idle.ph, idle.orp, idle.mode, idle.isDispensing]).toEqual([
      undefined,
      undefined,
      "Off",
      false,
    ]);
    // the settings come from the configuration, and the pH ones as floats
    expect([
      idle.type,
      idle.enabled,
      idle.phTarget,
      idle.phCalibration,
    ]).toEqual(["ACID", true, 7.5, -1]);
    expect([idle.phLowAlarm, idle.phHighAlarm]).toEqual([6.9, 8.1]);
    expect([idle.orpTarget, idle.orpLowAlarm, idle.orpHighAlarm]).toEqual([
      540, 350, 950,
    ]);

    const dosing = reading({ ph: "7.3", orp: 720, status: 1, mode: 1 });
    expect([dosing.ph, dosing.orp, dosing.mode, dosing.isDispensing]).toEqual([
      7.3,
      720,
      "Auto",
      true,
    ]);

    const { eq, sent } = sessionFor(
      loadConfigFixture("config-extra.xml"),
      undefined,
      { ...telemetryIn(1), csads: [{ systemId: 32, ph: "7.3", orp: 720 }] },
    );
    const chem = eq.pool!.csad!;
    void chem.setPhTarget(7.4);
    void chem.setOrpTarget(650);
    expect(sent.map((c) => [c.name, c.params])).toEqual([
      [
        "UISetCSADTargetValue",
        { poolId: 1, equipmentId: 32, targetValue: 7.4 },
      ],
      ["SetUICSADORPTargetLevel", { poolId: 1, equipmentId: 32, data: 650 }],
    ]);
    // pH 7.0-8.0 by 0.1, ORP 400-900 mV by 5
    expect(() => chem.setPhTarget(6.9)).toThrow(OmniValidationError);
    expect(() => chem.setPhTarget(7.45)).toThrow(OmniValidationError);
    expect(() => chem.setOrpTarget(1000)).toThrow(OmniValidationError);
    expect(() => chem.setOrpTarget(652)).toThrow(OmniValidationError);
  });

  it("names the reason, the valve position, and the cell's conditions", () => {
    const { eq } = sessionFor(
      loadConfigFixture("config-extra.xml"),
      undefined,
      {
        ...telemetryIn(1),
        filters: [
          {
            systemId: 3,
            filterState: 1,
            filterSpeed: 58,
            reportedFilterSpeed: 55,
            valvePosition: 3,
            whyFilterIsOn: 15,
          },
        ],
        pumps: [{ systemId: 25, pumpState: 1, pumpSpeed: 75, whyOn: 1 }],
        relays: [{ systemId: 22, relayState: 1, whyOn: 9 }],
        chlorinators: [
          {
            systemId: 6,
            status: 68,
            operatingMode: 2,
            chlrAlert: 0,
            chlrError: 1280,
          },
        ],
      },
    );
    const pool = eq.pool!;
    expect(pool.filter?.valvePosition).toBe("Spillover");
    expect(pool.filter?.whyOn).toBe("Freeze Protect");
    expect(pool.filter?.reportedSpeed).toBe(55);
    // the same code means something else on a pump that is not the filter
    expect(eq.spa!.pumps[1]?.whyOn).toBe("Freeze Protect");
    expect(eq.spa!.relays[0]?.whyOn).toBe("Freeze Protect");
    // several conditions at once, out of one bitfield
    expect(pool.chlorinator?.conditions).toBe("Generating, K1 Active");
    expect(pool.chlorinator?.operatingMode).toBe("ORP Auto");
    // two fields packed into one word, two bits each
    expect(pool.chlorinator?.error).toBe("Relay K1 Shorted, Relay K2 Shorted");
    expect(pool.chlorinator?.alert).toBe("None");
  });

  it("gives a device held across a refresh the newer settings", async () => {
    const first = loadConfigFixture();
    const second = loadConfigFixture();
    second.backyard.bodiesOfWater[0]!.filter!.freezeProtectTemp = 99;
    let fetches = 0;
    const { omni } = makeRecorder({
      telemetry: () => ({
        ...EMPTY_TELEMETRY,
        backyard: { configChksum: ++fetches, state: 1 },
      }),
      config: () => (fetches <= 1 ? first : second),
    });
    await omni.refresh({ refetch: true });
    const held = omni.backyard.pool!.filter!;
    expect(held.freezeProtectTemp).toBe(38);
    await omni.refresh({ refetch: true });
    // the same object, not a fresh lookup
    expect(held.freezeProtectTemp).toBe(99);
  });

  it("reads a light the controller does not report as off, and refuses to drive it", async () => {
    const { eq, sent } = sessionFor(loadConfigFixture(), undefined, {
      ...telemetryIn(1),
      colorLogicLights: [],
    });
    const light = eq.pool!.lights[0]!;
    expect(light.state).toBeUndefined();
    expect(light.isOn).toBe(false);
    expect(light.powerState).toBe("OFF");
    expect(light.show).toBe("Unknown");
    await expect(light.on()).rejects.toThrow(OmniLogicError);
    expect(sent).toEqual([]);
  });

  it("sends each device's ids and the value under the spec's names", async () => {
    // every reply field reads 0, enough for the reads to return
    const reply = new Proxy({}, { get: () => 0 });
    const { eq, sent } = sessionFor(loadConfigFixture(), reply, telemetryIn(1));
    const pool = eq.pool!;
    const spa = eq.spa!;
    const rows: [() => Promise<unknown>, string, Record<string, number>][] = [
      [
        () => pool.filter!.setSpeed(75),
        "SetUIEquipmentCmd",
        { poolId: 1, equipmentId: 3, isOn: 75 },
      ],
      [
        () => pool.setSpilloverEnabled(true),
        "SetSpaSpilloverEnable",
        { poolId: 1, data: 1 },
      ],
      [
        () => pool.filter!.diagnostics({ raw: true }),
        "GetUIFilterDiagnosticInfo",
        { poolId: 1, equipmentId: 3 },
      ],
      [
        () => pool.chlorinator!.cellMeasurement({ raw: true }),
        "GetCHLORMeasurement",
        { poolId: 1, equipmentId: 7 },
      ],
      [
        () => pool.chlorinator!.superchlorinate(),
        "SetUISuperCHLORCmd",
        { poolId: 1, equipmentId: 6, data: 1 },
      ],
      [
        () => pool.chlorinator!.superchlorinateMinutesRemaining(),
        "GetUISuperCHLORTimeRemaining",
        { poolId: 1, equipmentId: 6 },
      ],
      [
        () => spa.relays[0]!.setCountdownTime(90),
        "SetUIEquipmentCmd",
        {
          poolId: 2,
          equipmentId: 22,
          isOn: 1,
          isCountDownTimer: 1,
          endTimeHours: 1,
          endTimeMinutes: 30,
        },
      ],
      [
        () => pool.heater!.setSolarSetPoint(90),
        "SetUISolarSetPointCmd",
        { poolId: 1, equipmentId: 4, data: 90 },
      ],
      [
        () => pool.heater!.autoDifferential(),
        "GetHeaterAutoDifferential",
        { poolId: 1, equipmentId: 4 },
      ],
      [
        () => pool.heater!.setAutoDifferential(3),
        "SetHeaterAutoDifferential",
        { poolId: 1, equipmentId: 4, data: 3 },
      ],
      [() => eq.panel.beeper(), "GetBeeper", {}],
      [() => eq.panel.backLight(), "GetBackLight", {}],
      [() => eq.panel.backLightBrightness(), "GetBackLightBrightness", {}],
      [() => eq.panel.coordinates(), "GetCoordinates", {}],
      [
        () => eq.panel.setCoordinates(41.9, -87.6),
        "SetCoordinates",
        { latitude: 41.9, longitude: -87.6 },
      ],
    ];
    for (const [call, name, params] of rows) {
      sent.length = 0;
      await call();
      expect(sent).toHaveLength(1);
      expect(sent[0]!.name).toBe(name);
      expect(sent[0]!.params).toMatchObject(params);
    }
    expect(pool.heater!.appliances[0]!.sharedWith).toBe(12);
    expect(eq.panel.vspSpeedFormat).toBe("RPM");
    expect(eq.panel.chlorinatorDisplay).toBe("Salt");
    expect(eq.panel.timeFormat).toBe(12);
    expect(pool.lights[0]!.showParams(5)).toEqual({
      data: 5,
      field19: 0,
      field1a: 0,
      field1b: 0,
    });
  });

  it("refuses a write outside the controller's vocabulary before sending", async () => {
    const { eq, sent } = sessionFor(
      loadConfigFixture(),
      undefined,
      telemetryIn(1),
    );
    const pool = eq.pool!;
    expect(() => pool.heater!.setSetPoint(500)).toThrow(OmniValidationError);
    expect(() => pool.heater!.setSolarSetPoint(500)).toThrow(
      OmniValidationError,
    );
    expect(() => pool.heater!.setMode(7)).toThrow(OmniValidationError);
    expect(() => pool.heater!.setMode(3)).toThrow(OmniValidationError);
    expect(() => pool.chlorinator!.setTimedPercent(150)).toThrow(
      OmniValidationError,
    );
    expect(() => eq.panel.setTimeFormat(13)).toThrow(OmniValidationError);
    await expect(pool.lights[0]!.setShow(99)).rejects.toThrow(
      OmniValidationError,
    );
    expect(sent).toEqual([]);
  });

  it("lists the OmniDirect shows once the light is switched to OmniDirect", () => {
    const standard = loadConfigFixture();
    const direct = {
      ...standard,
      backyard: {
        ...standard.backyard,
        bodiesOfWater: standard.backyard.bodiesOfWater.map((b) => ({
          ...b,
          colorLogicLights: b.colorLogicLights.map((l) => ({
            ...l,
            v2Active: true,
          })),
        })),
      },
    };
    const warmWhite = {
      ...telemetryIn(1),
      colorLogicLights: [{ systemId: 8, lightState: 6, currentShow: 25 }],
    };

    const before = sessionFor(standard, undefined, warmWhite).eq.pool!
      .lights[0]!;
    expect(before.omniDirect).toBe(false);
    expect(before.shows).toHaveLength(17);
    expect(before.show).toBe("Unknown");

    const after = sessionFor(direct, undefined, warmWhite).eq.pool!.lights[0]!;
    expect(after.omniDirect).toBe(true);
    expect(after.shows.map((s) => s.name)).toContain("WARM_WHITE");
    expect(after.show).toBe("WARM_WHITE");
  });

  it("addresses each command to the body, the device, or its cell as the spec says", async () => {
    const own = sessionFor(loadConfigFixture());
    const relay = own.eq.spa!.relays[0]!;
    await relay.on();
    await relay.off();
    await own.eq.pool!.chlorinator!.setEnabled(true);
    expect(own.sent.map((s) => s.name)).toEqual([
      "SetUIEquipmentCmd",
      "SetUIEquipmentCmd",
      "SetCHLOREnable",
    ]);
    expect(own.sent[0]!.params).toMatchObject({
      poolId: 2,
      equipmentId: 22,
      isOn: 1,
    });
    expect(own.sent[1]!.params).toMatchObject({ isOn: 0 });
    expect(own.sent[2]!.params).toEqual({ poolId: 1, data: 1 });

    const rsp =
      "<Response><Name>GetCHLORRelayPolarityRsp</Name><Parameters>" +
      '<Parameter name="PoolID" dataType="int">1</Parameter>' +
      '<Parameter name="ChlorID" dataType="int">7</Parameter>' +
      '<Parameter name="RelaySetting" dataType="byte">0</Parameter>' +
      "</Parameters></Response>";
    const { omni, sent } = await seededOmni({ response: rsp });
    const pool = omni.backyard.pool!;
    expect(await pool.chlorinator!.relayPolarity()).toBe(0);
    await pool.chlorinator!.setSuperchlorinateHours(2);
    await pool.filter!.setMinSpeed(60);
    await pool.filter!.setFreezeProtect(true);
    expect(sent.map((s) => valuesOf(s.xml))).toEqual([
      ["1", "7"],
      ["1", "6", "2"],
      ["1", "3", "60"],
      ["1", "1"],
    ]);
  });

  it("decodes a diagnostics read, raw on request", async () => {
    const { eq, sent } = sessionFor(loadConfigFixture(), {
      poolId: 1,
      chlorId: 7,
      opState: 2,
      scState: 0,
      alertStatus: 128,
      instantSaltHigh: 11,
      instantSaltLow: 176,
      averageSaltHigh: 12,
      averageSaltLow: 145,
      activelyDispensing: 0,
    });
    const chlorinator = eq.pool!.chlorinator!;
    const r = await chlorinator.cellStatus();
    expect(sent[0]).toEqual({
      name: "GetCHLORStatus",
      params: { poolId: 1, equipmentId: 7 },
    });
    expect(r.instantSalt).toBe(2992);
    expect(r.averageSalt).toBe(3217);
    expect(r.opState).toBe("Generating");
    // a salt cell: the feeder-only field is left out of the reading
    expect(Object.keys(r)).not.toContain("activelyDispensing");
    expect((await chlorinator.cellStatus({ raw: true })).opState).toBe(2);

    const { omni } = await seededOmni({
      response:
        "<Response><Name>GetRemainingCountdownTimeRsp</Name><Parameters>" +
        '<Parameter name="PoolID" dataType="int">1</Parameter>' +
        '<Parameter name="EquipmentID" dataType="int">22</Parameter>' +
        '<Parameter name="Hour" dataType="byte">1</Parameter>' +
        '<Parameter name="Minute" dataType="byte">29</Parameter>' +
        '<Parameter name="Second" dataType="byte">0</Parameter>' +
        "</Parameters></Response>",
    });
    expect(await omni.backyard.spa!.relays[0]!.remainingCountdownTime()).toBe(
      89,
    );
  });
});

describe("Panel", () => {
  it("reads a setting from its reply, mapped to a label where one applies, and writes one as its parameter", async () => {
    const timeout = makeRecorder({
      response:
        "<Response><Name>GetBackLightTimeoutRsp</Name><Parameters>" +
        '<Parameter name="Timeout" dataType="int">30</Parameter>' +
        "</Parameters></Response>",
    });
    expect(await timeout.omni.backyard.panel.backLightTimeout()).toBe(30);
    expect(valuesOf(timeout.sent[0]!.xml)).toEqual([]);
    const units = makeRecorder({
      response:
        "<Response><Name>GetUnitsRsp</Name><Parameters>" +
        '<Parameter name="UnitFormat" dataType="bool">1</Parameter>' +
        "</Parameters></Response>",
    });
    expect(await units.omni.backyard.panel.units()).toBe("Metric");

    const { omni, sent } = makeRecorder();
    await omni.backyard.panel.setBeeper(false);
    await omni.backyard.panel.setBackLightTimeout(60);
    await omni.backyard.panel.setUnits("Standard");
    await omni.backyard.panel.setVspSpeedFormat("RPM");
    await omni.backyard.panel.setChlorinatorDisplay("Minerals");
    expect(sent.map((s) => valuesOf(s.xml))).toEqual([
      ["0"],
      ["60"],
      ["0"],
      ["1"],
      ["0"],
    ]);
  });
});
