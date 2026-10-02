// an action a device can run
export type Action = {
  actionData1: number;
  actionData2: number;
  actionData3: number;
  actionFunction: string;
};

export type Operation = {
  actions: Action[];
  chlorinatorEquipment?: ChlorinatorEquipment;
  csadEquipment?: CSADEquipment;
  heaterEquipment?: HeaterEquipment;
};

// heat source under a body's thermostat
export type HeaterEquipment = {
  // whether the filter pump may run slow while heater runs
  allowLowSpeedOperation: boolean;
  enabled: boolean;
  // HTR_GAS, HTR_SOLAR, HTR_HEAT_PUMP…
  heaterType: string;
  minPrimingInterval: number;
  // minimum pump speed while heating
  minSpeedForOperation: number;
  name: string;
  operations: Operation[];
  // rank against other heat sources, lower runs first
  priority: string;
  requiresPriming: boolean;
  // whether it yields once a higher-ranked source can run again
  runForPriority: string;
  // temperature sensor ID, -1 when it has none
  sensorSystemId: number;
  // the other body's record for the same physical unit, -1 when not shared
  sharedEquipmentSystemId: number;
  supportsCooling?: boolean;
  systemId: number;
  // degrees below the set point before an idle one starts
  tempDifferenceInitial: number;
  // degrees below the set point a running one keeps heating for
  tempDifferenceRunning: number;
  type: string;
};

export type ChlorinatorEquipment = {
  chlorinatorType: string;
  enabled: boolean;
  name: string;
  operations: Operation[];
  systemId: number;
  type: string;
};

export type Filter = {
  // seconds the pump runs on after the heater stops
  cooldownDuration: number;
  // single, dual, or variable speed
  filterType: string;
  filterValvePosition: string;
  freezeProtectEnable: boolean;
  // seconds freeze protection may be held off
  freezeProtectOverrideInterval: number;
  freezeProtectSpeed: number;
  freezeProtectTemp: number;
  maxPumpRpm: number;
  maxPumpSpeed: number;
  // seconds the pump must be off before it primes again
  minPrimingInterval: number;
  minPumpRpm: number;
  minPumpSpeed: number;
  name: string;
  noWaterFlowTimeoutEnable: boolean;
  // seconds without flow the controller lets the pump run
  noWaterFlowTimeoutTimeout: number;
  operations: Operation[];
  // seconds the pump runs at high speed before settling on its speed
  primingDuration: number;
  primingEnabled: boolean;
  // seconds this body's freeze-protect turn lasts on a shared pump
  sharedFilterTimeout: number;
  // whether the body shares this pump with another
  sharedType: string;
  shutdownRequestTimeout: number;
  systemId: number;
  // seconds the pump stays off while valves turn
  valveChangeOffDuration: number;
  valveChangeOffEnable: boolean;
  // the last speed sent that was none of the three presets
  vspCustomPumpSpeed: number;
  // the speed the High preset runs
  vspHighPumpSpeed: number;
  // the speed the Low preset runs
  vspLowPumpSpeed: number;
  // the speed the Medium preset runs
  vspMediumPumpSpeed: number;
};

export type Pump = {
  freezeProtectEnable: boolean;
  freezeProtectSpeed: number;
  function: string;
  maxPumpRpm: number;
  maxPumpSpeed: number;
  minPumpRpm: number;
  minPumpSpeed: number;
  name: string;
  operations: Operation[];
  // seconds the pump runs at high speed before settling on its speed
  primingDuration: number;
  primingEnabled: boolean;
  systemId: number;
  // single, dual, or variable speed
  type: string;
  valveCycleEnable: boolean;
  valveCycleTime: number;
  // the last speed sent that was none of the three presets
  vspCustomPumpSpeed: number;
  // the speed the High preset runs
  vspHighPumpSpeed: number;
  // the speed the Low preset runs
  vspLowPumpSpeed: number;
  // the speed the Medium preset runs
  vspMediumPumpSpeed: number;
};

export type Heater = {
  boostTimeInterval: number;
  // runs the filter pump on after the heater stops
  cooldownEnabled: boolean;
  // the temperature the body heats to
  currentSetPoint: number;
  enabled: boolean;
  // delays the pump's turn-off until the set point
  extendEnabled: boolean;
  heaterBecomeValidTimeout: number;
  maxSettableWaterTemp: number;
  maxWaterTemp: number;
  minSettableWaterTemp: number;
  operations: Operation[];
  // whether a heat source is shared with another body
  sharedType: string;
  // the solar temperature target
  solarSetPoint?: number;
  systemId: number;
};

export type Chlorinator = {
  // a salt cell or liquid/tablet feeder model
  cellType: string;
  dispenserType: string;
  enabled: boolean;
  // whether a timed percent or an ORP probe decides the output
  mode: string;
  name: string;
  operations: Operation[];
  // the ORP probe that drives it, -1 when none
  orpSensorId: number;
  // seconds ORP control may run nonstop before it stops and alarms
  orpTimeout: number;
  // whether the body shares the cell with another
  sharedType: string;
  // hours a superchlorination runs
  superChlorTimeout: number;
  systemId: number;
  // percent of the time it generates, in timed mode
  timedPercent: number;
};

export type ColorLogicLight = {
  name: string;
  // a Pro Logic network-module light
  networked: boolean;
  nodeId: number;
  operations: Operation[];
  systemId: number;
  // the light's model
  type: string;
  // OmniDirect mode active
  v2Active?: boolean;
};

export type Sensor = {
  name: string;
  operations: Operation[];
  systemId: number;
  // what it measures, e.g. SENSOR_AIR_TEMP…
  type: string;
  // what it reports in, e.g. UNITS_FAHRENHEIT…
  units: string;
};

export type CSADEquipment = {
  csadType: string;
  enabled: boolean;
  name: string;
  operations: Operation[];
  systemId: number;
  type: string;
};

// Chemistry Sense and Dispense
export type CSAD = {
  // the offset between the tested and the displayed reading
  calibrationValue: string;
  enabled: boolean;
  // keeps the filter pump on past its schedule until pH reaches the set point
  extendEnabled: boolean;
  // seconds the reducer runs on a forced dispense
  forcedOnTime: number;
  // whether it doses, watches only, or is off
  mode: string;
  name: string;
  operations: Operation[];
  orpForcedEnabled: boolean;
  orpForcedOnTime: number;
  orpHighAlarmLevel: number;
  orpLowAlarmLevel: number;
  orpRuntimeLevel: number;
  // the ORP the chlorinator is asked to hold
  orpTargetLevel: number;
  phHighAlarmLevel: string;
  phLowAlarmLevel: string;
  systemId: number;
  // seconds dispensing may run before it stops and raises an alarm
  timeout: number;
  // what reduces the pH: ACID or CO2
  type: string;
  // the pH the module dispenses toward
  targetValue: string;
};

export type ThemeCommand = {
  name: string;
  parameters: {
    name: string;
    dataType: string;
    value: number | string;
  }[];
};

export type Theme = {
  iconId: number;
  name: string;
  systemId: number;
  countdownTimer?: number;
  commands: ThemeCommand[];
};

export type Favorite = {
  systemId: number;
  // the id a favorite is read and removed by
  indexId: number;
  equipmentIdOrThemeId: number;
  sequence: number;
  // names the favorite: a show number for a light, the marker for a theme
  data: number;
  // 1 when the favorite appears on the Simple Mode screen
  simpleModeEnabled: number;
};

export type Relay = {
  // whether the relay turns on during freeze protection
  freezeProtectEnable: boolean;
  // what is plugged into it, e.g. RLY_BLOWER…
  function: string;
  name: string;
  operations: Operation[];
  systemId: number;
  // e.g. RLY_HIGH_VOLTAGE_RELAY, RLY_VALVE_ACTUATOR…
  type: string;
  valveCycleEnable: boolean;
  valveCycleTime: number;
  valveDefaultSpeed?: number;
};

export type BodyOfWater = {
  chlorinator?: Chlorinator;
  colorLogicLights: ColorLogicLight[];
  csad?: CSAD;
  filter?: Filter;
  heater?: Heater;
  name: string;
  pumps: Pump[];
  relays: Relay[];
  sensors: Sensor[];
  sharedEquipmentSystemId: number;
  // this body's heating priority when equipment is shared
  sharedPriority: string;
  // whether the body shares equipment with another
  sharedType: string;
  sizeInGallons: number;
  // whether spillover is enabled, not whether the body could do it
  supportsSpillover: boolean;
  systemId: number;
  // BOW_POOL or BOW_SPA
  type: string;
  // the filter runs the body with the valves in the spillover position
  useSpilloverForFilterOperations: boolean;
};

// Standard displays °F, Metric °C
export type UnitSystem = "Standard" | "Metric";

type System = {
  // daylight savings time
  dst?: boolean;
  // "on" or "off", whether the clock is set from the internet
  internetTime?: string;
  // Salt or Minerals
  mspChlorDisplay: string;
  mspLanguage: string;
  mspTimeFormat: string;
  // RPM or percent
  mspVspSpeedFormat: string;
  // minutes from UTC
  timeZone?: number;
  uiDisplayMode: string;
  // "Yes" or "No"
  uiFilterSimpleMode: string;
  // "Yes" or "No"
  uiHeaterSimpleMode: string;
  // "Yes" or "No"
  uiLightsSimpleMode: string;
  uiMoodColorEnabled: string;
  units: UnitSystem;
};

export type Backyard = {
  bodiesOfWater: BodyOfWater[];
  colorLogicLights: ColorLogicLight[];
  name: string;
  relays: Relay[];
  sensors: Sensor[];
  // how long timed service mode lasts before it exits itself
  serviceModeTimeout: number;
  systemId: number;
};

export type Schedule = {
  // body of water associated with the schedule
  bowSystemId: number;
  // the value to set: a speed, a show, a percent, a set point, 1, or 0
  data: number;
  // bitfield of weekdays, Monday 1 through Sunday 64
  daysActive: number;
  // 1=true, 0=false
  enabled: number;
  endHour: number;
  endMinute: number;
  equipmentId: number;
  // what kind of schedule it is: equipment, spillover, or theme
  event: number;
  // 1=true, 0=false
  recurring: number;
  scheduleSystemId: number;
  // 25 is sunrise and 26 is sunset
  startHour: number;
  startMinute: number;
};

export type Device = {
  deviceName: string;
  devices: Device[];
  // address on the controller's bus
  nodeId: number;
  type: string;
};

export type MSPConfig = {
  backyard: Backyard;
  // changes whenever the config is updated
  checksum: number;
  devices: Device[];
  favorites: Favorite[];
  themes: Theme[];
  schedules: Schedule[];
  system: System;
};
