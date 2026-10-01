import {
  ColorLogicPowerState,
  LIGHT_SPEED,
  type Light,
} from "@rygine/omnilogic-local-sdk";

import {
  type DeviceSpec,
  type Entity,
  nameInArea,
  oneOf,
  tryRead,
  toBoolean,
  toNumber,
} from "@/entities/entity";

// percent
const BRIGHTNESS_STEP = 20;

const label = (name: string) =>
  name === "USA"
    ? name
    : name
        .toLowerCase()
        .replaceAll("_", " ")
        .replace("fifteen", "15")
        .replace(/\b\w/g, (c) => c.toUpperCase());

export const light = (l: Light, area?: string): DeviceSpec => {
  const shows = l.shows.map((s) => ({ ...s, name: label(s.name) }));
  const currentShow = () => l.state?.currentShow ?? 0;
  const lightEntity: Entity = {
    platform: "light",
    key: "light",
    name: null,
    topics: (t) => ({
      command_topic: t.command(),
      state_topic: t.state,
      state_value_template: "{{ value_json.light.state }}",
      effect_command_topic: t.command("effect"),
      effect_state_topic: t.state,
      effect_value_template: "{{ value_json.light.effect or '' }}",
      effect_list: shows.map((s) => s.name),
      ...(l.omniDirect
        ? {
            brightness_command_topic: t.command("brightness"),
            brightness_state_topic: t.state,
            brightness_value_template:
              "{{ value_json.light.brightness if value_json.light.brightness is not none else '' }}",
            brightness_scale: 100,
          }
        : {}),
    }),
    value: () => {
      const show = tryRead(() => l.show);
      return {
        state: l.isOn ? "ON" : "OFF",
        effect: show === undefined || show === "Unknown" ? null : label(show),
        brightness: tryRead(() => l.brightness) ?? null,
      };
    },
    command: async (payload, field) => {
      if (field === "effect") {
        const show = shows.find((s) => s.name === payload)?.value;
        if (show === undefined) {
          throw new Error(`"${payload}" is not a show of this light`);
        }
        return l.setShow(show);
      }
      if (field === "brightness") {
        const steps = Math.round(toNumber(payload) / BRIGHTNESS_STEP);
        return l.setShow(currentShow(), {
          brightness: Math.min(
            100,
            Math.max(BRIGHTNESS_STEP, steps * BRIGHTNESS_STEP),
          ),
        });
      }
      if (toBoolean(payload)) {
        return l.isOn ? undefined : l.on();
      }
      return l.off();
    },
  };
  const speeds = Object.values(LIGHT_SPEED);
  const powerStates = Object.keys(ColorLogicPowerState).map(label);
  const speed: Entity = {
    platform: "select",
    key: "speed",
    name: "Show speed",
    config: { options: speeds },
    value: () => {
      const s = tryRead(() => l.speed);
      return s === "Unknown" ? null : s;
    },
    command: async (payload) =>
      l.setShow(currentShow(), { speed: oneOf(speeds, payload) }),
  };
  return {
    id: String(l.equipmentId),
    name: area === undefined ? l.name : nameInArea(area, l.name),
    model: "ColorLogic",
    area,
    entities: [
      lightEntity,
      ...(l.omniDirect ? [speed] : []),
      {
        platform: "sensor",
        key: "power_state",
        name: "Power state",
        config: { device_class: "enum", options: powerStates },
        value: () => {
          const state = label(l.powerState);
          return powerStates.includes(state) ? state : null;
        },
      },
    ],
    schedule: (data) => {
      const name = shows.find((s) => s.value === data)?.name;
      return {
        start: [
          {
            key: "light",
            action: "light.turn_on",
            ...(name === undefined ? {} : { data: { effect: name } }),
          },
        ],
        end: [{ key: "light", action: "light.turn_off" }],
      };
    },
  };
};
