import type {
  BodyOfWater,
  Light,
  OmniLogic,
} from "@rygine/omnilogic-local-sdk";

import { WebAppError } from "@/server/errors";

// the body of water with this id, or an error
export const requireBody = (omni: OmniLogic, bowId: number): BodyOfWater => {
  const body = omni.backyard.body(bowId);
  if (!body) {
    throw new WebAppError("ERROR", `no body of water ${bowId}`);
  }
  return body;
};

type DeviceKind = "filter" | "heater" | "chlorinator";

// one of the body's devices, or an error naming it
export const requireDevice = <K extends DeviceKind>(
  omni: OmniLogic,
  bowId: number,
  kind: K,
): NonNullable<BodyOfWater[K]> => {
  const device = omni.backyard.body(bowId)?.[kind];
  if (!device) {
    throw new WebAppError("ERROR", `no ${kind} installed on body ${bowId}`);
  }
  return device;
};

// one of the body's lights, by its equipment id, or an error
export const requireLight = (
  omni: OmniLogic,
  bowId: number,
  equipmentId: number,
): Light => {
  const light = omni.backyard
    .body(bowId)
    ?.lights.find((l) => l.equipmentId === equipmentId);
  if (!light) {
    throw new WebAppError("ERROR", `no light ${equipmentId} on body ${bowId}`);
  }
  return light;
};
