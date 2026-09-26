import type { InventoryPath } from "@/utils/inventory";
import type { DataType } from "@/utils/xml";

// a request parameter's type, which is never a bool
export type CommandWireType = Exclude<DataType, "bool">;

type CommandNumericParam = {
  name: string;
  type: Exclude<CommandWireType, "string">;
};

type CommandStringParam = {
  name: string;
  type: "string";
  // the longest value the firmware keeps intact
  maxLength: number;
  values?: string[];
};

export type CommandRequestParam = CommandNumericParam | CommandStringParam;

type CommandResponseParam = {
  name: string;
  dataType: DataType;
  unit?: string;
};

export type CommandResponseSpec = {
  name: string;
  opcode: number;
  parameters: CommandResponseParam[];
};

type CommandSpec<Name extends string = string> = {
  opcode: number;
  // wire order
  request: CommandRequestParam[];
  // the reply's opcode
  response?: CommandResponseSpec;
  // the command changes nothing, so the cache stays fresh after it
  read?: true;
  // the controller goes quiet for 12–22 s after acknowledging this and drops what arrives meanwhile
  settle?: true;
  // inventory paths that must not be absent for this command to apply
  requires?: InventoryPath[];
  // the equipment whose id this command takes
  target?: InventoryPath;
  caveat?: {
    // what the command does that a caller would not expect
    effect: string;
    // the command to use instead
    alternative?: Name;
  };
};

const defineSpec = <
  const S extends Record<string, CommandSpec<keyof S & string>>,
>(
  spec: S,
) => spec;

const SPEC = defineSpec({
  SetUIPoolSpaSpilloverCmd: {
    opcode: 6,
    request: [
      { name: "poolId", type: "int" },
      { name: "data", type: "int" },
    ],
    caveat: {
      effect:
        "moves the return valve. On some installs it is plumbed the other way around, so turning spillover on has the opposite effect and stops it",
    },
  },
  GetUIPoolSpaSpilloverCmd: {
    read: true,
    opcode: 7,
    request: [{ name: "poolId", type: "int" }],
    response: {
      name: "UIPoolSpaSpilloverRsp",
      opcode: 1007,
      parameters: [
        { name: "poolId", dataType: "int" },
        { name: "position", dataType: "int" },
      ],
    },
  },
  SetUIPoolFilterCmd: {
    opcode: 8,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "int" },
      { name: "isCountDownTimer", type: "byte" },
      { name: "startTimeHours", type: "byte" },
      { name: "startTimeMinutes", type: "byte" },
      { name: "endTimeHours", type: "byte" },
      { name: "endTimeMinutes", type: "byte" },
      { name: "daysActive", type: "byte" },
      { name: "recurring", type: "byte" },
    ],
  },
  SetUIFilterSpeedCmd: {
    opcode: 9,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "int" },
    ],
  },
  GetUIFilterSpeedCmd: {
    read: true,
    opcode: 10,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
    response: {
      name: "UIFilterSpeedRsp",
      opcode: 1010,
      parameters: [
        { name: "poolId", dataType: "int" },
        { name: "filterId", dataType: "int" },
        { name: "speed", dataType: "int", unit: "RPM" },
      ],
    },
  },
  SetUIHeaterCmd: {
    opcode: 11,
    requires: ["heater"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "int" },
    ],
  },
  GetUIHeaterCmd: {
    read: true,
    opcode: 12,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
    response: {
      name: "UIHeaterRsp",
      opcode: 1012,
      parameters: [
        { name: "poolId", dataType: "int" },
        { name: "heaterId", dataType: "int" },
        { name: "temp", dataType: "int", unit: "F" },
      ],
    },
  },
  SetUIHeaterPriorityCmd: {
    opcode: 13,
    requires: ["heater"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "int" },
    ],
  },
  GetUIHeaterPriorityCmd: {
    read: true,
    opcode: 14,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  SetUISuperCHLORCmd: {
    opcode: 15,
    requires: ["chlorinator"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "int" },
    ],
    caveat: {
      effect:
        "stops the filter pump when it turns superchlorination off, even a pump turned on by hand, so send the filter's speed again afterwards",
    },
  },
  GetUISuperCHLORCmd: {
    read: true,
    opcode: 16,
    requires: ["chlorinator"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
    response: {
      name: "UISuperCHLORRsp",
      opcode: 1016,
      parameters: [
        { name: "poolId", dataType: "int" },
        { name: "chlorId", dataType: "int" },
        { name: "isOn", dataType: "byte" },
      ],
    },
  },
  SetUISuperCHLORTimeoutCmd: {
    opcode: 17,
    requires: ["chlorinator"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "int" },
    ],
  },
  SetUIORPCHLORTimeoutCmd: {
    opcode: 18,
    requires: ["csad"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
    caveat: {
      effect:
        "is acknowledged and then ignored: the controller does nothing with it and sends no reply",
    },
  },
  SetUISuperCHLOROutputCmd: {
    opcode: 19,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "int" },
    ],
    caveat: {
      effect:
        "is acknowledged and then ignored: the controller does nothing with it and sends no reply",
    },
  },
  GetUISuperCHLOROutputCmd: {
    read: true,
    opcode: 20,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
    caveat: {
      effect:
        "is acknowledged and then ignored: the controller does nothing with it and sends no reply",
    },
  },
  SetUIRelayCmd: {
    opcode: 21,
    caveat: {
      effect:
        "does nothing with isOn 1 unless a start and end time are given, and then runs the relay as a schedule without enforcing the end time",
      alternative: "SetUIEquipmentCmd",
    },
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "isOn", type: "int" },
      { name: "isCountDownTimer", type: "byte" },
      { name: "startTimeHours", type: "byte" },
      { name: "startTimeMinutes", type: "byte" },
      { name: "endTimeHours", type: "byte" },
      { name: "endTimeMinutes", type: "byte" },
      { name: "daysActive", type: "byte" },
      { name: "recurring", type: "byte" },
    ],
  },
  GetUIRelayCmd: {
    read: true,
    opcode: 22,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
    response: {
      name: "UIRelayRsp",
      opcode: 1022,
      parameters: [
        { name: "poolId", dataType: "int" },
        { name: "relayId", dataType: "int" },
        { name: "isOn", dataType: "int" },
      ],
    },
  },
  SetUIValveCmd: {
    opcode: 23,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "int" },
      { name: "isCountDownTimer", type: "byte" },
      { name: "startTimeHours", type: "byte" },
      { name: "startTimeMinutes", type: "byte" },
      { name: "endTimeHours", type: "byte" },
      { name: "endTimeMinutes", type: "byte" },
      { name: "daysActive", type: "byte" },
      { name: "recurring", type: "byte" },
    ],
  },
  GetUIValveCmd: {
    read: true,
    opcode: 24,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
    response: {
      name: "UIValveRsp",
      opcode: 1024,
      parameters: [
        { name: "poolId", dataType: "int" },
        { name: "vaid", dataType: "int" },
        { name: "valveState", dataType: "int" },
      ],
    },
  },
  GetUIPoolTempCmd: {
    read: true,
    opcode: 25,
    request: [{ name: "poolId", type: "int" }],
    response: {
      name: "UIGetPoolTempRsp",
      opcode: 1025,
      parameters: [
        { name: "poolId", dataType: "int" },
        { name: "temp", dataType: "int", unit: "F" },
      ],
    },
  },
  GetUIAirTempCmd: {
    read: true,
    opcode: 26,
    request: [],
    response: {
      name: "UIGetAirTempRsp",
      opcode: 1026,
      parameters: [{ name: "temp", dataType: "int", unit: "F" }],
    },
  },
  GetUIFlowSensor: {
    read: true,
    opcode: 27,
    requires: ["filter"],
    request: [{ name: "poolId", type: "int" }],
    response: {
      name: "GetUIFlowSensorRsp",
      opcode: 1027,
      parameters: [
        { name: "poolId", dataType: "int" },
        { name: "reading", dataType: "int" },
      ],
    },
  },
  GetUISensor: {
    read: true,
    opcode: 28,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
    caveat: {
      effect:
        "is acknowledged and then ignored: the controller does nothing with it and sends no reply",
    },
  },
  GetUISolarTempCmd: {
    read: true,
    opcode: 29,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  UiSetManualLastSpeed: {
    opcode: 34,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "int" },
      { name: "isCountDownTimer", type: "byte" },
      { name: "startTimeHours", type: "byte" },
      { name: "startTimeMinutes", type: "byte" },
      { name: "endTimeHours", type: "byte" },
      { name: "endTimeMinutes", type: "byte" },
      { name: "daysActive", type: "byte" },
      { name: "recurring", type: "byte" },
    ],
  },
  GetAutoTime: {
    read: true,
    opcode: 35,
    request: [],
    response: {
      name: "GetAutoTimeRsp",
      opcode: 1035,
      parameters: [
        { name: "year", dataType: "int" },
        { name: "month", dataType: "int" },
        { name: "day", dataType: "int" },
        { name: "format", dataType: "bool" },
        { name: "hour", dataType: "int" },
        { name: "minute", dataType: "int" },
        { name: "amPm", dataType: "string" },
        { name: "autoUpdateTime", dataType: "bool" },
      ],
    },
  },
  SetUISolarSetPointCmd: {
    opcode: 40,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "int" },
    ],
  },
  GetSetUISolarSetPointCmd: {
    read: true,
    opcode: 41,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
    response: {
      name: "UISolarSetPointCmdRsp",
      opcode: 1041,
      parameters: [
        { name: "poolId", dataType: "int" },
        { name: "heaterId", dataType: "int" },
        { name: "temp", dataType: "int", unit: "F" },
      ],
    },
  },
  SetUIHeaterModeCmd: {
    opcode: 42,
    requires: ["heater"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "int" },
    ],
  },
  GetUIHeaterModeCmd: {
    read: true,
    opcode: 43,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
    response: {
      name: "UIGetHeaterModeCmdRsp",
      opcode: 1043,
      parameters: [
        { name: "poolId", dataType: "int" },
        { name: "heaterId", dataType: "int" },
        { name: "mode", dataType: "int" },
      ],
    },
  },
  SetHeaterAutoDifferential: {
    opcode: 44,
    requires: ["heater"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "int" },
    ],
  },
  GetHeaterAutoDifferential: {
    read: true,
    opcode: 45,
    requires: ["heater"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
    response: {
      name: "UIGetHeaterAutoDifferentialRsp",
      opcode: 1045,
      parameters: [
        { name: "poolId", dataType: "int" },
        { name: "heaterId", dataType: "int" },
        { name: "data", dataType: "int" },
      ],
    },
  },
  GetHeaterDiagnostic: {
    read: true,
    opcode: 46,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  GetHeaterPowerUsage: {
    read: true,
    opcode: 47,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  GetHeaterSensor: {
    read: true,
    opcode: 48,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  SetHeaterSilentMode: {
    opcode: 49,
    requires: ["heater"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "int" },
    ],
  },
  GetHeaterSilentMode: {
    read: true,
    opcode: 50,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
    response: {
      name: "GetHeaterSilentModeRsp",
      opcode: 1050,
      parameters: [
        { name: "poolId", dataType: "int" },
        { name: "heaterId", dataType: "int" },
        { name: "enabled", dataType: "bool" },
      ],
    },
  },
  SetUISmartValveCmd: {
    opcode: 60,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "byte" },
      { name: "field19", type: "byte" },
      { name: "field1a", type: "byte" },
      { name: "field1b", type: "byte" },
      { name: "isCountDownTimer", type: "byte" },
      { name: "startTimeHours", type: "byte" },
      { name: "startTimeMinutes", type: "byte" },
      { name: "endTimeHours", type: "byte" },
      { name: "endTimeMinutes", type: "byte" },
      { name: "daysActive", type: "byte" },
      { name: "recurring", type: "byte" },
    ],
  },
  GetUISmartValveCmd: {
    read: true,
    opcode: 61,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
    response: {
      name: "UIGetSmartValveRsp",
      opcode: 1061,
      parameters: [
        { name: "poolId", dataType: "int" },
        { name: "equipmentId", dataType: "int" },
        { name: "isOn", dataType: "byte" },
        { name: "target", dataType: "byte" },
        { name: "data3", dataType: "byte" },
        { name: "data4", dataType: "byte" },
      ],
    },
  },
  SetUISmartValveTargetCmd: {
    opcode: 62,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "int" },
    ],
  },
  SetUISmartValveForTheme: {
    opcode: 63,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "byte" },
      { name: "field19", type: "byte" },
      { name: "field1a", type: "byte" },
      { name: "field1b", type: "byte" },
    ],
  },
  GetFlowControlPortStatus: {
    read: true,
    opcode: 64,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  GetFlowControlPortConfig: {
    read: true,
    opcode: 65,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  GetFlowControlDiagnostic: {
    read: true,
    opcode: 66,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  GetFlowControlPortErrors: {
    read: true,
    opcode: 67,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  FlowControlHomePortsCmd: {
    opcode: 68,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  SetUIFlowControlForTheme: {
    opcode: 69,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "byte" },
      { name: "field19", type: "byte" },
      { name: "field1a", type: "byte" },
      { name: "field1b", type: "byte" },
      { name: "field1c", type: "byte" },
      { name: "field1d", type: "byte" },
      { name: "field1e", type: "byte" },
      { name: "field1f", type: "byte" },
      { name: "isCountDownTimer", type: "byte" },
      { name: "startTimeMinutes", type: "byte" },
      { name: "startTimeHours", type: "byte" },
      { name: "endTimeMinutes", type: "byte" },
      { name: "endTimeHours", type: "byte" },
      { name: "daysActive", type: "byte" },
      { name: "recurring", type: "byte" },
      { name: "field27", type: "byte" },
    ],
  },
  SetTime2: {
    opcode: 100,
    request: [
      { name: "is24Hour", type: "byte" },
      { name: "hour", type: "byte" },
      { name: "minute", type: "byte" },
      { name: "second", type: "byte" },
      // ignored on a 24-hour clock
      {
        name: "amPm",
        type: "string",
        maxLength: 9,
        values: ["AM", "PM"],
      },
    ],
  },
  SetDateTime: {
    opcode: 101,
    caveat: {
      effect:
        "is acknowledged but the clock does not move; SetTime2 and SetDate together set everything this takes",
      alternative: "SetTime2",
    },
    request: [
      // stored as two bytes, century and year within the century
      { name: "year", type: "int" },
      { name: "month", type: "byte" },
      { name: "day", type: "byte" },
      { name: "is24Hour", type: "byte" },
      { name: "hour", type: "byte" },
      { name: "minute", type: "byte" },
      // ignored on a 24-hour clock
      {
        name: "amPm",
        type: "string",
        maxLength: 9,
        values: ["AM", "PM"],
      },
    ],
  },
  GetDateTime: {
    read: true,
    opcode: 102,
    request: [],
    response: {
      name: "GetDateTimeRsp",
      opcode: 1102,
      parameters: [
        { name: "year", dataType: "int" },
        { name: "month", dataType: "int" },
        { name: "day", dataType: "int" },
        { name: "format", dataType: "bool" },
        { name: "hour", dataType: "int" },
        { name: "minute", dataType: "int" },
        { name: "amPm", dataType: "string" },
      ],
    },
  },
  SetDate: {
    opcode: 103,
    request: [
      // stored as two bytes, century and year within the century
      { name: "year", type: "int" },
      { name: "month", type: "byte" },
      { name: "day", type: "byte" },
    ],
    caveat: {
      effect:
        "ends every schedule window in progress and rebooks each daily schedule from the new date, so a day moved back to runs no schedule until each is edited or re-enabled",
    },
  },
  GetDate: {
    read: true,
    opcode: 104,
    request: [],
    response: {
      name: "GetDateRsp",
      opcode: 1104,
      parameters: [
        { name: "year", dataType: "int" },
        { name: "month", dataType: "int" },
        { name: "day", dataType: "int" },
      ],
    },
  },
  SetTime: {
    opcode: 105,
    request: [
      { name: "is24Hour", type: "byte" },
      { name: "hour", type: "byte" },
      { name: "minute", type: "byte" },
      // ignored on a 24-hour clock
      {
        name: "amPm",
        type: "string",
        maxLength: 9,
        values: ["AM", "PM"],
      },
    ],
  },
  GetTime: {
    read: true,
    opcode: 106,
    request: [],
    response: {
      name: "GetTimeRsp",
      opcode: 1106,
      parameters: [
        { name: "format", dataType: "bool" },
        { name: "hour", dataType: "int" },
        { name: "minute", dataType: "int" },
        { name: "amPm", dataType: "string" },
      ],
    },
  },
  SetBackLight: {
    opcode: 107,
    request: [{ name: "data", type: "int" }],
  },
  GetBackLight: {
    read: true,
    opcode: 108,
    request: [],
    response: {
      name: "GetBackLightRsp",
      opcode: 1108,
      parameters: [{ name: "state", dataType: "bool" }],
    },
  },
  SetBackLightBrightness: {
    opcode: 109,
    request: [{ name: "data", type: "int" }],
  },
  GetBackLightBrightness: {
    read: true,
    opcode: 110,
    request: [],
    response: {
      name: "GetBackLightBrightnessRsp",
      opcode: 1110,
      parameters: [{ name: "brightness", dataType: "int" }],
    },
  },
  SetBackLightTimeout: {
    opcode: 111,
    request: [{ name: "data", type: "int" }],
  },
  GetBackLightTimeout: {
    read: true,
    opcode: 112,
    request: [],
    response: {
      name: "GetBackLightTimeoutRsp",
      opcode: 1112,
      parameters: [{ name: "timeout", dataType: "int", unit: "second" }],
    },
  },
  SetBeeper: {
    opcode: 113,
    request: [{ name: "data", type: "int" }],
  },
  GetBeeper: {
    read: true,
    opcode: 114,
    request: [],
    response: {
      name: "GetBeeperRsp",
      opcode: 1114,
      parameters: [{ name: "enabled", dataType: "bool" }],
    },
  },
  SetTimeFormat: {
    opcode: 115,
    request: [{ name: "data", type: "int" }],
  },
  GetTimeFormat: {
    read: true,
    opcode: 116,
    request: [],
    response: {
      name: "GetTimeFormatRsp",
      opcode: 1116,
      parameters: [{ name: "format", dataType: "int" }],
    },
  },
  SetUnits: {
    opcode: 117,
    request: [{ name: "data", type: "int" }],
  },
  GetUnits: {
    read: true,
    opcode: 118,
    request: [],
    response: {
      name: "GetUnitsRsp",
      opcode: 1118,
      parameters: [{ name: "unitFormat", dataType: "bool" }],
    },
  },
  SetVSPSpeedFormat: {
    opcode: 119,
    request: [{ name: "data", type: "int" }],
  },
  GetVSPSpeedFormat: {
    read: true,
    opcode: 120,
    request: [],
    response: {
      name: "GetVSPSpeedFormatRsp",
      opcode: 1120,
      parameters: [{ name: "format", dataType: "bool" }],
    },
  },
  SetCHLOREnable: {
    opcode: 121,
    requires: ["chlorinator"],
    request: [
      { name: "poolId", type: "int" },
      { name: "data", type: "int" },
    ],
  },
  GetCHLOREnable: {
    read: true,
    opcode: 122,
    request: [{ name: "poolId", type: "int" }],
    response: {
      name: "GetCHLOREnableRsp",
      opcode: 1122,
      parameters: [
        { name: "poolId", dataType: "int" },
        { name: "enabled", dataType: "bool" },
      ],
    },
  },
  SetCHLORDisplay: {
    opcode: 123,
    request: [{ name: "data", type: "int" }],
  },
  GetCHLORDisplay: {
    read: true,
    opcode: 124,
    request: [],
    response: {
      name: "GetCHLORDisplayRsp",
      opcode: 1124,
      parameters: [{ name: "enabled", dataType: "bool" }],
    },
  },
  SetSpaSpilloverEnable: {
    opcode: 127,
    request: [
      { name: "poolId", type: "int" },
      { name: "data", type: "int" },
    ],
  },
  GetSpaSpilloverEnable: {
    read: true,
    opcode: 128,
    request: [{ name: "poolId", type: "int" }],
    response: {
      name: "GetSpaSpilloverEnableRsp",
      opcode: 1128,
      parameters: [
        { name: "poolId", dataType: "int" },
        { name: "enabled", dataType: "bool" },
      ],
    },
  },
  SetFilterOperation: {
    opcode: 129,
    request: [
      { name: "poolId", type: "int" },
      { name: "data", type: "int" },
    ],
  },
  GetFilterOperation: {
    read: true,
    opcode: 130,
    request: [{ name: "poolId", type: "int" }],
    response: {
      name: "GetFilterOperationRsp",
      opcode: 1130,
      parameters: [
        { name: "poolId", dataType: "int" },
        { name: "operation", dataType: "int" },
      ],
    },
  },
  SetFilterOffValveChg: {
    opcode: 131,
    requires: ["filter"],
    request: [
      { name: "poolId", type: "int" },
      { name: "data", type: "int" },
    ],
  },
  GetFilterOffValveChg: {
    read: true,
    opcode: 132,
    requires: ["filter"],
    request: [{ name: "poolId", type: "int" }],
    response: {
      name: "GetFilterOffValveChgRsp",
      opcode: 1132,
      parameters: [
        { name: "poolId", dataType: "int" },
        { name: "enabled", dataType: "bool" },
      ],
    },
  },
  SetFilterLowSpeed: {
    opcode: 133,
    requires: ["filter", "filter.vsp"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "int" },
    ],
  },
  GetFilterLowSpeed: {
    read: true,
    opcode: 134,
    requires: ["filter", "filter.vsp"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
    response: {
      name: "GetFilterLowSpeedRsp",
      opcode: 1134,
      parameters: [
        { name: "poolId", dataType: "int" },
        { name: "filterId", dataType: "int" },
        // the minimum speed whatever the speed format
        { name: "speed", dataType: "int" },
      ],
    },
  },
  SetFilterHighSpeed: {
    opcode: 135,
    requires: ["filter", "filter.vsp"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "int" },
    ],
  },
  GetFilterHighSpeed: {
    read: true,
    opcode: 136,
    requires: ["filter", "filter.vsp"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
    response: {
      name: "GetFilterHighSpeedRsp",
      opcode: 1136,
      parameters: [
        { name: "poolId", dataType: "int" },
        { name: "filterId", dataType: "int" },
        // the maximum speed whatever the speed format
        { name: "speed", dataType: "int" },
      ],
    },
  },
  SetFreezeProtect: {
    opcode: 137,
    requires: ["filter"],
    request: [
      { name: "poolId", type: "int" },
      { name: "data", type: "int" },
    ],
  },
  GetFreezeProtect: {
    read: true,
    opcode: 138,
    requires: ["filter"],
    request: [{ name: "poolId", type: "int" }],
    response: {
      name: "GetFreezeProtectRsp",
      opcode: 1138,
      parameters: [
        { name: "poolId", dataType: "int" },
        { name: "enabled", dataType: "bool" },
      ],
    },
  },
  SetFreezeProtectSpeed: {
    opcode: 139,
    requires: ["filter"],
    request: [
      { name: "poolId", type: "int" },
      { name: "data", type: "int" },
    ],
  },
  GetFreezeProtectSpeed: {
    read: true,
    opcode: 140,
    requires: ["filter"],
    request: [{ name: "poolId", type: "int" }],
    response: {
      name: "GetFreezeProtectSpeedRsp",
      opcode: 1140,
      parameters: [
        { name: "poolId", dataType: "int" },
        { name: "speed", dataType: "int", unit: "RPM" },
      ],
    },
  },
  SetFreezeProtectTemp: {
    opcode: 141,
    requires: ["filter"],
    request: [
      { name: "poolId", type: "int" },
      { name: "data", type: "int" },
    ],
  },
  GetFreezeProtectTemp: {
    read: true,
    opcode: 142,
    requires: ["filter"],
    request: [{ name: "poolId", type: "int" }],
    response: {
      name: "GetFreezeProtectTempRsp",
      opcode: 1142,
      parameters: [
        { name: "poolId", dataType: "int" },
        { name: "temp", dataType: "int", unit: "F" },
      ],
    },
  },
  SetFlowMonitor: {
    opcode: 143,
    requires: ["filter"],
    request: [
      { name: "poolId", type: "int" },
      { name: "data", type: "int" },
    ],
  },
  GetFlowMonitor: {
    read: true,
    opcode: 144,
    requires: ["filter"],
    request: [{ name: "poolId", type: "int" }],
    response: {
      name: "GetFlowMonitorRsp",
      opcode: 1144,
      parameters: [
        { name: "poolId", dataType: "int" },
        { name: "enabled", dataType: "bool" },
      ],
    },
  },
  SetExternalInterLock: {
    opcode: 145,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "int" },
      { name: "field1c", type: "byte" },
      { name: "field1d", type: "byte" },
      { name: "field1e", type: "byte" },
      { name: "field1f", type: "byte" },
      { name: "field20", type: "int" },
      { name: "field24", type: "int" },
    ],
  },
  GetExternalInterLock: {
    read: true,
    opcode: 146,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      // zero-based index into the equipment's interlock list, one past the count silently ignored
      { name: "data", type: "int" },
    ],
  },
  SetHeaterEnable: {
    opcode: 147,
    requires: ["heater"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "int" },
    ],
  },
  GetHeaterEnable: {
    read: true,
    opcode: 148,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
    response: {
      name: "GetHeaterEnableRsp",
      opcode: 1148,
      parameters: [
        { name: "poolId", dataType: "int" },
        { name: "heaterId", dataType: "int" },
        { name: "enabled", dataType: "bool" },
      ],
    },
  },
  SetHeaterCoolDown: {
    opcode: 149,
    requires: ["heater"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "int" },
    ],
  },
  GetHeaterCoolDown: {
    read: true,
    opcode: 150,
    requires: ["heater"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
    response: {
      name: "GetHeaterCoolDownRsp",
      opcode: 1150,
      parameters: [
        { name: "poolId", dataType: "int" },
        { name: "heaterId", dataType: "int" },
        { name: "enabled", dataType: "bool" },
      ],
    },
  },
  SetHeaterExtend: {
    opcode: 151,
    requires: ["heater"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "int" },
    ],
  },
  GetHeaterExtend: {
    read: true,
    opcode: 152,
    requires: ["heater"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
    response: {
      name: "GetHeaterExtendRsp",
      opcode: 1152,
      parameters: [
        { name: "poolId", dataType: "int" },
        { name: "heaterId", dataType: "int" },
        { name: "enabled", dataType: "bool" },
      ],
    },
  },
  SetHeaterAllowedLowSpeed: {
    opcode: 153,
    requires: ["heater", "heater.unit"],
    target: "heater.unit",
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "int" },
    ],
  },
  GetHeaterAllowedLowSpeed: {
    read: true,
    opcode: 154,
    requires: ["heater", "heater.unit"],
    target: "heater.unit",
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
    response: {
      name: "GetHeaterAllowedLowSpeedRsp",
      opcode: 1154,
      parameters: [
        { name: "poolId", dataType: "int" },
        // the appliance id, not the thermostat's
        { name: "heaterId", dataType: "int" },
        // the allow-low-speed flag
        { name: "speed", dataType: "int", unit: "RPM" },
      ],
    },
  },
  SetCHLORParams: {
    opcode: 155,
    requires: ["chlorinator"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      // a byte code the config does not carry
      { name: "cfgState", type: "byte" },
      { name: "opMode", type: "byte" },
      // a byte code the config does not carry
      { name: "bowType", type: "byte" },
      // a byte code the config does not carry
      { name: "cellType", type: "byte" },
      { name: "timedPercent", type: "byte" },
      { name: "scTimeout", type: "byte" },
      { name: "orpTimeout", type: "byte" },
    ],
  },
  GetCHLORParams: {
    read: true,
    opcode: 156,
    requires: ["chlorinator"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
    response: {
      name: "GetCHLORParamsRsp",
      opcode: 1156,
      parameters: [
        { name: "poolId", dataType: "int" },
        { name: "chlorId", dataType: "int" },
        { name: "cfgState", dataType: "byte" },
        { name: "opMode", dataType: "byte" },
        { name: "bowType", dataType: "byte" },
        { name: "cellType", dataType: "byte" },
        { name: "timedPercent", dataType: "byte" },
        { name: "scTimeout", dataType: "byte", unit: "hour" },
        { name: "orpTimeout", dataType: "byte", unit: "hour" },
      ],
    },
  },
  GetCHLORStatus: {
    opcode: 157,
    read: true,
    requires: ["chlorinator", "chlorinator.cell"],
    target: "chlorinator.cell",
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
    response: {
      name: "GetCHLORStatusRsp",
      opcode: 1157,
      parameters: [
        { name: "poolId", dataType: "int" },
        { name: "chlorId", dataType: "int" },
        { name: "opState", dataType: "byte" },
        { name: "scState", dataType: "byte" },
        { name: "alertStatus", dataType: "byte" },
        { name: "instantSaltHigh", dataType: "byte" },
        { name: "instantSaltLow", dataType: "byte" },
        { name: "averageSaltHigh", dataType: "byte" },
        { name: "averageSaltLow", dataType: "byte" },
        { name: "activelyDispensing", dataType: "byte" },
      ],
    },
  },
  GetCHLORAlert: {
    opcode: 158,
    read: true,
    requires: ["chlorinator", "chlorinator.cell"],
    target: "chlorinator.cell",
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
    response: {
      name: "GetCHLORAlertRsp",
      opcode: 1158,
      parameters: [
        { name: "poolId", dataType: "int" },
        { name: "chlorId", dataType: "int" },
        { name: "alertHighByte", dataType: "byte" },
        { name: "alertLowByte", dataType: "byte" },
      ],
    },
  },
  GetCHLORError: {
    opcode: 159,
    read: true,
    requires: ["chlorinator", "chlorinator.cell"],
    target: "chlorinator.cell",
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
    response: {
      name: "GetCHLORErrorRsp",
      opcode: 1159,
      parameters: [
        { name: "poolId", dataType: "int" },
        { name: "chlorId", dataType: "int" },
        { name: "errorHighByte", dataType: "byte" },
        { name: "errorLowByte", dataType: "byte" },
      ],
    },
  },
  CHLORSaltCalcRestart: {
    opcode: 160,
    requires: ["chlorinator", "chlorinator.cell"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  CHLORRelayPolarityReverse: {
    opcode: 161,
    requires: ["chlorinator", "chlorinator.cell"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  CHLORCellRuntimeRestart: {
    opcode: 162,
    requires: ["chlorinator", "chlorinator.cell"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  GetCHLORMeasurement: {
    opcode: 163,
    read: true,
    requires: ["chlorinator", "chlorinator.cell"],
    target: "chlorinator.cell",
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
    // byte pairs are big-endian u16 (high * 256 + low): salt in ppm, the rest ADC counts
    response: {
      name: "GetCHLORMeasurementRsp",
      opcode: 1163,
      parameters: [
        { name: "poolId", dataType: "int" },
        { name: "chlorId", dataType: "int" },
        { name: "voltageHighByte", dataType: "byte" },
        { name: "voltageLowByte", dataType: "byte" },
        { name: "currentHighByte", dataType: "byte" },
        { name: "currentLowByte", dataType: "byte" },
        { name: "cellTempHighByte", dataType: "byte" },
        { name: "cellTempLowByte", dataType: "byte" },
        { name: "boardTempHighByte", dataType: "byte" },
        { name: "boardTempLowByte", dataType: "byte" },
        { name: "instantSaltLevelHighByte", dataType: "byte" },
        { name: "instantSaltLevelLowByte", dataType: "byte" },
        { name: "averageSaltLevelHighByte", dataType: "byte" },
        { name: "averageSaltLevelLowByte", dataType: "byte" },
      ],
    },
  },
  SetUIEquipmentCmd: {
    opcode: 164,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      // a filter speed for a filter, 0/1 for everything else
      { name: "isOn", type: "int" },
      { name: "isCountDownTimer", type: "byte" },
      { name: "startTimeHours", type: "byte" },
      { name: "startTimeMinutes", type: "byte" },
      { name: "endTimeHours", type: "byte" },
      { name: "endTimeMinutes", type: "byte" },
      { name: "daysActive", type: "byte" },
      { name: "recurring", type: "byte" },
    ],
  },
  GetScVersionCmd: {
    opcode: 167,
    read: true,
    request: [
      // a bus address, never 0
      { name: "data", type: "int" },
    ],
    response: {
      name: "GetScVersionRsp",
      opcode: 1167,
      parameters: [
        { name: "stageMajor", dataType: "byte" },
        { name: "minorRev", dataType: "byte" },
        { name: "incremRev", dataType: "byte" },
        { name: "specRev1", dataType: "byte" },
        { name: "specRev2", dataType: "byte" },
        { name: "specRev3", dataType: "byte" },
      ],
    },
  },
  SetScLedCmd: {
    opcode: 168,
    request: [
      { name: "data", type: "int" },
      { name: "field1c", type: "int" },
    ],
  },
  SetCHLORTimePercent: {
    opcode: 172,
    requires: ["chlorinator"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "int" },
    ],
  },
  GetCHLORRelayPolarity: {
    opcode: 174,
    read: true,
    requires: ["chlorinator", "chlorinator.cell"],
    target: "chlorinator.cell",
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
    response: {
      name: "GetCHLORRelayPolarityRsp",
      opcode: 1174,
      parameters: [
        { name: "poolId", dataType: "int" },
        { name: "chlorId", dataType: "int" },
        { name: "relaySetting", dataType: "byte" },
      ],
    },
  },
  GetUICLLightStatus: {
    read: true,
    opcode: 199,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
    response: {
      name: "GetUICLLightStatusRsp",
      opcode: 1199,
      parameters: [
        { name: "poolId", dataType: "int" },
        { name: "colorLogicId", dataType: "int" },
        { name: "lightState", dataType: "byte" },
        { name: "whyLightIsOn", dataType: "byte" },
        { name: "currentShow", dataType: "byte" },
        { name: "speed", dataType: "byte" },
        { name: "brightness", dataType: "byte" },
        { name: "specialEffect", dataType: "byte" },
      ],
    },
  },
  GetUICLIMStatus: {
    read: true,
    opcode: 200,
    requires: ["light", "light.networked"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  SetCLSerialIdentifyStart: {
    opcode: 201,
    requires: ["light", "light.networked"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  SetUICLSerialIdentifyStop: {
    opcode: 202,
    requires: ["light", "light.networked"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  GetUICLIMAuthenticate: {
    read: true,
    opcode: 203,
    requires: ["light", "light.networked"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  SetUICLIMUnlock: {
    opcode: 204,
    requires: ["light", "light.networked"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  GetNetworkedLightStatus: {
    read: true,
    opcode: 205,
    requires: ["light", "light.networked"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  SetUICLLightNumAssignSeqStandard: {
    opcode: 206,
    requires: ["light", "light.networked"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  SetUICLLightNumAssignSeqCustom: {
    opcode: 207,
    requires: ["light", "light.networked"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  SetUICLLightNumAssignSeqStationary: {
    opcode: 208,
    requires: ["light", "light.networked"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  SetUICLLightNumUnassignAux: {
    opcode: 209,
    requires: ["light", "light.networked"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  SetUICLLightNumIdentifyStart: {
    opcode: 210,
    requires: ["light", "light.networked"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  SetUICLLightNumIdentifyStop: {
    opcode: 211,
    requires: ["light", "light.networked"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  SetUICLAuxLightOnOff: {
    opcode: 212,
    requires: ["light", "light.networked"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  SetUICLAuxUpdateSettingStationary: {
    opcode: 213,
    requires: ["light", "light.networked"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  SetUICLAuxUpdateSettingStandard: {
    opcode: 214,
    requires: ["light", "light.networked"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  SetUICLAuxUpdateSettingCustom: {
    opcode: 215,
    requires: ["light", "light.networked"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  SetUICLAuxUpdateBrightness: {
    opcode: 216,
    requires: ["light", "light.networked"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  SetUICLAuxRelease: {
    opcode: 217,
    requires: ["light", "light.networked"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  SetUICLAllFindLightsStart: {
    opcode: 218,
    requires: ["light", "light.networked"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  SetUICLAllFindLightsStop: {
    opcode: 219,
    requires: ["light", "light.networked"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  GetUICLAllFindLightsReport: {
    read: true,
    opcode: 220,
    requires: ["light", "light.networked"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  SetUICLAllResetToDefaults: {
    opcode: 221,
    requires: ["light", "light.networked"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  SetUICLAllOnWhite: {
    opcode: 222,
    requires: ["light", "light.networked"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  SetLightMode: {
    opcode: 223,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "int" },
    ],
  },
  IDV2Light: {
    opcode: 224,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  SetV2Mode: {
    opcode: 225,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  SetLightModeByRelay: {
    opcode: 226,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "int" },
      { name: "field1c", type: "int" },
    ],
  },
  SetV2ModeByRelay: {
    opcode: 227,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  CreateUIScheduleAltCmd: {
    opcode: 229,
    request: [
      { name: "equipmentId", type: "int" },
      { name: "data", type: "byte" },
      { name: "field19", type: "byte" },
      { name: "field1a", type: "byte" },
      { name: "field1b", type: "byte" },
      { name: "event", type: "int" },
      { name: "startTimeHours", type: "byte" },
      { name: "startTimeMinutes", type: "byte" },
      { name: "endTimeHours", type: "byte" },
      { name: "endTimeMinutes", type: "byte" },
      { name: "daysActive", type: "byte" },
      { name: "enabled", type: "byte" },
      { name: "recurring", type: "byte" },
    ],
  },
  CreateUIScheduleCmd: {
    opcode: 230,
    request: [
      { name: "equipmentId", type: "int" },
      { name: "data", type: "int" },
      // the opcode the scheduler replays: 164 SetUIEquipmentCmd, 311 SetUISpilloverCmd, 317 RunGroupCmd
      { name: "event", type: "int" },
      { name: "startHour", type: "byte" },
      { name: "startMinute", type: "byte" },
      { name: "endHour", type: "byte" },
      { name: "endMinute", type: "byte" },
      { name: "daysActive", type: "byte" },
      { name: "enabled", type: "byte" },
      { name: "recurring", type: "byte" },
    ],
  },
  DeleteUIScheduleCmd: {
    opcode: 231,
    request: [{ name: "scheduleId", type: "int" }],
  },
  SetUIScheduleEnableCmd: {
    opcode: 232,
    request: [
      { name: "scheduleId", type: "int" },
      { name: "data", type: "int" },
    ],
  },
  // replaces the whole schedule
  EditUIScheduleCmd: {
    opcode: 233,
    request: [
      { name: "scheduleId", type: "int" },
      { name: "data", type: "int" },
      // the replayed opcode, as on CreateUIScheduleCmd
      { name: "event", type: "int" },
      { name: "startHour", type: "byte" },
      { name: "startMinute", type: "byte" },
      { name: "endHour", type: "byte" },
      { name: "endMinute", type: "byte" },
      { name: "daysActive", type: "byte" },
      { name: "enabled", type: "byte" },
      { name: "recurring", type: "byte" },
    ],
  },
  EditUIScheduleAltCmd: {
    opcode: 234,
    request: [
      { name: "scheduleId", type: "int" },
      { name: "data", type: "byte" },
      { name: "field19", type: "byte" },
      { name: "field1a", type: "byte" },
      { name: "field1b", type: "byte" },
      { name: "event", type: "int" },
      { name: "startTimeHours", type: "byte" },
      { name: "startTimeMinutes", type: "byte" },
      { name: "endTimeHours", type: "byte" },
      { name: "endTimeMinutes", type: "byte" },
      { name: "daysActive", type: "byte" },
      { name: "enabled", type: "byte" },
      { name: "recurring", type: "byte" },
    ],
  },
  UIGetCSADForcedOnTimeout: {
    read: true,
    opcode: 246,
    requires: ["csad"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  UISetCSADForcedOnTimeout: {
    opcode: 247,
    requires: ["csad"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "int" },
    ],
  },
  UIGetCSADAutoTimeout: {
    read: true,
    opcode: 248,
    requires: ["csad"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  UISetCSADAutoTimeout: {
    opcode: 249,
    requires: ["csad"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "int" },
    ],
  },
  UIGetCSADStatus: {
    read: true,
    opcode: 250,
    requires: ["csad"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
    response: {
      name: "UIGetCSADStatusRsp",
      opcode: 1250,
      parameters: [
        { name: "poolId", dataType: "int" },
        { name: "csadid", dataType: "int" },
        { name: "ph", dataType: "float" },
        { name: "orp", dataType: "int" },
      ],
    },
  },
  UIGetCSADRevision: {
    read: true,
    opcode: 251,
    requires: ["csad"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  UIGetCSADTargetValue: {
    read: true,
    opcode: 252,
    requires: ["csad"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  UISetCSADTargetValue: {
    opcode: 253,
    requires: ["csad"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "targetValue", type: "float" },
    ],
  },
  UIGetCSADPHAlarmLevel: {
    read: true,
    opcode: 256,
    requires: ["csad"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  UISetCSADPHAlarmLevel: {
    opcode: 257,
    requires: ["csad"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "float" },
      { name: "field1c", type: "float" },
    ],
  },
  UIGetCSADEnabled: {
    read: true,
    opcode: 258,
    requires: ["csad"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  UISetCSADEnabled: {
    opcode: 259,
    requires: ["csad"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "int" },
    ],
  },
  UIGetCSADExtendEnabled: {
    read: true,
    opcode: 262,
    requires: ["csad"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  UISetCSADExtendEnabled: {
    opcode: 263,
    requires: ["csad"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "int" },
    ],
  },
  UIGetCSADType: {
    read: true,
    opcode: 264,
    requires: ["csad"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  UISetCSADType: {
    opcode: 265,
    requires: ["csad"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "int" },
    ],
  },
  UIGetCSADMode: {
    read: true,
    opcode: 266,
    requires: ["csad"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  UISetCSADMode: {
    opcode: 267,
    requires: ["csad"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "int" },
    ],
  },
  SetUISystemStateCmd: {
    opcode: 268,
    request: [
      // 0 off, 1 on, 2 service, 3 config, 4 timed service
      { name: "data", type: "int" },
      // the timed minutes
      { name: "field1c", type: "int" },
      { name: "isCountDownTimer", type: "int" },
    ],
  },
  GetUISuperCHLORTimeRemaining: {
    read: true,
    opcode: 270,
    requires: ["chlorinator"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
    response: {
      name: "GetUISuperCHLORTimeRemainingRsp",
      opcode: 1270,
      parameters: [
        { name: "poolId", dataType: "int" },
        { name: "chlorId", dataType: "int" },
        { name: "superChlorTimeRemaining", dataType: "int" },
      ],
    },
  },
  UIGetCSADCalibrationValue: {
    read: true,
    opcode: 274,
    requires: ["csad"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  UISetCSADCalibrationValue: {
    opcode: 275,
    requires: ["csad"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "calibrationValue", type: "float" },
    ],
  },
  // the service or config state, answered with no opcode + 1000 reply
  GetUISystemStateCmd: {
    read: true,
    opcode: 278,
    request: [],
  },
  SetUICHLOROperatingMode: {
    opcode: 279,
    requires: ["chlorinator"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "int" },
    ],
  },
  GetUICHLOROperatingMode: {
    read: true,
    opcode: 280,
    requires: ["chlorinator"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
    response: {
      name: "GetUICHLOROperatingModeRsp",
      opcode: 1280,
      parameters: [
        { name: "poolId", dataType: "int" },
        { name: "chlorId", dataType: "int" },
        { name: "operatingMode", dataType: "int" },
      ],
    },
  },
  SetUICSADORPTargetLevel: {
    opcode: 281,
    requires: ["csad"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "int" },
    ],
  },
  GetUICSADORPTargetLevel: {
    read: true,
    opcode: 282,
    requires: ["csad"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  SetUICSADORPAlarmLevel: {
    opcode: 283,
    requires: ["csad"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "int" },
      { name: "field1c", type: "int" },
    ],
  },
  GetUICSADORPAlarmLevel: {
    read: true,
    opcode: 284,
    requires: ["csad"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  SetUIMultiHeaterPriorityCmd: {
    opcode: 289,
    requires: ["heater"],
    // the body's heat sources by appliance id, first priority first
    request: [
      { name: "poolId", type: "int" },
      { name: "rank1", type: "int" },
      { name: "rank2", type: "int" },
      { name: "rank3", type: "int" },
      { name: "rank4", type: "int" },
      { name: "rank5", type: "int" },
    ],
  },
  SetChlorinatorScheduleCmd: {
    opcode: 290,
    requires: ["chlorinator"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "int" },
      { name: "isCountDownTimer", type: "byte" },
      { name: "startTimeHours", type: "byte" },
      { name: "startTimeMinutes", type: "byte" },
      { name: "endTimeHours", type: "byte" },
      { name: "endTimeMinutes", type: "byte" },
      { name: "daysActive", type: "byte" },
      { name: "recurring", type: "byte" },
    ],
    caveat: {
      effect:
        "sets a chlorinator percent override the firmware never clears on its own: the effective percent sticks, surviving even a restart, and masks later percent writes until RestoreChlorinatorPercentCmd clears it",
      alternative: "SetCHLORTimePercent",
    },
  },
  RestoreChlorinatorPercentCmd: {
    opcode: 291,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
    caveat: {
      effect:
        "exists only to clear the percent override SetChlorinatorScheduleCmd leaves behind, and has no other use",
      alternative: "SetCHLORTimePercent",
    },
  },
  ClearUIAlarmCmd: {
    opcode: 303,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "int" },
    ],
  },
  GetUIFilterStatus: {
    read: true,
    opcode: 306,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
    response: {
      name: "GetUIFilterStatusRsp",
      opcode: 1306,
      parameters: [
        { name: "poolId", dataType: "int" },
        { name: "filterId", dataType: "int" },
        { name: "filterSpeed", dataType: "int" },
        { name: "filterState", dataType: "int" },
        { name: "whyFilterIsOn", dataType: "int" },
        { name: "valvePosition", dataType: "int" },
      ],
    },
  },
  GetUIHeaterStatus: {
    read: true,
    opcode: 307,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
    response: {
      name: "GetUIHeaterStatusRsp",
      opcode: 1307,
      parameters: [
        { name: "poolId", dataType: "int" },
        { name: "heaterId", dataType: "int" },
        { name: "isHeaterIsOn", dataType: "byte" },
        { name: "whyHeaterIsOn", dataType: "byte" },
        { name: "currentTemp", dataType: "byte" },
        { name: "setTemp", dataType: "byte" },
      ],
    },
  },
  SetStandAloneLightShow: {
    opcode: 308,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "byte" },
      { name: "field19", type: "byte" },
      { name: "field1a", type: "byte" },
      { name: "field1b", type: "byte" },
      { name: "isCountDownTimer", type: "byte" },
      { name: "startTimeHours", type: "byte" },
      { name: "startTimeMinutes", type: "byte" },
      { name: "endTimeHours", type: "byte" },
      { name: "endTimeMinutes", type: "byte" },
      { name: "daysActive", type: "byte" },
      { name: "recurring", type: "byte" },
    ],
  },
  ResetStandAloneLight: {
    opcode: 309,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  GetStandAloneLightShow: {
    read: true,
    opcode: 310,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
    response: {
      name: "GetStandAloneLightShowRsp",
      opcode: 1310,
      parameters: [
        { name: "poolId", dataType: "int" },
        { name: "lightId", dataType: "int" },
        { name: "show", dataType: "int" },
        { name: "speed", dataType: "int" },
        { name: "brightness", dataType: "int" },
        { name: "specialEffect", dataType: "int" },
      ],
    },
  },
  SetUISpilloverCmd: {
    opcode: 311,
    request: [
      { name: "poolId", type: "int" },
      { name: "data", type: "int" },
      { name: "isCountDownTimer", type: "byte" },
      { name: "startTimeHours", type: "byte" },
      { name: "startTimeMinutes", type: "byte" },
      { name: "endTimeHours", type: "byte" },
      { name: "endTimeMinutes", type: "byte" },
      { name: "daysActive", type: "byte" },
      { name: "recurring", type: "byte" },
    ],
    caveat: {
      effect:
        "moves the return valve. On some installs it is plumbed the other way around, so turning spillover on has the opposite effect and stops it",
    },
  },
  GetUIPumpStatus: {
    read: true,
    opcode: 312,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  SetHeaterScheduleAltCmd: {
    opcode: 314,
    requires: ["heater"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "byte" },
      { name: "field19", type: "byte" },
      { name: "field1a", type: "byte" },
      { name: "field1b", type: "byte" },
      { name: "isCountDownTimer", type: "byte" },
      { name: "startTimeHours", type: "byte" },
      { name: "startTimeMinutes", type: "byte" },
      { name: "endTimeHours", type: "byte" },
      { name: "endTimeMinutes", type: "byte" },
      { name: "daysActive", type: "byte" },
      { name: "recurring", type: "byte" },
    ],
  },
  SetHeaterScheduleCmd: {
    opcode: 315,
    requires: ["heater"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "int" },
      { name: "isCountDownTimer", type: "byte" },
      { name: "startTimeHours", type: "byte" },
      { name: "startTimeMinutes", type: "byte" },
      { name: "endTimeHours", type: "byte" },
      { name: "endTimeMinutes", type: "byte" },
      { name: "daysActive", type: "byte" },
      { name: "recurring", type: "byte" },
    ],
  },
  RestoreHeaterSetPointCmd: {
    opcode: 316,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  RunGroupCmd: {
    settle: true,
    opcode: 317,
    request: [
      { name: "equipmentId", type: "int" },
      { name: "data", type: "int" },
      { name: "isCountDownTimer", type: "byte" },
      { name: "startTimeHours", type: "byte" },
      { name: "startTimeMinutes", type: "byte" },
      { name: "endTimeHours", type: "byte" },
      { name: "endTimeMinutes", type: "byte" },
      { name: "daysActive", type: "byte" },
      { name: "recurring", type: "byte" },
    ],
  },
  SaveNewGroupCmd: {
    settle: true,
    opcode: 318,
    request: [
      { name: "name", type: "string", maxLength: 12 },
      { name: "daysActive", type: "byte" },
      { name: "recurring", type: "byte" },
      { name: "poolId", type: "int" },
    ],
  },
  SaveExistingGroupCmd: {
    opcode: 319,
    request: [{ name: "equipmentId", type: "int" }],
  },
  DeleteGroupCmd: {
    settle: true,
    opcode: 320,
    request: [{ name: "equipmentId", type: "int" }],
  },
  SetGroupCmd: {
    opcode: 321,
    request: [
      { name: "equipmentId", type: "int" },
      { name: "name", type: "string", maxLength: 12 },
      { name: "daysActive", type: "byte" },
      { name: "recurring", type: "byte" },
      { name: "poolId", type: "int" },
    ],
  },
  TurnOnOffForGroup: {
    opcode: 322,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "int" },
      // optional, 0 when absent
      { name: "field1c", type: "int" },
    ],
  },
  CreateUIFavoriteAltCmd: {
    opcode: 324,
    request: [
      { name: "equipmentId", type: "int" },
      { name: "data", type: "byte" },
      { name: "field19", type: "byte" },
      { name: "field1a", type: "byte" },
      { name: "field1b", type: "byte" },
    ],
  },
  CreateUIFavoriteCmd: {
    opcode: 325,
    request: [
      { name: "equipmentId", type: "int" },
      { name: "data", type: "int" },
    ],
  },
  DeleteUIFavoriteCmd: {
    opcode: 326,
    request: [{ name: "data", type: "int" }],
  },
  ModifyUIFavoriteCmd: {
    opcode: 327,
    request: [{ name: "data", type: "int" }],
    caveat: {
      effect: "is acknowledged but does nothing",
      alternative: "DeleteUIFavoriteCmd",
    },
  },
  UpdateButtonOnTerm: {
    opcode: 328,
    request: [
      { name: "equipmentId", type: "int" },
      { name: "data", type: "int" },
      { name: "field1c", type: "int" },
      { name: "field20", type: "int" },
    ],
  },
  GetRemainingCountdownTime: {
    read: true,
    opcode: 330,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
    response: {
      name: "GetRemainingCountdownTimeRsp",
      opcode: 1330,
      parameters: [
        { name: "poolId", dataType: "int" },
        { name: "equipmentId", dataType: "int" },
        { name: "hour", dataType: "byte" },
        { name: "minute", dataType: "byte" },
        { name: "second", dataType: "byte" },
      ],
    },
  },
  GetRemainingSCTime: {
    read: true,
    opcode: 331,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  UiEditConfigObjectName: {
    opcode: 332,
    request: [
      { name: "equipmentId", type: "int" },
      { name: "name", type: "string", maxLength: 13 },
    ],
  },
  UiGetConfigObjectName: {
    read: true,
    opcode: 333,
    request: [{ name: "equipmentId", type: "int" }],
    response: {
      name: "UiGetConfigObjectNameRsp",
      opcode: 1333,
      parameters: [
        { name: "systemId", dataType: "int" },
        { name: "name", dataType: "string" },
      ],
    },
  },
  SetSolarScheduleCmd: {
    opcode: 334,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "int" },
      { name: "isCountDownTimer", type: "byte" },
      { name: "startTimeHours", type: "byte" },
      { name: "startTimeMinutes", type: "byte" },
      { name: "endTimeHours", type: "byte" },
      { name: "endTimeMinutes", type: "byte" },
      { name: "daysActive", type: "byte" },
      { name: "recurring", type: "byte" },
    ],
  },
  RestoreSolarSetPointCmd: {
    opcode: 335,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  RestoreIdleState: {
    opcode: 340,
    request: [],
  },
  SetDemandResponseCmd: {
    opcode: 341,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "int" },
      { name: "isCountDownTimer", type: "byte" },
      { name: "startTimeHours", type: "byte" },
      { name: "startTimeMinutes", type: "byte" },
      { name: "endTimeHours", type: "byte" },
      { name: "endTimeMinutes", type: "byte" },
      { name: "daysActive", type: "byte" },
      { name: "recurring", type: "byte" },
    ],
  },
  SetPrimingDuration: {
    opcode: 350,
    requires: ["filter"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "int" },
    ],
  },
  GetPrimingDuration: {
    read: true,
    opcode: 351,
    requires: ["filter"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
    response: {
      name: "GetPrimingDurationRsp",
      opcode: 1351,
      parameters: [
        { name: "poolId", dataType: "int" },
        { name: "equipmentId", dataType: "int" },
        { name: "duration", dataType: "int" },
      ],
    },
  },
  SetCooldownDuration: {
    opcode: 352,
    requires: ["filter"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "int" },
    ],
  },
  GetCooldownDuration: {
    read: true,
    opcode: 353,
    requires: ["filter"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
    response: {
      name: "GetCooldownDurationRsp",
      opcode: 1353,
      parameters: [
        { name: "poolId", dataType: "int" },
        { name: "equipmentId", dataType: "int" },
        { name: "duration", dataType: "int" },
      ],
    },
  },
  SetSharedFilterTimeout: {
    opcode: 354,
    requires: ["filter"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "int" },
    ],
  },
  GetSharedFilterTimeout: {
    read: true,
    opcode: 355,
    requires: ["filter"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
    response: {
      name: "GetSharedFilterTimeoutRsp",
      opcode: 1355,
      parameters: [
        { name: "poolId", dataType: "int" },
        { name: "equipmentId", dataType: "int" },
        { name: "timeout", dataType: "int" },
      ],
    },
  },
  SetHeaterAllowLowSpeed: {
    opcode: 356,
    requires: ["heater", "heater.unit"],
    target: "heater.unit",
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "int" },
    ],
  },
  GetHeaterAllowLowSpeed: {
    read: true,
    opcode: 357,
    requires: ["heater", "heater.unit"],
    target: "heater.unit",
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
    response: {
      name: "GetHeaterAllowLowSpeedRsp",
      opcode: 1357,
      parameters: [
        { name: "poolId", dataType: "int" },
        // the appliance id, not the thermostat's
        { name: "heaterId", dataType: "int" },
        { name: "enabled", dataType: "bool" },
      ],
    },
  },
  SetHeaterLowSpeed: {
    opcode: 358,
    requires: ["heater", "heater.unit"],
    target: "heater.unit",
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "int" },
    ],
  },
  GetHeaterLowSpeed: {
    read: true,
    opcode: 359,
    requires: ["heater", "heater.unit"],
    target: "heater.unit",
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
    response: {
      name: "GetHeaterLowSpeedRsp",
      opcode: 1359,
      parameters: [
        { name: "poolId", dataType: "int" },
        // the appliance id, not the thermostat's
        { name: "heaterId", dataType: "int" },
        { name: "speed", dataType: "int", unit: "percent" },
      ],
    },
  },
  SetUITestModeEnter: {
    opcode: 361,
    request: [],
  },
  SetUIDisplayModeState: {
    opcode: 378,
    request: [{ name: "data", type: "int" }],
  },
  GetUIDisplayModeState: {
    read: true,
    opcode: 379,
    request: [],
    response: {
      name: "GetUIDisplayModeStateRsp",
      // not opcode + 1000
      opcode: 1368,
      parameters: [{ name: "state", dataType: "string" }],
    },
  },
  SetUIPumpSpeed: {
    opcode: 380,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "int" },
    ],
  },
  GetUIPumpSpeed: {
    read: true,
    opcode: 381,
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
  },
  SetUIFreezeProtectOverride: {
    opcode: 382,
    requires: ["filter"],
    request: [
      { name: "poolId", type: "int" },
      { name: "data", type: "int" },
    ],
  },
  GetUIFreezeProtectOverride: {
    read: true,
    opcode: 383,
    requires: ["filter"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
    response: {
      name: "UIFreezeProtectOverrideRsp",
      // not opcode + 1000
      opcode: 1370,
      parameters: [
        { name: "poolId", dataType: "int" },
        { name: "filterId", dataType: "int" },
        { name: "enabled", dataType: "bool" },
      ],
    },
  },
  SetUIFreezeProtectOverrideInterval: {
    opcode: 384,
    requires: ["filter"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "int" },
    ],
  },
  GetUIFreezeProtectOverrideInterval: {
    read: true,
    opcode: 385,
    requires: ["filter"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
    response: {
      name: "UIFreezeProtectOverrideIntervalRsp",
      // not opcode + 1000
      opcode: 1371,
      parameters: [
        { name: "poolId", dataType: "int" },
        { name: "filterId", dataType: "int" },
        { name: "interval", dataType: "int" },
      ],
    },
  },
  // power in BCD watts, revisions in ASCII
  GetUIFilterDiagnosticInfo: {
    read: true,
    opcode: 386,
    requires: ["filter"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
    ],
    response: {
      name: "GetUIFilterDiagnosticInfoRsp",
      opcode: 1386,
      parameters: [
        { name: "poolId", dataType: "int" },
        { name: "equipmentId", dataType: "int" },
        { name: "powerLsb", dataType: "byte" },
        { name: "powerMsb", dataType: "byte" },
        { name: "errorStatus", dataType: "byte" },
        { name: "displayFwRevisionB1", dataType: "byte" },
        { name: "displayFwRevisionB2", dataType: "byte" },
        { name: "displayFwRevisionB3", dataType: "byte" },
        { name: "displayFwRevisionB4", dataType: "byte" },
        { name: "displayFwRevisionB5", dataType: "byte" },
        { name: "displayFwRevisionB6", dataType: "byte" },
        { name: "driveFwRevisionB1", dataType: "byte" },
        { name: "driveFwRevisionB2", dataType: "byte" },
        { name: "driveFwRevisionB3", dataType: "byte" },
        { name: "driveFwRevisionB4", dataType: "byte" },
        { name: "driveFwRevisionB5", dataType: "byte" },
        { name: "driveFwRevisionB6", dataType: "byte" },
      ],
    },
  },
  SetUITemporaryHeaterEnable: {
    opcode: 400,
    requires: ["heater"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "int" },
    ],
  },
  SetUITemporaryHeaterPriorityCmd: {
    opcode: 401,
    requires: ["heater"],
    // the body's heat sources by appliance id, first priority first
    request: [
      { name: "poolId", type: "int" },
      { name: "rank1", type: "int" },
      { name: "rank2", type: "int" },
      { name: "rank3", type: "int" },
      { name: "rank4", type: "int" },
      { name: "rank5", type: "int" },
    ],
  },
  SetUITemporaryHeaterMaintainPriorityCmd: {
    opcode: 402,
    requires: ["heater"],
    request: [
      { name: "poolId", type: "int" },
      { name: "equipmentId", type: "int" },
      { name: "data", type: "byte" },
      { name: "field19", type: "byte" },
      { name: "field1a", type: "byte" },
      { name: "field1b", type: "byte" },
      { name: "field1c", type: "byte" },
    ],
  },
  SetCoordinates: {
    opcode: 416,
    request: [
      { name: "latitude", type: "float" },
      { name: "longitude", type: "float" },
    ],
  },
  GetCoordinates: {
    read: true,
    opcode: 417,
    request: [],
    response: {
      name: "GetCoordinatesRsp",
      opcode: 1417,
      parameters: [
        { name: "latitude", dataType: "float" },
        { name: "longitude", dataType: "float" },
      ],
    },
  },
  Unknown1414: {
    opcode: 1414,
    request: [],
    caveat: {
      effect:
        "is acknowledged and then ignored: the controller does nothing with it and sends no reply",
    },
  },
});

export type CommandName = keyof typeof SPEC;

export type CommandOpcode = (typeof SPEC)[CommandName]["opcode"];

// the three fetches, sent with no parameters and answered without an opcode + 1000 reply
export const SWITCH_OPCODE = {
  RequestConfiguration: 1,
  GetTelemetry: 300,
  GetSysInfo: 411,
} as const;

export const COMMANDS: Record<
  CommandName,
  Omit<CommandSpec<CommandName>, "opcode"> & { opcode: CommandOpcode }
> = SPEC;

type ParamValue<P> = P extends { values: (infer V)[] }
  ? V
  : P extends { type: "string" }
    ? string
    : number;

export type CommandParams<K extends CommandName> =
  (typeof SPEC)[K]["request"] extends (infer P extends CommandRequestParam)[]
    ? { [Q in P as Q["name"]]: ParamValue<Q> }
    : Record<string, never>;

type ResultValue<D> = D extends "bool"
  ? boolean
  : D extends "string"
    ? string
    : number;

export type CommandResult<K extends CommandName> = (typeof SPEC)[K] extends {
  response: {
    parameters: (infer P extends CommandResponseParam)[];
  };
}
  ? { [Q in P as Q["name"]]: ResultValue<Q["dataType"]> }
  : void;
