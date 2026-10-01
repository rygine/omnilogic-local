import { type OmniLogic, SYSTEM_STATE } from "@rygine/omnilogic-local-sdk";

import { type Entity, enumOf, temperature } from "@/entities/entity";

export const backyardEntities = (omni: OmniLogic): Entity[] => [
  {
    platform: "sensor",
    key: "air_temperature",
    name: "Air temperature",
    config: temperature,
    value: () => omni.backyard.airTemp,
  },
  {
    platform: "sensor",
    key: "system_state",
    name: "System state",
    config: enumOf(SYSTEM_STATE),
    value: () => omni.backyard.systemState,
  },
];
