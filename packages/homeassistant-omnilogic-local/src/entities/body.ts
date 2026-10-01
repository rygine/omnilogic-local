import {
  type BodyOfWater,
  type OmniLogic,
  timerParams,
} from "@rygine/omnilogic-local-sdk";

import {
  type DeviceSpec,
  type Entity,
  percent,
  temperature,
  switchSetting,
  toNumber,
} from "@/entities/entity";

export const body = (omni: OmniLogic, b: BodyOfWater): DeviceSpec => {
  const row = omni.config.backyard.bodiesOfWater.find(
    (x) => x.systemId === b.systemId,
  );
  // a pool whose filter also serves the spa can spill over
  const spills =
    b.type === "BOW_POOL" &&
    row?.sharedType === "BOW_SHARED_EQUIPMENT" &&
    b.filter !== undefined;
  const spillover: Entity = {
    platform: "number",
    key: "spillover",
    name: "Spillover speed",
    config: { ...percent, mode: "slider" },
    value: () => (b.spilloverOn ? (b.filter?.speed ?? 0) : 0),
    command: async (payload) =>
      omni.command("SetUISpilloverCmd", {
        poolId: b.systemId,
        data: toNumber(payload),
        ...timerParams(),
      }),
  };
  return {
    id: String(b.systemId),
    name: b.name,
    model: b.type === "BOW_SPA" ? "Spa" : "Pool",
    area: b.name,
    entities: [
      {
        platform: "sensor",
        key: "water_temperature",
        name: "Water temperature",
        config: temperature,
        value: () => b.waterTemp,
      },
      {
        platform: "binary_sensor",
        key: "flow",
        name: "Flow",
        // water moves while the body's filter pump turns
        value: () => (b.filter?.reported ? b.filter.isRunning : undefined),
      },
      switchSetting(
        "spillover_allowed",
        "Spillover allowed",
        () => b.spilloverEnabled,
        (on) => b.setSpilloverEnabled(on),
      ),
      ...(spills ? [spillover] : []),
    ],
    schedule: spills
      ? (data) => ({
          start: [
            {
              key: "spillover",
              action: "number.set_value",
              data: { value: data },
            },
          ],
          end: [
            {
              key: "spillover",
              action: "number.set_value",
              data: { value: 0 },
            },
          ],
        })
      : undefined,
  };
};
