import {
  FirmwareTooOldError,
  type OmniLogic,
} from "@rygine/omnilogic-local-sdk";

// reads the version from the system info when telemetry has none
const unsupportedFirmwareMessage = async (
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

// checks the controller's firmware
export const checkFirmware = async (
  omni: OmniLogic,
): Promise<{ ok: boolean; message?: string }> => {
  try {
    await omni.refresh();
  } catch (error) {
    if (error instanceof FirmwareTooOldError) {
      return {
        ok: false,
        message: await unsupportedFirmwareMessage(omni, error),
      };
    }
    return { ok: false };
  }
  return { ok: true };
};
