import type { Pump } from "@rygine/omnilogic-local-sdk";

import {
  type DeviceSpec,
  type Entity,
  enumOf,
  nameInArea,
  oneOf,
  percent,
  toBoolean,
  toNumber,
} from "@/entities/entity";

// a dual-speed pump runs only at these percents
const DUAL_SPEEDS: Record<string, number> = { Off: 0, Low: 50, High: 100 };

export const pumpEntities = (p: Pump, rpm: boolean): Entity[] => {
  const kind = p.speedType;

  // the pump speed when the switch turns it on
  const onSpeed = () => {
    const { minSpeed: min, maxSpeed: max } = p;
    if (kind === "single") {
      return max;
    }
    if (p.lastSpeed >= min && p.lastSpeed <= max) {
      return p.lastSpeed;
    }
    return kind === "dual" ? DUAL_SPEEDS.Low! : (p.presets?.low ?? max);
  };

  const powerSwitch: Entity = {
    platform: "switch",
    key: "switch",
    name: null,
    // a paused pump reads off
    value: () => p.isRunning,
    command: async (payload) => p.setSpeed(toBoolean(payload) ? onSpeed() : 0),
  };
  const whyOn: Entity = {
    platform: "sensor",
    key: "why_on",
    name: "Why on",
    config: enumOf(p.reasons),
    value: () => p.whyOn,
  };

  if (kind === "single") {
    return [powerSwitch, whyOn];
  }
  if (kind === "dual") {
    const options = Object.keys(DUAL_SPEEDS);
    return [
      powerSwitch,
      {
        platform: "select",
        key: "speed_preset",
        name: "Speed",
        config: { options },
        value: () => options.find((o) => DUAL_SPEEDS[o] === p.speed) ?? null,
        command: async (payload) =>
          p.setSpeed(DUAL_SPEEDS[oneOf(options, payload)]!),
      },
      whyOn,
    ];
  }

  // the speed in RPM, read only
  const rpmSensor: Entity[] =
    rpm && p.maxRpm !== undefined
      ? [
          {
            platform: "sensor",
            key: "speed_rpm",
            name: "Speed (RPM)",
            config: { unit_of_measurement: "RPM", state_class: "measurement" },
            value: () => p.rpm,
          },
        ]
      : [];
  const presets: [string, string, number | undefined][] = [
    ["low", "Low", p.presets?.low],
    ["medium", "Medium", p.presets?.medium],
    ["high", "High", p.presets?.high],
  ];
  return [
    powerSwitch,
    {
      platform: "number",
      key: "speed",
      name: "Speed",
      config: { ...percent, mode: "slider" },
      value: () => p.speed,
      command: async (payload) => p.setSpeed(toNumber(payload)),
    },
    ...rpmSensor,
    ...presets.flatMap(([key, name, speed]): Entity[] =>
      speed === undefined
        ? []
        : [
            {
              platform: "button",
              key: `preset_${key}`,
              name,
              // the preset's speed as an attribute
              value: () => speed,
              topics: (t) => ({
                state_topic: undefined,
                value_template: undefined,
                json_attributes_topic: t.state,
                json_attributes_template: `{{ {"speed": value_json.preset_${key}} | tojson }}`,
              }),
              command: async () => p.setSpeed(speed),
            },
          ],
    ),
    whyOn,
  ];
};

export const pumpSchedule = (kind: Pump["speedType"]) => (data: number) => {
  if (kind === "single") {
    return {
      start: [{ key: "switch", action: "switch.turn_on" }],
      end: [{ key: "switch", action: "switch.turn_off" }],
    };
  }
  if (kind === "dual") {
    return {
      start: [
        {
          key: "speed_preset",
          action: "select.select_option",
          data: { option: data >= 100 ? "High" : "Low" },
        },
      ],
      end: [
        {
          key: "speed_preset",
          action: "select.select_option",
          data: { option: "Off" },
        },
      ],
    };
  }
  return {
    start: [
      { key: "speed", action: "number.set_value", data: { value: data } },
    ],
    end: [{ key: "switch", action: "switch.turn_off" }],
  };
};

export const pump = (p: Pump, area: string, rpm: boolean): DeviceSpec => ({
  id: String(p.equipmentId),
  name: nameInArea(area, p.name),
  model: p.type,
  area,
  entities: pumpEntities(p, rpm),
  schedule: pumpSchedule(p.speedType),
});
