import type { Relay } from "@rygine/omnilogic-local-sdk";

import {
  type DeviceSpec,
  nameInArea,
  oneOf,
  toBoolean,
} from "@/entities/entity";

export const relay = (r: Relay, area?: string): DeviceSpec => {
  const valve =
    r.type === "RLY_VALVE_ACTUATOR" || r.type === "RLY_SMART_VALVE_ACTUATOR";
  const key = valve ? "valve" : "switch";
  return {
    id: String(r.equipmentId),
    name: area === undefined ? r.name : nameInArea(area, r.name),
    model: r.function,
    area,
    entities: [
      valve
        ? {
            platform: "valve",
            key,
            name: null,
            value: () => (r.isOn ? "open" : "closed"),
            command: async (payload) =>
              oneOf(["OPEN", "CLOSE"], payload) === "OPEN" ? r.on() : r.off(),
          }
        : {
            platform: "switch",
            key,
            name: null,
            value: () => r.isOn,
            command: async (payload) => (toBoolean(payload) ? r.on() : r.off()),
          },
    ],
    schedule: () => ({
      start: [{ key, action: valve ? "valve.open_valve" : "switch.turn_on" }],
      end: [{ key, action: valve ? "valve.close_valve" : "switch.turn_off" }],
    }),
  };
};
