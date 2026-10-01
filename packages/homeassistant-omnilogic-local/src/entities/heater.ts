import {
  type BodyOfWater,
  type Heater,
  HEATER_PRIORITY,
} from "@rygine/omnilogic-local-sdk";

import {
  numberSetting,
  type DeviceSpec,
  type Entity,
  nameInArea,
  percent,
  tryRead,
  setting,
  switchSetting,
  toNumber,
} from "@/entities/entity";

const MODES = ["heat", "cool", "auto"];

// each heat source state as the thermostat words it
const SOURCE_STATE: Record<string, string> = {
  On: "Heating",
  Pause: "Paused",
  "Cool Down": "Cooling Down",
};

export const heater = (h: Heater, b: BodyOfWater): DeviceSpec => {
  const sources = h.appliances;
  const cools = sources.some((a) => a.supportsCooling);
  const thermostat: Entity = {
    platform: "climate",
    key: "thermostat",
    name: null,
    topics: (t) => ({
      modes: cools ? ["off", ...MODES] : ["off", "heat"],
      mode_state_topic: t.state,
      mode_state_template: "{{ value_json.thermostat.mode }}",
      mode_command_topic: t.command("mode"),
      temperature_state_topic: t.state,
      temperature_state_template: "{{ value_json.thermostat.target }}",
      temperature_command_topic: t.command("target"),
      current_temperature_topic: t.state,
      current_temperature_template: "{{ value_json.thermostat.current }}",
      action_topic: t.state,
      action_template: "{{ value_json.thermostat.action }}",
      min_temp: h.minSetPoint,
      max_temp: h.maxSetPoint,
      temp_step: 1,
      precision: 1,
      temperature_unit: "F",
    }),
    value: () => {
      const enabled = tryRead(() => h.enabled);
      const mode = cools ? tryRead(() => h.mode)?.toLowerCase() : "heat";
      return {
        mode: enabled === undefined ? null : enabled ? (mode ?? null) : "off",
        target: tryRead(() => h.setPoint) ?? null,
        current: b.waterTemp ?? null,
        action:
          enabled === undefined
            ? null
            : !enabled
              ? "off"
              : !sources.some((a) => a.isOn)
                ? "idle"
                : mode === "cool"
                  ? "cooling"
                  : "heating",
      };
    },
    command: async (payload, field) => {
      if (field === "target") {
        return h.setSetPoint(Math.round(toNumber(payload)));
      }
      if (payload === "off") {
        return h.setEnabled(false);
      }
      if (cools) {
        await h.setMode(MODES.indexOf(payload));
      } else if (payload !== "heat") {
        throw new Error(`"${payload}" is not a mode of this heater`);
      }
      return h.setEnabled(true);
    },
  };
  const sourceEntities = sources.flatMap((a): Entity[] => {
    const id = a.equipmentId;
    const ranks = Object.entries(HEATER_PRIORITY).filter(
      ([rank]) => rank !== "254" || a.type === "HTR_SOLAR",
    );
    return [
      {
        platform: "sensor",
        key: `source_${id}_state`,
        name: sources.length === 1 ? "State" : `${a.name} state`,
        config: {
          device_class: "enum",
          options: ["Off", "Idle", "Heating", "Paused", "Cooling Down"],
        },
        value: () =>
          a.status === "Off"
            ? tryRead(() => h.enabled)
              ? "Idle"
              : "Off"
            : (SOURCE_STATE[a.status] ?? null),
      },
      switchSetting(
        `source_${id}_enabled`,
        `${a.name} enabled`,
        () => a.enabled,
        (on) => a.setEnabled(on),
      ),
      {
        platform: "select",
        key: `source_${id}_priority`,
        name: `${a.name} priority`,
        config: { ...setting, options: ranks.map(([, label]) => label) },
        value: () => {
          const label = a.priority;
          return label === "Unknown" ? null : label;
        },
        command: async (payload) =>
          a.setPriority(
            Number(ranks.find(([, label]) => label === payload)?.[0]),
          ),
      },
    ];
  });
  return {
    id: String(h.equipmentId),
    name: nameInArea(b.name, h.name),
    model: "Heater",
    area: b.name,
    entities: [
      thermostat,
      switchSetting(
        "cooldown",
        "Cooldown",
        () => h.cooldown,
        (on) => h.setCooldown(on),
      ),
      switchSetting(
        "extend",
        "Extend",
        () => h.extend,
        (on) => h.setExtend(on),
      ),
      switchSetting(
        "silent_mode",
        "Silent mode",
        () => h.silentMode,
        (on) => h.setSilentMode(on),
      ),
      ...(sources.length > 0
        ? [
            switchSetting(
              "allow_low_speed",
              "Allow low speed",
              () => h.allowLowSpeed,
              (on) => h.setAllowLowSpeed(on),
            ),
            numberSetting(
              "low_speed",
              "Low speed",
              percent,
              () => h.lowSpeed,
              (v) => h.setLowSpeed(v),
            ),
          ]
        : []),
      ...(sources.some((a) => a.type === "HTR_SOLAR")
        ? [
            numberSetting(
              "solar_set_point",
              "Solar set point",
              {
                min: h.minSetPoint,
                max: h.maxSetPoint,
                step: 1,
                device_class: "temperature",
                unit_of_measurement: "°F",
              },
              () => h.solarSetPoint,
              (v) => h.setSolarSetPoint(Math.round(v)),
            ),
          ]
        : []),
      {
        ...numberSetting(
          "auto_differential",
          "Auto-differential",
          { min: 2, max: 10, step: 1, unit_of_measurement: "°F" },
          () => h.autoDifferential(),
          (v) => h.setAutoDifferential(v),
        ),
        commandRead: true,
      },
      ...sourceEntities,
    ],
    schedule: (data) => ({
      start: [
        {
          key: "thermostat",
          action: "climate.set_temperature",
          data: { temperature: data, hvac_mode: "heat" },
        },
      ],
      end: [
        {
          key: "thermostat",
          action: "climate.set_hvac_mode",
          data: { hvac_mode: "off" },
        },
      ],
    }),
  };
};
