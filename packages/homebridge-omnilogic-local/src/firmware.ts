import {
  FirmwareTooOldError,
  type OmniLogic,
} from "@rygine/omnilogic-local-sdk";

// reads the version from the system info when telemetry has none
export const unsupportedFirmwareMessage = async (
  omni: OmniLogic,
  error: FirmwareTooOldError,
) => {
  const version =
    error.version ??
    (await omni.fetchSysInfo().catch(() => undefined))?.components.find(
      (c) => c.type === "MSP",
    )?.version;
  return new FirmwareTooOldError({
    version,
    minimum: error.minimum,
  }).message.split("\n\n")[0]!;
};
