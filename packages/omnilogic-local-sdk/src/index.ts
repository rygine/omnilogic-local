export { DEFAULT_PORT, MIN_MSP_VERSION, OmniLogic } from "./client/omnilogic";
export type {
  CommandOptions,
  OmniLogicOptions,
  ReadOptions,
  WriteOptions,
} from "./client/omnilogic";
export { DEFAULT_TIMINGS, OmniLogicProtocol } from "./transport/protocol";
export type { OperationOptions, Timings } from "./transport/protocol";
export type { OmniLogicMessage, SendableOpcode } from "./transport/message";

export type {
  CommandName,
  CommandOpcode,
  CommandParams,
  CommandRequestParam,
  CommandResponseSpec,
  CommandResult,
  CommandWireType,
} from "./client/spec";
export { COMMANDS, SWITCH_OPCODE } from "./client/spec";
export {
  buildCommandXml,
  countdownParams,
  timerParams,
  type TimerOptions,
} from "./utils/command";

export type { MSPConfig, ThemeCommand, UnitSystem } from "./types/config";
export type { Telemetry } from "./types/telemetry";
export type { SysInfo, SysInfoComponent } from "./types/sysinfo";
export type * as config from "./types/config";
export type * as telemetry from "./types/telemetry";
export { parseConfig, parseSysInfo, parseTelemetry } from "./utils/xml";
export { findBySystemId } from "./utils/helpers";
export type { Inventory, InventoryPath } from "./utils/inventory";

export type { Backyard } from "./equipment/backyard";
export type { BodyOfWater } from "./equipment/bodyOfWater";
export type { Device } from "./equipment/device";
export type {
  CellMeasurement,
  CellStatus,
  Chlorinator,
} from "./equipment/chlorinator";
export type { CSAD } from "./equipment/csad";
export { THEME_FAVORITE_DATA } from "./equipment/favorites";
export type { Favorites, FavoriteCreate } from "./equipment/favorites";
export type { Filter, FilterDiagnostics } from "./equipment/filter";
export type { Heater } from "./equipment/heater";
export type { HeaterAppliance } from "./equipment/heaterAppliance";
export type { Light, LightWriteOptions } from "./equipment/light";
export type { Pump } from "./equipment/pump";
export type { ChlorinatorDisplay, Panel, SpeedFormat } from "./equipment/panel";
export type { Relay } from "./equipment/relay";
export type { Schedules } from "./equipment/schedules";
export type { Themes } from "./equipment/themes";
export {
  SCHEDULE_EVERY_DAY,
  SCHEDULE_FRIDAY,
  SCHEDULE_MONDAY,
  SCHEDULE_SATURDAY,
  SCHEDULE_TYPE,
  SCHEDULE_SUNDAY,
  SCHEDULE_SUNRISE_HOUR,
  SCHEDULE_SUNRISE_SUNSET_MINUTE,
  SCHEDULE_SUNSET_HOUR,
  SCHEDULE_THURSDAY,
  SCHEDULE_TUESDAY,
  SCHEDULE_WEDNESDAY,
  scheduleTypeOf,
} from "./equipment/schedules";
export type {
  ScheduleCreate,
  ScheduleType,
  ScheduleUpdate,
} from "./equipment/schedules";

export {
  CommandFailedError,
  EquipmentNotInstalledError,
  FirmwareTooOldError,
  OmniLogicError,
  OmniTimeoutError,
  OmniValidationError,
  ReadingUnavailableError,
  SystemStateError,
} from "./utils/errors";

export {
  bitmaskNames,
  CHLORINATOR_ALERTS,
  CHLORINATOR_ERRORS,
  CHLORINATOR_OP_MODE,
  CHLORINATOR_OPERATING_STATE,
  CHLORINATOR_STATUS,
  CSAD_MODE,
  FILTER_STATE,
  FILTER_VALVE_POSITION,
  FILTER_WHY_ON,
  HEATER_MODE,
  HEATER_PRIORITY,
  HEATER_STATE,
  isRunning,
  LIGHT_BRIGHTNESS,
  LIGHT_SPEED,
  PUMP_STATE,
  PUMP_WHY_ON,
  RELAY_STATE,
  RELAY_WHY_ON,
  type PackedField,
  packedNames,
  SPEED_PRESET,
  SYSTEM_STATE,
} from "./constants/labels";
export {
  ColorLogicPowerState,
  ColorLogicShow,
  getAvailableShows,
  isLightLit,
  type LightShowInfo,
  powerStateName,
} from "./constants/lightShows";
export {
  AIR_TEMP_UNAVAILABLE,
  HEATER_TEMP_UNAVAILABLE,
  ORP_UNAVAILABLE,
  PH_UNAVAILABLE,
  WATER_TEMP_UNAVAILABLE,
} from "./constants/sentinels";
