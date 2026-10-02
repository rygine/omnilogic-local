export type Backyard = {
  airTemp: number;
  // missing on older firmware
  configChksum?: number;
  // missing on older firmware
  mspVersion?: string;
  state: number;
  statusVersion: number;
  systemId: number;
};

export type BodyOfWater = {
  flow: number;
  systemId: number;
  waterTemp: number;
};

export type Filter = {
  filterSpeed: number;
  filterState: number;
  fpOverride: number;
  lastSpeed: number;
  power: number;
  reportedFilterSpeed: number;
  systemId: number;
  valvePosition: number;
  whyFilterIsOn: number;
};

export type VirtualHeater = {
  currentSetPoint: number;
  enable: number;
  mode: number;
  silentMode: number;
  solarSetPoint: number;
  systemId: number;
  whyHeaterIsOn: number;
};

export type Heater = {
  enable: number;
  heaterState: number;
  maintainFor: number;
  priority: number;
  systemId: number;
  temp: number;
};

export type Chlorinator = {
  avgSaltLevel: number;
  chlrAlert: number;
  chlrError: number;
  enable: number;
  instantSaltLevel: number;
  operatingMode: number;
  operatingState: number;
  scMode: number;
  status: number;
  systemId: number;
  timedPercent: number;
};

export type ColorLogicLight = {
  brightness: number;
  currentShow: number;
  lightState: number;
  specialEffect: number;
  speed: number;
  systemId: number;
};

export type Relay = {
  relayState: number;
  systemId: number;
  whyOn: number;
};

// Chemistry Sense and Dispense
export type CSAD = {
  mode: number;
  orp: number;
  ph: number | string;
  status: number;
  systemId: number;
};

export type Pump = {
  lastSpeed: number;
  pumpSpeed: number;
  pumpState: number;
  systemId: number;
  whyOn: number;
};

export type Theme = {
  groupState: number;
  systemId: number;
};

export type ValveActuator = {
  valveActuatorState: number;
  systemId: number;
  whyOn: number;
};

export type SmartValveActuator = {
  smartValveTarget: number;
  systemId: number;
  valveActuatorState: number;
  whyOn: number;
};

export type Telemetry = {
  version: number | string;
  backyard: Backyard;
  bodiesOfWater: BodyOfWater[];
  chlorinators: Chlorinator[];
  colorLogicLights: ColorLogicLight[];
  csads: CSAD[];
  filters: Filter[];
  themes: Theme[];
  heaters: Heater[];
  pumps: Pump[];
  relays: Relay[];
  smartValveActuators: SmartValveActuator[];
  valveActuators: ValveActuator[];
  virtualHeaters: VirtualHeater[];
};
