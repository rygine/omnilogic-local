import type { OmniLogic } from "@rygine/omnilogic-local-sdk";

import type { PanelSetting, PanelSettings } from "./fns/panel";

// the panel's settings, read one at a time
export const readPanelSettings = async (
  omni: OmniLogic,
): Promise<PanelSettings> => {
  const panel = omni.backyard.panel;
  return {
    beeper: await panel.beeper(),
    backLight: await panel.backLight(),
    backLightBrightness: await panel.backLightBrightness(),
    backLightTimeout: await panel.backLightTimeout(),
    vspSpeedFormat: panel.vspSpeedFormat === "RPM",
    chlorinatorDisplay: panel.chlorinatorDisplay === "Salt",
  };
};

export const writePanelSetting = async (
  omni: OmniLogic,
  setting: PanelSetting,
  value: boolean | number,
): Promise<void> => {
  const panel = omni.backyard.panel;
  switch (setting) {
    case "beeper":
      await panel.setBeeper(Boolean(value));
      return;
    case "backLight":
      await panel.setBackLight(Boolean(value));
      return;
    case "backLightBrightness":
      await panel.setBackLightBrightness(Number(value));
      return;
    case "backLightTimeout":
      await panel.setBackLightTimeout(Number(value));
      return;
    case "vspSpeedFormat":
      await panel.setVspSpeedFormat(value ? "RPM" : "Percent");
      return;
    case "chlorinatorDisplay":
      await panel.setChlorinatorDisplay(value ? "Salt" : "Minerals");
      return;
    default:
      return;
  }
};
