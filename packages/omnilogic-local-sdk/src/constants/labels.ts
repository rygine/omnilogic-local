export const FILTER_STATE: Record<number, string> = {
  0: "Off",
  1: "On",
  2: "Priming",
  3: "Waiting To Turn Off",
  4: "Waiting To Turn Off (Manual)",
  5: "Heater Extend",
  6: "Cooldown",
  7: "Suspend",
  8: "CSAD Extend",
  9: "Superchlorinate",
  10: "Force Priming",
  11: "Waiting For Pump To Turn Off",
  12: "Waiting To Change Valves",
};

// why a pump other than the filter pump is running
export const PUMP_WHY_ON: Record<number, string> = {
  0: "No Message",
  1: "Freeze Protect",
  2: "Interlock",
  3: "Group On",
  4: "Group Off",
  5: "Manual Off",
  6: "Countdown Done",
  7: "End Schedule",
  8: "Manual On",
  9: "Countdown Timer",
  10: "Schedule On",
};

export const PUMP_STATE: Record<number, string> = {
  0: "Off",
  1: "On",
  2: "On (Freeze Protect)",
  3: "Off (Valves Changing)",
  4: "Priming",
  // the firmware names no state 5
  6: "Waiting For Interlock",
  7: "Paused",
};

export const SPEED_PRESET: Record<number, string> = {
  0: "Low",
  1: "Medium",
  2: "High",
};

export const FILTER_VALVE_POSITION: Record<number, string> = {
  1: "Pool Only",
  2: "Spa Only",
  3: "Spillover",
  4: "Low Priority Heat",
  5: "High Priority Heat",
};

export const FILTER_WHY_ON: Record<number, string> = {
  0: "Off",
  1: "No Water Flow",
  2: "Cooldown",
  3: "CSAD Extend",
  4: "Heater Extend",
  5: "Pause",
  6: "Off (Valve Changing)",
  7: "Force High Speed",
  8: "External Interlock",
  9: "Superchlorinate",
  10: "Countdown Timer",
  11: "Manual On",
  12: "Manual Spillover",
  13: "Timed Spillover",
  14: "Timed Event",
  15: "Freeze Protect",
  16: "Set Pool/Spa/Spillover",
  17: "Spillover Countdown Timer",
  18: "Group Command",
  19: "Spillover Interlock",
  20: "Max Value",
};

export const LIGHT_SPEED: Record<number, string> = {
  0: "1/16x",
  1: "1/8x",
  2: "1/4x",
  3: "1/2x",
  4: "1x",
  5: "2x",
  6: "4x",
  7: "8x",
  8: "16x",
};

export const LIGHT_BRIGHTNESS: Record<number, number> = {
  0: 20,
  1: 40,
  2: 60,
  3: 80,
  4: 100,
};

export const SYSTEM_STATE: Record<number, string> = {
  0: "Off",
  1: "On",
  2: "Service Mode",
  3: "Config Mode",
  4: "Timed Service Mode",
};

// the backyard is On
export const isRunning = (state: number) => state === 1;

export const HEATER_MODE: Record<number, string> = {
  0: "Heat",
  1: "Cool",
  2: "Auto",
  3: "Off",
};

// what the chemistry module is doing with the pH reducer
export const CSAD_MODE: Record<number, string> = {
  0: "Off",
  1: "Auto",
  2: "Forced On",
  3: "Monitoring",
  4: "Dispense Off",
};

// the rank an appliance takes among a body's heat sources
export const HEATER_PRIORITY: Record<number, string> = {
  0: "Priority 1",
  1: "Priority 2",
  2: "Priority 3",
  3: "Priority 4",
  4: "Priority 5",
  // not a rank, but the controller setting that puts solar ahead of everything
  254: "Solar First",
};

export const HEATER_STATE: Record<number, string> = {
  0: "Off",
  1: "On",
  2: "Pause",
  3: "Cool Down",
};

export const CHLORINATOR_OP_MODE: Record<number, string> = {
  0: "Not Config",
  1: "Timed",
  2: "ORP Auto",
};

export const CHLORINATOR_OPERATING_STATE: Record<number, string> = {
  0: "Off",
  1: "Paused",
  2: "Generating",
};

export const CHLORINATOR_STATUS: Record<number, string> = {
  1: "Error Present",
  2: "Alert Present",
  4: "Generating",
  8: "System Paused",
  16: "Local Paused",
  32: "Authenticated",
  64: "K1 Active",
  128: "K2 Active",
};

// a word packed as fields from bit 0 up
export type PackedField = {
  // bits
  width: number;
  values: Record<number, string>;
};

export const CHLORINATOR_ALERTS: PackedField[] = [
  {
    width: 2,
    values: {
      1: "Low Salt",
      2: "Very Low Salt",
    },
  },
  {
    width: 1,
    values: {
      1: "High Cell Current",
    },
  },
  {
    width: 1,
    values: {
      1: "Low Cell Voltage",
    },
  },
  {
    width: 2,
    values: {
      1: "Low Water Temp",
      2: "Water Temp Scaleback",
      3: "High Water Temp",
    },
  },
  {
    width: 2,
    values: {
      1: "High Board Temp",
      2: "Board Temp Clearing",
    },
  },
  {
    width: 1,
    values: {
      1: "ORP Overfeed Timeout",
    },
  },
  {
    width: 2,
    values: {
      1: "Superchlorinating",
      2: "Superchlorinate Timeout",
    },
  },
  {
    width: 2,
    values: {
      1: "Clean Cell",
    },
  },
];

export const CHLORINATOR_ERRORS: PackedField[] = [
  {
    width: 2,
    values: {
      1: "Cell Current Sensor Shorted",
      2: "Cell Current Sensor Open",
    },
  },
  {
    width: 2,
    values: {
      1: "Cell Voltage Sensor Shorted",
      2: "Cell Voltage Sensor Open",
    },
  },
  {
    width: 2,
    values: {
      1: "Cell Temp Sensor Shorted",
      2: "Cell Temp Sensor Open",
    },
  },
  {
    width: 2,
    values: {
      1: "Board Temp Sensor Shorted",
      2: "Board Temp Sensor Open",
    },
  },
  {
    width: 2,
    values: {
      1: "Relay K1 Shorted",
      2: "Relay K1 Open",
    },
  },
  {
    width: 2,
    values: {
      1: "Relay K2 Shorted",
      2: "Relay K2 Open",
    },
  },
  {
    width: 2,
    values: {
      1: "Non-Hayward Cell",
      2: "Cell Authentication Error",
    },
  },
];

export const RELAY_STATE: Record<number, string> = {
  0: "Off",
  1: "On",
  2: "On (Freeze Protect)",
  3: "Waiting For Interlock",
  4: "Paused",
  5: "Waiting For Filter",
};

export const RELAY_WHY_ON: Record<number, string> = {
  0: "No Message",
  1: "Manual Off",
  2: "Countdown Done",
  3: "End Schedule",
  4: "Group Off",
  5: "Manual On",
  6: "Countdown Timer",
  7: "Schedule On",
  8: "Group On",
  9: "Freeze Protect",
  10: "Interlock",
};

export const bitmaskNames = (raw: number, map: Record<number, string>) => {
  const names: string[] = [];
  for (const [bit, name] of Object.entries(map)) {
    if ((raw & Number(bit)) !== 0) {
      names.push(name);
    }
  }
  if (names.length > 0) {
    return names.join(", ");
  }
  return raw === 0 ? "None" : "Unknown";
};

export const packedNames = (raw: number, fields: PackedField[]) => {
  const names: string[] = [];
  let shift = 0;
  for (const field of fields) {
    const value = (raw >> shift) & ((1 << field.width) - 1);
    if (value !== 0) {
      names.push(field.values[value] ?? "Unknown");
    }
    shift += field.width;
  }
  return names.length > 0 ? names.join(", ") : "None";
};
