import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { writeController } from "../controller-cache";
import { readPanelSettings, writePanelSetting } from "../panel-settings";
import { patchStored, readStoredSetting, type Stored } from "../stored";
import { hostPort, withRefresh } from "./_validators";

// the panel's own settings, without units, time format, or the clock
export const PANEL_SETTINGS = [
  "beeper",
  "backLight",
  "backLightBrightness",
  "backLightTimeout",
  "vspSpeedFormat",
  "chlorinatorDisplay",
] as const;
export type PanelSetting = (typeof PANEL_SETTINGS)[number];

export type PanelSettings = {
  // key clicks and alarms sound at the panel
  beeper: boolean;
  backLight: boolean;
  // percent, such as 50 or 100
  backLightBrightness: number;
  // seconds the backlight stays on after the last touch
  backLightTimeout: number;
  // pump speeds display as rpm (true) or percent (false)
  vspSpeedFormat: boolean;
  // the chlorinator is labeled Salt (true) or Minerals (false)
  chlorinatorDisplay: boolean;
};

const PANEL_KEY = "panel";

// stored once read, re-read on refresh
export const getPanelSettings = createServerFn({ method: "POST" })
  .validator(withRefresh)
  .handler(({ data }): Promise<Stored<PanelSettings>> =>
    readStoredSetting(
      data,
      PANEL_KEY,
      data.refresh === true,
      "getPanelSettings",
      readPanelSettings,
    ),
  );

const setPanelSettingInput = hostPort.extend({
  setting: z.enum(PANEL_SETTINGS),
  value: z.union([z.boolean(), z.number().int().min(0).max(65535)]),
});

// one write path for every panel setting, and the stored row follows the write
export const setPanelSetting = createServerFn({ method: "POST" })
  .validator(setPanelSettingInput)
  .handler(async ({ data }): Promise<void> => {
    await writeController(
      data.host,
      data.port,
      (omni) => writePanelSetting(omni, data.setting, data.value),
      "setPanelSetting",
    );
    await patchStored<PanelSettings>(data, PANEL_KEY, {
      [data.setting]: data.value,
    });
  });
