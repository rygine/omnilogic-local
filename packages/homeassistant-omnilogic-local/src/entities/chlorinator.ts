import {
  CHLORINATOR_OP_MODE,
  CHLORINATOR_OPERATING_STATE,
  type Chlorinator,
} from "@rygine/omnilogic-local-sdk";

import {
  toNumber,
  type DeviceSpec,
  diagnostic,
  type Entity,
  enumOf,
  nameInArea,
  percent,
  fieldTemplate,
  availableWhile,
  temperature,
  toBoolean,
} from "@/entities/entity";

const salt = { unit_of_measurement: "ppm", state_class: "measurement" };

// a sensor over one field of the cell measurement
const cellField = (
  key: string,
  name: string,
  field: string,
  config: Record<string, unknown>,
): Entity => ({
  platform: "sensor",
  key,
  name,
  config: { ...diagnostic, ...config },
  topics: (t) => ({
    state_topic: t.state,
    value_template: fieldTemplate("cell_measurement", field),
  }),
});

// Home Assistant reads a value of "None" as unknown
const shown = (value: string, none: string) =>
  value === "None" ? none : value;

export const chlorinator = (c: Chlorinator, area: string): DeviceSpec => ({
  id: String(c.equipmentId),
  name: nameInArea(area, c.name),
  model: "Chlorinator",
  area,
  entities: [
    {
      platform: "switch",
      key: "enabled",
      name: null,
      value: () => c.enabled,
      command: async (payload) => c.setEnabled(toBoolean(payload)),
    },
    {
      platform: "sensor",
      key: "average_salt",
      name: "Average salt",
      config: salt,
      value: () => c.averageSalt,
    },
    {
      platform: "sensor",
      key: "instant_salt",
      name: "Instant salt",
      config: salt,
      value: () => c.instantSalt,
    },
    {
      platform: "sensor",
      key: "operating_state",
      name: "Operating state",
      config: enumOf(CHLORINATOR_OPERATING_STATE, "Off"),
      value: () => c.operatingState,
    },
    {
      platform: "sensor",
      key: "operating_mode",
      name: "Operating mode",
      config: enumOf(CHLORINATOR_OP_MODE, "Not Config"),
      value: () => c.operatingMode,
    },
    {
      platform: "sensor",
      key: "conditions",
      name: "Conditions",
      config: diagnostic,
      value: () => shown(c.conditions, "No conditions"),
    },
    {
      platform: "sensor",
      key: "alert",
      name: "Alert",
      value: () => shown(c.alert, "No alert"),
    },
    {
      platform: "sensor",
      key: "error",
      name: "Error",
      value: () => shown(c.error, "No error"),
    },
    availableWhile(
      {
        platform: "number",
        key: "output",
        name: "Output",
        config: { ...percent, mode: "slider" },
        value: () => c.timedPercent,
        command: async (payload) => c.setTimedPercent(toNumber(payload)),
      },
      () => c.operatingMode === "Timed",
    ),
    {
      platform: "sensor",
      key: "cell_status",
      name: "Cell status",
      commandRead: true,
      config: diagnostic,
      topics: (t) => ({
        value_template: fieldTemplate("cell_status", "opState"),
        json_attributes_topic: t.state,
        json_attributes_template:
          "{{ (value_json.cell_status or {}) | tojson }}",
      }),
      value: () => c.cellStatus(),
    },
    {
      platform: "sensor",
      key: "cell_measurement",
      name: "Cell voltage",
      commandRead: true,
      config: {
        ...diagnostic,
        device_class: "voltage",
        unit_of_measurement: "V",
        state_class: "measurement",
      },
      topics: () => ({
        value_template: fieldTemplate("cell_measurement", "voltage"),
      }),
      value: () => c.cellMeasurement(),
    },
    cellField("cell_current", "Cell current", "current", {
      device_class: "current",
      unit_of_measurement: "A",
      state_class: "measurement",
    }),
    cellField("cell_temperature", "Cell temperature", "cellTemp", temperature),
    cellField(
      "board_temperature",
      "Board temperature",
      "boardTemp",
      temperature,
    ),
    {
      platform: "sensor",
      key: "relay_polarity",
      name: "Relay polarity",
      commandRead: true,
      config: diagnostic,
      value: () => c.relayPolarity(),
    },
  ],
  schedule: (data) => ({
    start: [
      { key: "output", action: "number.set_value", data: { value: data } },
      { key: "enabled", action: "switch.turn_on" },
    ],
    end: [{ key: "enabled", action: "switch.turn_off" }],
  }),
});
