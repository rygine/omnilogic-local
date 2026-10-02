import { FirmwareTooOldError, OmniLogic } from "@rygine/omnilogic-local-sdk";

import type { ControllerConfig } from "@/config";
import { discover, type Exposable } from "@/discovery";
import { unsupportedFirmwareMessage } from "@/firmware";

export type Payload = Partial<Pick<ControllerConfig, "host" | "port">>;

// the settings page's Discover
export const discoverHandler = async (
  payload: Payload,
  makeSession: (host: string, port: number) => OmniLogic = (host, port) =>
    new OmniLogic({ host, port }),
): Promise<Exposable[]> => {
  const host = payload.host?.trim() ?? "";
  if (host === "") {
    throw new Error("enter the controller's host first");
  }
  const omni = makeSession(host, payload.port ?? 10444);
  try {
    await omni.refresh();
  } catch (error) {
    if (error instanceof FirmwareTooOldError) {
      throw new Error(await unsupportedFirmwareMessage(omni, error), {
        cause: error,
      });
    }
    return discover(await omni.fetchConfig(), undefined);
  }
  return discover(omni.config, omni.telemetry);
};
