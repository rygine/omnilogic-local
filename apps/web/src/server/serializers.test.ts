import {
  CHLORINATOR_OPERATING_STATE,
  FILTER_STATE,
  HEATER_MODE,
  HEATER_STATE,
  LIGHT_SPEED,
  SYSTEM_STATE,
  getAvailableShows,
  isLightLit,
  type OmniLogic,
} from "@rygine/omnilogic-local-sdk";

import { sentenceCase } from "@/shared/sentence-case";
import { percentToRpm } from "@/shared/speed";

import {
  serializeSystem,
  serializeThemes,
  serializeWorld,
} from "./serializers";

const scheduleSummaries = (omni: OmniLogic) => serializeWorld(omni).schedules;

// a fake carries every list as an array, as the SDK's parsers do
const emptyTelemetry = {
  backyard: { airTemp: 78, state: 1 },
  bodiesOfWater: [],
  chlorinators: [],
  colorLogicLights: [],
  csads: [],
  filters: [],
  themes: [],
  heaters: [],
  pumps: [],
  relays: [],
  smartValveActuators: [],
  valveActuators: [],
  virtualHeaters: [],
};

type Row = Record<string, number> & { systemId: number };
type Stub = {
  config: unknown;
  telemetry: Record<string, unknown> & { backyard: Record<string, number> };
  backyard: Record<string, unknown> & {
    bodies: (Record<string, unknown> & {
      systemId: number;
      filter?: { equipmentId: number; name: string };
      heater?: { equipmentId: number; name: string };
      chlorinator?: { equipmentId: number; name: string };
      lights?: { equipmentId: number; name: string }[];
      relays?: { equipmentId: number; name: string }[];
    })[];
    themes?: Record<string, unknown>;
  };
  [key: string]: unknown;
};

// a fake's devices with the SDK's getters, read live from the fake's telemetry rows
const withDevices = (fake: unknown): OmniLogic => {
  const stub = fake as Stub;
  const t = stub.telemetry;
  const rows = (kind: string): Row[] => (t[kind] as Row[] | undefined) ?? [];
  const running = () =>
    t.backyard.state === undefined || t.backyard.state === 1;
  const rowOf = (kind: string, id: number, name: string): Row => {
    const row = rows(kind).find((r) => r.systemId === id);
    if (row === undefined) {
      throw new Error(`No telemetry for "${name}"`);
    }
    return row;
  };
  const filter = (d: { equipmentId: number; name: string }) => ({
    ...d,
    get state(): Row {
      return rowOf("filters", d.equipmentId, d.name);
    },
    get speed(): number {
      return running() ? this.state.filterSpeed! : 0;
    },
    get isOn(): boolean {
      return running() && this.state.filterState !== 0;
    },
    get status(): string {
      return running()
        ? (FILTER_STATE[this.state.filterState!] ?? "Unknown")
        : "Off";
    },
    get lastSpeed(): number {
      return this.state.lastSpeed!;
    },
    get isPriming(): boolean {
      return running() && [2, 10].includes(this.state.filterState!);
    },
    get onCountdown(): boolean {
      return running() && this.state.whyFilterIsOn === 10;
    },
  });
  const appliances = (bodyId: number) => {
    const config = stub.config as {
      backyard: { bodiesOfWater: Record<string, unknown>[] };
    };
    const heater = config.backyard.bodiesOfWater.find(
      (b) => b.systemId === bodyId,
    )?.heater as { operations?: { heaterEquipment?: { systemId: number } }[] };
    return heater?.operations?.[0]?.heaterEquipment?.systemId;
  };
  const heater = (
    d: { equipmentId: number; name: string },
    bodyId: number,
  ) => ({
    ...d,
    get state(): Row {
      return rowOf("virtualHeaters", d.equipmentId, d.name);
    },
    get enabled(): boolean {
      return this.state.enable !== 0;
    },
    get setPoint(): number {
      return this.state.currentSetPoint!;
    },
    get mode(): string {
      return HEATER_MODE[this.state.mode!] ?? "Unknown";
    },
    get silentMode(): boolean {
      return this.state.silentMode !== 0;
    },
    get applianceState(): string {
      const row = rows("heaters").find(
        (r) => r.systemId === appliances(bodyId),
      );
      return running() && row
        ? (HEATER_STATE[row.heaterState!] ?? "Unknown")
        : "Off";
    },
  });
  const chlorinator = (d: { equipmentId: number; name: string }) => ({
    ...d,
    get state(): Row {
      return rowOf("chlorinators", d.equipmentId, d.name);
    },
    get enabled(): boolean {
      return this.state.enable !== 0;
    },
    get operatingState(): string {
      return running()
        ? (CHLORINATOR_OPERATING_STATE[this.state.operatingState!] ?? "Unknown")
        : "Off";
    },
    get timedPercent(): number {
      return this.state.timedPercent!;
    },
    get averageSalt(): number {
      return this.state.avgSaltLevel!;
    },
    get instantSalt(): number {
      return this.state.instantSaltLevel!;
    },
    get isSuperchlorinating(): boolean {
      return running() && this.state.scMode !== 0;
    },
  });
  const POWER: Record<number, string> = {
    0: "OFF",
    1: "POWERING_OFF",
    3: "CHANGING_SHOW",
    4: "FIFTEEN_SECONDS_WHITE",
    6: "ACTIVE",
    7: "COOLDOWN",
  };
  const lightConfig = (bodyId: number) => {
    const config = stub.config as {
      backyard: { bodiesOfWater: Record<string, unknown>[] };
    };
    const light = config.backyard.bodiesOfWater.find(
      (b) => b.systemId === bodyId,
    )?.colorLogicLights as { type?: string; v2Active?: boolean }[] | undefined;
    return {
      type: light?.[0]?.type ?? "",
      v2Active: light?.[0]?.v2Active === true,
    };
  };
  const light = (d: { equipmentId: number; name: string }, bodyId: number) => ({
    ...d,
    get state(): Row | undefined {
      return rows("colorLogicLights").find((r) => r.systemId === d.equipmentId);
    },
    get isOn(): boolean {
      return running() && isLightLit(this.state!.lightState!);
    },
    get powerState(): string {
      return running() ? (POWER[this.state!.lightState!] ?? "OFF") : "OFF";
    },
    get shows() {
      const { type, v2Active } = lightConfig(bodyId);
      return getAvailableShows(type, v2Active);
    },
    get omniDirect(): boolean {
      return lightConfig(bodyId).v2Active;
    },
    get speed(): string {
      return LIGHT_SPEED[this.state!.speed!] ?? "Unknown";
    },
    get brightness(): number {
      return (this.state!.brightness! + 1) * 20;
    },
    get show(): string {
      return (
        this.shows.find((x) => x.value === this.state!.currentShow)?.name ??
        "Unknown"
      );
    },
  });
  const relay = (d: { equipmentId: number; name: string }) => ({
    ...d,
    get state(): Row {
      return rowOf("relays", d.equipmentId, d.name);
    },
    get isOn(): boolean {
      return running() && this.state.relayState !== 0;
    },
    get onCountdown(): boolean {
      return running() && this.state.whyOn === 6;
    },
  });
  const bodies = stub.backyard.bodies.map((b) => {
    const f = b.filter && filter(b.filter);
    return {
      ...b,
      filter: f,
      heater: b.heater && heater(b.heater, b.systemId),
      chlorinator: b.chlorinator && chlorinator(b.chlorinator),
      lights: (b.lights ?? []).map((l) => light(l, b.systemId)),
      relays: (b.relays ?? []).map(relay),
      get waterTemp(): number | undefined {
        const temp = rows("bodiesOfWater").find(
          (r) => r.systemId === b.systemId,
        )?.waterTemp;
        const flow = f !== undefined && f.isOn && f.speed > 0;
        return temp === -1 && !flow ? undefined : temp;
      },
      get spilloverOn(): boolean {
        return f !== undefined && running() && f.state.valvePosition === 3;
      },
      get spilloverOnCountdown(): boolean {
        return f !== undefined && running() && f.state.whyFilterIsOn === 17;
      },
    };
  });
  return {
    // a stub that says nothing about its inventory has empty bodies
    inventory: { bodies: [] },
    ...stub,
    backyard: {
      ...stub.backyard,
      bodies,
      get running(): boolean {
        return running();
      },
      get systemState(): string {
        return SYSTEM_STATE[t.backyard.state!] ?? "Unknown";
      },
      get airTemp(): number | undefined {
        const temp = t.backyard.airTemp;
        return temp === -1 ? undefined : temp;
      },
      themes: {
        ...stub.backyard.themes,
        get activeIds(): number[] {
          return rows("themes")
            .filter((g) => g.groupState !== 0)
            .map((g) => g.systemId);
        },
      },
    },
  } as unknown as OmniLogic;
};

// the pool's filter settings, none equal to the telemetry speed of 75
const filterSettingsConfig = {
  minPumpSpeed: 58,
  maxPumpSpeed: 100,
  vspLowPumpSpeed: 58,
  vspMediumPumpSpeed: 80,
  vspHighPumpSpeed: 100,
  primingDuration: 120,
  freezeProtectEnable: true,
  freezeProtectTemp: 38,
  freezeProtectSpeed: 70,
  freezeProtectOverrideInterval: 7200,
  sharedFilterTimeout: 1800,
  valveChangeOffEnable: false,
  noWaterFlowTimeoutEnable: true,
  cooldownDuration: 300,
};

const stubOmni = (): OmniLogic => {
  const config = {
    system: { units: "Standard" },
    backyard: {
      name: "Backyard",
      bodiesOfWater: [
        {
          systemId: 1,
          supportsSpillover: true,
          filter: filterSettingsConfig,
          colorLogicLights: [{ systemId: 5, type: "COLOR_LOGIC_UCL" }],
        },
      ],
    },
  };
  const telemetry = {
    ...emptyTelemetry,
    backyard: { airTemp: 78, state: 1 },
    bodiesOfWater: [{ systemId: 1, flow: 100, waterTemp: 82 }],
    filters: [{ systemId: 3, filterSpeed: 75, filterState: 1, lastSpeed: 60 }],
    colorLogicLights: [{ systemId: 5, lightState: 6, currentShow: 2 }],
  };
  const bodies = [
    {
      systemId: 1,
      name: "Pool",
      type: "BOW_POOL",
      filter: { equipmentId: 3, name: "Filter Pump" },
      lights: [{ equipmentId: 5, name: "Pool Light" }],
      relays: [],
      heater: undefined,
      chlorinator: undefined,
    },
  ];
  const schedules = [
    {
      bowSystemId: 1,
      data: 75,
      daysActive: 21,
      enabled: 1,
      endHour: 9,
      endMinute: 30,
      equipmentId: 3,
      event: 164,
      recurring: 1,
      scheduleSystemId: 7,
      startHour: 8,
      startMinute: 0,
    },
    // a spillover schedule as the panel stores it: the filter's id, event 311, data = speed
    {
      bowSystemId: 1,
      data: 58,
      daysActive: 64,
      enabled: 1,
      endHour: 13,
      endMinute: 0,
      equipmentId: 3,
      event: 311,
      recurring: 1,
      scheduleSystemId: 28,
      startHour: 12,
      startMinute: 0,
    },
  ];
  const favorites = [
    {
      systemId: 40,
      indexId: 1,
      equipmentIdOrThemeId: 5,
      sequence: 0,
      data: 0,
      simpleModeEnabled: 0,
    },
  ];
  return withDevices({
    config,
    telemetry,
    // the pool shares its pump with a spa
    inventory: { bodies: [{ systemId: 1, spillover: true }] },
    backyard: {
      bodies,
      schedules: { list: () => schedules },
      favorites: { list: () => favorites },
    },
  });
};

describe("serializeWorld", () => {
  it("maps documents + equipment tree into WorldData", () => {
    const world = serializeWorld(stubOmni());
    expect(world.backyard.airTemp).toBe(78);
    const pool = world.bows[0];
    expect(pool).toBeDefined();
    expect(pool).toMatchObject({
      id: 1,
      name: "Pool",
      waterTemp: 82,
    });
    // a pool with spillover support, off while the valve is not at position 3
    expect(pool!.spillover).toMatchObject({
      on: false,
      speed: 75,
      lastSpeed: 60,
    });
    expect(pool!.filters[0]).toMatchObject({
      id: 3,
      on: true,
      speed: 75,
      lastSpeed: 60,
      status: "On",
      busyForMs: null,
      speedRange: { min: 58, max: 100 },
    });
    expect(pool!.filters[0]!.settings).toEqual({
      pumpMinSpeed: 58,
      pumpMaxSpeed: 100,
      primingDuration: 120,
      freezeProtect: true,
      freezeProtectTemp: 38,
      freezeProtectSpeed: 70,
      freezeProtectOverrideInterval: 7200,
      sharedFilterTimeout: 1800,
      filterOffDuringValveChange: false,
      flowMonitor: true,
      cooldownDuration: 300,
    });
    const showName =
      getAvailableShows("").find((s) => s.value === 2)?.name ?? null;
    expect(pool!.lights[0]).toMatchObject({ id: 5, on: true, show: showName });
    expect(world.schedules[0]).toMatchObject({
      id: 7,
      equipmentId: 3,
      bodyId: 1,
      bodyName: "Pool",
      equipmentName: "Filter Pump",
      // 75 matches none of the presets and falls back to the bare percent
      kind: "filter",
      value: "75%",
      startHour: 8,
      startMinute: 0,
      endHour: 9,
      endMinute: 30,
      daysActive: 21,
      enabled: true,
      recurring: true,
    });
    // the same filter id with the spillover type, named for spillover
    expect(world.schedules[1]).toMatchObject({
      id: 28,
      equipmentId: 3,
      type: "spillover",
      kind: "spillover",
      equipmentName: "Spillover",
      value: "Low",
      daysActive: 64,
    });
    // the favorite surfaces with its slot id and target
    expect(world.favorites).toEqual([{ indexId: 1, equipmentId: 5, data: 0 }]);
  });
});

describe("outside normal operation", () => {
  it("reads equipment off, hides heater settings, and names the mode", () => {
    const omni = heaterOmni({ enable: 1, heaterState: 1 });
    (omni.telemetry.backyard as { state: number }).state = 3;
    const world = serializeWorld(omni);
    expect(world.backyard.systemState).toBe("Config Mode");
    const pool = world.bows[0]!;
    expect(pool.filters[0]).toMatchObject({
      on: false,
      speed: 0,
      status: "Off",
    });
    expect(pool.heaters).toEqual([]);
    expect(pool.waterTemp).toBe(88);

    (omni.telemetry.backyard as { state: number }).state = 1;
    const normal = serializeWorld(omni);
    expect(normal.backyard.systemState).toBeNull();
    expect(normal.bows[0]!.heaters[0]).toMatchObject({ state: "heating" });
  });
});

describe("OmniDirect lights", () => {
  it("lists the extra shows and names them once the light is in OmniDirect mode", () => {
    const omni = stubOmni();
    const pool = (
      omni.config as unknown as {
        backyard: { bodiesOfWater: Record<string, unknown>[] };
      }
    ).backyard.bodiesOfWater[0]!;
    Object.assign(omni.telemetry.colorLogicLights[0]!, {
      currentShow: 25,
      speed: 5,
      brightness: 2,
    });
    pool.colorLogicLights = [{ type: "COLOR_LOGIC_UCL" }];
    const ucl = serializeWorld(omni).bows[0]!.lights[0]!;
    expect(ucl.shows).toHaveLength(17);
    expect(ucl.show).toBeNull();
    expect(ucl).toMatchObject({
      omniDirect: false,
      speed: null,
      brightness: null,
    });

    pool.colorLogicLights = [{ type: "COLOR_LOGIC_UCL", v2Active: true }];
    const direct = serializeWorld(omni).bows[0]!.lights[0]!;
    expect(direct.shows.map((s) => s.name)).toContain("WARM_WHITE");
    expect(direct.show).toBe("WARM_WHITE");
    // 2x at 60%
    expect(direct).toMatchObject({
      omniDirect: true,
      speed: "2x",
      brightness: 60,
    });
    expect(direct.speeds[0]).toBe("1/16x");
  });
});

describe("air temperature", () => {
  // the controller reports -1 when it has no air reading
  it("reports the -1 sentinel as no reading and a real one as itself", () => {
    const omni = stubOmni();
    expect(serializeWorld(omni).backyard.airTemp).toBe(78);
    omni.telemetry.backyard.airTemp = -1;
    expect(serializeWorld(omni).backyard.airTemp).toBeNull();
  });

  it("reports the -1 sentinel as no reading in the system info", () => {
    const omni = withDevices({
      config: {
        system: { units: "Standard", timeZone: -6 },
        backyard: { name: "Backyard", bodiesOfWater: [] },
      },
      telemetry: { ...emptyTelemetry, backyard: { airTemp: -1, state: 1 } },
      backyard: { bodies: [] },
    });

    expect(serializeSystem(omni).backyard.airTemp).toBeNull();
  });
});

describe("serializeSystem", () => {
  it("maps controller facts", () => {
    const omni = withDevices({
      configChecksum: 12345,
      config: {
        system: { units: "Standard", timeZone: -6 },
        backyard: { name: "Backyard", bodiesOfWater: [] },
      },
      telemetry: {
        ...emptyTelemetry,
        backyard: { airTemp: 78, state: 1 },
        pumps: [{ systemId: 20 }, { systemId: 21 }],
      },
      backyard: {
        bodies: [],
      },
    });

    const info = serializeSystem(omni);
    expect(info).toMatchObject({
      configChecksum: 12345,
      backyard: { name: "Backyard", airTemp: 78 },
    });
  });
});

const waterTempOmni = (
  filterState: number,
  waterTemp: number,
  filterSpeed = filterState === 0 ? 0 : 58,
) =>
  withDevices({
    config: {
      system: { units: "Standard" },
      backyard: { name: "Backyard", bodiesOfWater: [] },
    },
    telemetry: {
      ...emptyTelemetry,
      backyard: { airTemp: 78, state: 1 },
      bodiesOfWater: [{ systemId: 1, flow: 0, waterTemp }],
      filters: [{ systemId: 3, filterSpeed, filterState }],
    },
    backyard: {
      bodies: [
        {
          systemId: 1,
          name: "Spa",
          type: "BOW_SPA",
          filter: { equipmentId: 3, name: "Filter Pump" },
          relays: [],
        },
      ],
      schedules: { list: () => [] },
      favorites: { list: () => [] },
      themes: { list: () => [{ systemId: 35, name: "Movie Night" }] },
    },
  });

describe("waterTemp sentinel gating", () => {
  it("hides the -1 sentinel while the filter moves no water", () => {
    expect(serializeWorld(waterTempOmni(0, -1)).bows[0]!.waterTemp).toBeNull();
    // a speed-only stop leaves the filter reporting on
    expect(
      serializeWorld(waterTempOmni(1, -1, 0)).bows[0]!.waterTemp,
    ).toBeNull();
  });

  it("shows a real reading, and a genuine -1 while the water moves", () => {
    expect(serializeWorld(waterTempOmni(1, 82)).bows[0]!.waterTemp).toBe(82);
    expect(serializeWorld(waterTempOmni(1, -1)).bows[0]!.waterTemp).toBe(-1);
  });
});

const heaterOmni = (overrides: {
  enable?: number;
  heaterState?: number;
  withAppliance?: boolean;
  heaterType?: string;
  withRpm?: boolean;
  chlorinatorState?: number;
}): OmniLogic => {
  const withAppliance = overrides.withAppliance ?? true;
  const config = {
    system: { units: "Standard" },
    backyard: {
      name: "Backyard",
      bodiesOfWater: [
        {
          systemId: 1,
          name: "Pool",
          filter: {
            systemId: 3,
            // distinct from the vsp presets below
            minPumpSpeed: 20,
            maxPumpSpeed: 100,
            vspLowPumpSpeed: 58,
            vspHighPumpSpeed: 100,
            ...(overrides.withRpm
              ? { minPumpRpm: 2000, maxPumpRpm: 3450 }
              : {}),
          },
          heater: {
            systemId: 4,
            currentSetPoint: 94,
            minSettableWaterTemp: 55,
            maxSettableWaterTemp: 94,
            cooldownEnabled: false,
            extendEnabled: true,
            operations: withAppliance
              ? [
                  {
                    heaterEquipment: {
                      systemId: 5,
                      heaterType: overrides.heaterType ?? "HTR_GAS",
                      allowLowSpeedOperation: true,
                      minSpeedForOperation: 60,
                    },
                  },
                ]
              : [],
          },
        },
      ],
    },
  };
  const telemetry = {
    ...emptyTelemetry,
    backyard: { airTemp: 78, state: 1 },
    bodiesOfWater: [{ systemId: 1, flow: 100, waterTemp: 88 }],
    filters: [{ systemId: 3, filterSpeed: 58, filterState: 1 }],
    virtualHeaters: [
      {
        systemId: 4,
        currentSetPoint: 94,
        enable: overrides.enable ?? 0,
        mode: 0,
        silentMode: 0,
        solarSetPoint: 94,
        whyHeaterIsOn: 1,
      },
    ],
    heaters: withAppliance
      ? [
          {
            systemId: 5,
            heaterState: overrides.heaterState ?? 0,
            temp: 65535,
            enable: 1,
            priority: 0,
            maintainFor: 24,
          },
        ]
      : [],
    chlorinators:
      overrides.chlorinatorState === undefined
        ? []
        : [
            {
              systemId: 6,
              enable: 1,
              operatingState: overrides.chlorinatorState,
            },
          ],
  };
  const bodies = [
    {
      systemId: 1,
      name: "Pool",
      type: "BOW_POOL",
      filter: { equipmentId: 3, name: "Filter Pump" },
      heater: { equipmentId: 4, name: "" },
      light: undefined,
      relays: [],
      chlorinator:
        overrides.chlorinatorState === undefined
          ? undefined
          : { equipmentId: 6, name: "Chlorinator" },
    },
  ];
  return withDevices({
    config,
    telemetry,
    backyard: {
      bodies,
      schedules: { list: () => [] },
      favorites: { list: () => [] },
      themes: { list: () => [{ systemId: 35, name: "Movie Night" }] },
    },
  });
};

const heaterOf = (omni: OmniLogic) => serializeWorld(omni).bows[0]!.heaters[0]!;

describe("chlorinator", () => {
  it("is generating only in the Generating state, not while paused", () => {
    const generating = (chlorinatorState: number) =>
      serializeWorld(heaterOmni({ chlorinatorState })).bows[0]!.chlorinators[0]!
        .generating;
    expect(generating(1)).toBe(false);
    expect(generating(2)).toBe(true);
  });
});

describe("HeaterDetail", () => {
  it("projects range, type, flags, and the appliance's low-speed rules", () => {
    const h = heaterOf(heaterOmni({}));
    expect(h).toMatchObject({
      id: 4,
      type: "HTR_GAS",
      enabled: false,
      setPoint: 94,
      setPointRange: { min: 55, max: 94 },
      mode: 0,
      silentMode: false,
      cooldown: false,
      extend: true,
      lowSpeed: {
        allow: true,
        minSpeed: 60,
        speedRange: { min: 20, max: 100 },
        presets: { low: 58, high: 100 },
        rpmRange: null,
      },
    });
    expect(h).not.toHaveProperty("current");
  });

  it("carries the pump's RPM range in lowSpeed when the filter config has it", () => {
    const h = heaterOf(heaterOmni({ withRpm: true }));
    expect(h.lowSpeed?.rpmRange).toEqual({ min: 2000, max: 3450 });
  });

  it("maps state: off when disabled, else idle/heating/paused from the appliance", () => {
    expect(heaterOf(heaterOmni({ enable: 0, heaterState: 1 })).state).toBe(
      "off",
    );
    expect(heaterOf(heaterOmni({ enable: 1, heaterState: 0 })).state).toBe(
      "idle",
    );
    expect(heaterOf(heaterOmni({ enable: 1, heaterState: 1 })).state).toBe(
      "heating",
    );
    expect(heaterOf(heaterOmni({ enable: 1, heaterState: 2 })).state).toBe(
      "paused",
    );
  });

  it("has no lowSpeed and reads idle when the heater has no appliance record", () => {
    const h = heaterOf(heaterOmni({ withAppliance: false, enable: 1 }));
    expect(h.lowSpeed).toBeUndefined();
    expect(h.type).toBeUndefined();
    expect(h.state).toBe("idle");
  });
});

// one body with a filter, a heater, a chlorinator, a light, and a relay, each with its own id
const scheduleKindOmni = (
  schedules: {
    scheduleSystemId: number;
    equipmentId: number;
    data: number;
    event?: number;
  }[],
  filterOverrides: Record<string, unknown> = {},
): OmniLogic => {
  const config = {
    system: { units: "Standard" },
    backyard: {
      name: "Backyard",
      bodiesOfWater: [
        {
          systemId: 1,
          filter: {
            vspLowPumpSpeed: 58,
            vspMediumPumpSpeed: 75,
            vspHighPumpSpeed: 100,
            ...filterOverrides,
          },
          colorLogicLights: [{ type: "", systemId: 5 }],
        },
      ],
    },
  };
  const bodies = [
    {
      systemId: 1,
      name: "Pool",
      filter: { equipmentId: 3, name: "Filter Pump" },
      heater: { equipmentId: 4, name: "Heater" },
      chlorinator: { equipmentId: 6, name: "Chlorinator" },
      lights: [{ equipmentId: 5, name: "Pool Light" }],
      relays: [{ equipmentId: 9, name: "Blower" }],
    },
  ];
  return withDevices({
    config,
    telemetry: emptyTelemetry,
    backyard: {
      bodies,
      schedules: {
        list: () =>
          schedules.map((s) => ({
            daysActive: 127,
            enabled: 1,
            endHour: 9,
            endMinute: 0,
            recurring: 1,
            startHour: 8,
            startMinute: 0,
            event: 164,
            ...s,
          })),
      },
      favorites: { list: () => [] },
      themes: { list: () => [{ systemId: 35, name: "Movie Night" }] },
    },
  });
};

describe("serializeWorld schedules: kind + value", () => {
  it("resolves a theme schedule to the theme by id, under Themes", () => {
    const [s] = scheduleSummaries(
      scheduleKindOmni([
        { scheduleSystemId: 36, equipmentId: 35, event: 317, data: 1 },
      ]),
    );
    expect(s).toMatchObject({
      kind: "theme",
      equipmentName: "Movie Night",
      bodyName: "Themes",
      bodyId: -1,
      type: "theme",
      value: "Run",
    });
  });

  it("formats a filter schedule at a preset speed with no RPM range as the preset name", () => {
    const [s] = scheduleSummaries(
      scheduleKindOmni([{ scheduleSystemId: 1, equipmentId: 3, data: 58 }]),
    );
    expect(s).toMatchObject({ kind: "filter", value: "Low" });
  });

  it("formats a filter schedule at a preset speed with a known RPM range as the preset name", () => {
    const [s] = scheduleSummaries(
      scheduleKindOmni([{ scheduleSystemId: 1, equipmentId: 3, data: 58 }], {
        minPumpSpeed: 58,
        maxPumpSpeed: 100,
        minPumpRpm: 2000,
        maxPumpRpm: 3450,
      }),
    );
    expect(s).toMatchObject({ kind: "filter", value: "Low" });
  });

  it("formats a filter schedule at a non-preset speed in RPM when the pump's range is known", () => {
    const rpm = percentToRpm(80, { min: 2000, max: 3450 });
    const [s] = scheduleSummaries(
      scheduleKindOmni([{ scheduleSystemId: 1, equipmentId: 3, data: 80 }], {
        minPumpSpeed: 58,
        maxPumpSpeed: 100,
        minPumpRpm: 2000,
        maxPumpRpm: 3450,
      }),
    );
    expect(s).toMatchObject({ kind: "filter", value: `${rpm} RPM` });
  });

  it("formats a filter schedule with no preset match as a bare percent", () => {
    // the schedule's 75 matches no preset, and the fixture has no rpm range
    const [s] = scheduleSummaries(stubOmni());
    expect(s).toMatchObject({ kind: "filter", value: "75%" });
  });

  it("formats a heater schedule as the set point with the controller's unit", () => {
    const [s] = scheduleSummaries(
      scheduleKindOmni([{ scheduleSystemId: 2, equipmentId: 4, data: 90 }]),
    );
    expect(s).toMatchObject({
      kind: "heater",
      value: "90°F",
    });
  });

  it("formats a chlorinator schedule as a percent", () => {
    const [s] = scheduleSummaries(
      scheduleKindOmni([{ scheduleSystemId: 3, equipmentId: 6, data: 50 }]),
    );
    expect(s).toMatchObject({
      kind: "chlorinator",
      value: "50%",
    });
  });

  it("formats a light schedule as the show name", () => {
    const [s] = scheduleSummaries(
      scheduleKindOmni([{ scheduleSystemId: 4, equipmentId: 5, data: 2 }]),
    );
    const showName = getAvailableShows("").find((sh) => sh.value === 2)?.name;
    expect(showName).toBeDefined();
    expect(s).toMatchObject({
      kind: "light",
      value: sentenceCase(showName ?? ""),
    });
  });

  it("falls back to 'Show <n>' when the show value isn't in the table", () => {
    const [s] = scheduleSummaries(
      scheduleKindOmni([{ scheduleSystemId: 5, equipmentId: 5, data: 9999 }]),
    );
    expect(s).toMatchObject({ kind: "light", value: "Show 9999" });
  });

  it("formats a relay schedule as On", () => {
    const [s] = scheduleSummaries(
      scheduleKindOmni([{ scheduleSystemId: 6, equipmentId: 9, data: 1 }]),
    );
    expect(s).toMatchObject({ kind: "relay", value: "On" });
  });

  it("falls back to no kind and the raw value when the equipment can't be resolved", () => {
    const [s] = scheduleSummaries(
      scheduleKindOmni([{ scheduleSystemId: 7, equipmentId: 999, data: 42 }]),
    );
    expect(s!.kind).toBeUndefined();
    expect(s!.value).toBe("42");
  });
});

// a theme's command list as the config parser yields it
const param = (name: string, value: number) => ({
  name,
  value,
  dataType: "int",
});
const captured = (name: string, params: [string, number][]) => ({
  name,
  parameters: params.map(([n, v]) => param(n, v)),
});

describe("serializeThemes", () => {
  const themed = (commands: unknown[]) => {
    const base = stubOmni() as unknown as {
      config: unknown;
      telemetry: Record<string, unknown>;
      backyard: { bodies: Record<string, unknown>[] } & Record<string, unknown>;
    };
    const [pool] = base.backyard.bodies;
    return withDevices({
      config: base.config,
      telemetry: {
        ...base.telemetry,
        themes: [{ systemId: 28, groupState: 1 }],
      },
      backyard: {
        ...base.backyard,
        bodies: [
          {
            ...pool,
            heater: { equipmentId: 4, name: "" },
            relays: [{ equipmentId: 22, name: "Blower" }],
          },
        ],
        themes: {
          list: () => [{ systemId: 28, name: "White Light", commands }],
        },
      },
    });
  };

  it("decodes the theme's stored commands into equipment rows", () => {
    const [theme] = serializeThemes(
      themed([
        captured("TurnOnOffForGroup", [
          ["PoolID", 1],
          ["EquipmentID", 3],
          ["Data", 58],
          ["LightState", 0],
        ]),
        captured("TurnOnOffForGroup", [
          ["PoolID", 1],
          ["EquipmentID", 5],
          ["Data", 263174],
          ["LightState", 0],
        ]),
        captured("TurnOnOffForGroup", [
          ["PoolID", 1],
          ["EquipmentID", 22],
          ["Data", 0],
          ["LightState", 0],
        ]),
        captured("TurnOnOffForGroup", [
          ["PoolID", 1],
          ["EquipmentID", 99],
          ["Data", 1],
          ["LightState", 0],
        ]),
        captured("SetUITemporaryHeaterPriorityCmd", [
          ["PoolID", 1],
          ["HeaterID1", 5],
        ]),
      ]),
    );
    expect(theme?.active).toBe(true);
    expect(theme?.equipment).toEqual([
      { body: "Pool", kind: "filter", name: "Filter Pump", state: "Low" },
      { body: "Pool", kind: "light", name: "Pool Light", state: "Cloud White" },
      { body: "Pool", kind: "relay", name: "Blower", state: "Off" },
    ]);
  });

  it("a heater's row comes from its enable and its set point together", () => {
    const rows = (commands: unknown[]) =>
      serializeThemes(themed(commands))[0]?.equipment;
    expect(
      rows([
        captured("SetHeaterScheduleAltCmd", [
          ["PoolID", 1],
          ["HeaterID", 4],
          ["Data1", 94],
        ]),
        captured("SetUITemporaryHeaterEnable", [
          ["PoolID", 1],
          ["HeaterID", 4],
          ["Enabled", 1],
        ]),
      ]),
    ).toEqual([
      { body: "Pool", kind: "heater", name: "Heater", state: "On · 94°F" },
    ]);
    expect(
      rows([
        captured("SetHeaterScheduleAltCmd", [
          ["PoolID", 1],
          ["HeaterID", 4],
          ["Data1", 94],
        ]),
        captured("SetUITemporaryHeaterEnable", [
          ["PoolID", 1],
          ["HeaterID", 4],
          ["Enabled", 0],
        ]),
      ]),
    ).toEqual([{ body: "Pool", kind: "heater", name: "Heater", state: "Off" }]);
    expect(
      rows([
        captured("SetUITemporaryHeaterEnable", [
          ["PoolID", 1],
          ["HeaterID", 4],
          ["Enabled", 1],
        ]),
      ]),
    ).toEqual([{ body: "Pool", kind: "heater", name: "Heater", state: "On" }]);
  });
});

// an auxiliary pump beside the filter on the same body
const auxPumpOmni = (): OmniLogic =>
  withDevices({
    config: {
      system: { units: "Standard" },
      backyard: {
        name: "Backyard",
        bodiesOfWater: [
          {
            systemId: 1,
            name: "Pool",
            filter: filterSettingsConfig,
            // its own ranges, apart from the filter's
            pumps: [
              {
                systemId: 12,
                name: "Waterfall Pump",
                minPumpSpeed: 20,
                maxPumpSpeed: 100,
                minPumpRpm: 1000,
                maxPumpRpm: 3000,
              },
            ],
          },
        ],
      },
    },
    telemetry: {
      ...emptyTelemetry,
      backyard: { airTemp: 78, state: 1 },
      bodiesOfWater: [{ systemId: 1, flow: 100, waterTemp: 82 }],
      filters: [
        { systemId: 3, filterSpeed: 58, filterState: 1, lastSpeed: 58 },
      ],
      pumps: [{ systemId: 12, pumpState: 1, pumpSpeed: 80 }],
    },
    backyard: {
      bodies: [
        {
          systemId: 1,
          name: "Pool",
          type: "BOW_POOL",
          filter: { equipmentId: 3, name: "Filter Pump" },
          relays: [],
        },
      ],
      schedules: {
        list: () => [
          {
            bowSystemId: 1,
            data: 80,
            daysActive: 21,
            enabled: 1,
            endHour: 9,
            endMinute: 30,
            equipmentId: 12,
            event: 164,
            recurring: 1,
            scheduleSystemId: 9,
            startHour: 8,
            startMinute: 0,
          },
        ],
      },
      favorites: { list: () => [] },
    },
  });

describe("auxiliary pumps", () => {
  it("lists the body's own pumps with their configured names", () => {
    const pool = serializeWorld(auxPumpOmni()).bows[0];
    expect(pool!.pumps).toEqual([
      {
        id: 12,
        name: "Waterfall Pump",
        on: true,
        speed: 80,
        speedRange: { min: 20, max: 100 },
        rpmRange: { min: 1000, max: 3000 },
      },
    ]);
  });

  it("resolves a schedule that targets a pump", () => {
    expect(serializeWorld(auxPumpOmni()).schedules[0]).toMatchObject({
      id: 9,
      equipmentId: 12,
      bodyId: 1,
      bodyName: "Pool",
      equipmentName: "Waterfall Pump",
      kind: "pump",
      // 80% of the pump's own 3000 RPM maximum
      value: "2400 RPM",
    });
  });
});
