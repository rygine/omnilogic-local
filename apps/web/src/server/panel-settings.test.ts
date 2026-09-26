import { type MSPConfig, OmniLogic } from "@rygine/omnilogic-local-sdk";
import { validateServerFn } from "@tests/server/support";
import { describe, expect, it, vi } from "vitest";

import { PANEL_SETTINGS, setPanelSetting } from "./fns/panel";
import { readPanelSettings, writePanelSetting } from "./panel-settings";

// the two format settings are read from the configuration, not asked for
const config = {
  backyard: { bodiesOfWater: [] },
  system: { mspVspSpeedFormat: "RPM", mspChlorDisplay: "Salt" },
} as unknown as MSPConfig;

// a session that answers each panel read with a canned value
const omniWith = (answers: Record<string, unknown>) => {
  const command = vi.fn((name: string, _params: unknown) =>
    Promise.resolve(answers[name]),
  );
  const omni = Object.assign(new OmniLogic({ host: "127.0.0.1", config }), {
    command,
  });
  return { omni, command };
};

describe("readPanelSettings", () => {
  it("asks for the four the panel holds and reads the two in the configuration", async () => {
    const { omni, command } = omniWith({
      GetBeeper: { enabled: true },
      GetBackLight: { state: false },
      GetBackLightBrightness: { brightness: 100 },
      GetBackLightTimeout: { timeout: 30 },
    });
    expect(await readPanelSettings(omni)).toEqual({
      beeper: true,
      backLight: false,
      backLightBrightness: 100,
      backLightTimeout: 30,
      vspSpeedFormat: true,
      chlorinatorDisplay: true,
    });
    expect(command).toHaveBeenCalledTimes(PANEL_SETTINGS.length - 2);
    for (const call of command.mock.calls) {
      expect(call[1]).toBeUndefined();
    }
  });
});

describe("writePanelSetting", () => {
  it("sends the setting's write command with the value as data", async () => {
    const { omni, command } = omniWith({});
    await writePanelSetting(omni, "backLightTimeout", 60);
    expect(command).toHaveBeenCalledWith("SetBackLightTimeout", { data: 60 });
    await writePanelSetting(omni, "beeper", false);
    expect(command).toHaveBeenCalledWith("SetBeeper", { data: 0 });
  });
});

describe("setPanelSetting's input", () => {
  it("accepts only the six settings and a boolean or small integer", async () => {
    const base = { host: "h", port: 1 };
    await expect(
      validateServerFn(setPanelSetting, {
        ...base,
        setting: "beeper",
        value: false,
      }),
    ).resolves.toBeUndefined();
    await expect(
      validateServerFn(setPanelSetting, {
        ...base,
        setting: "units",
        value: true,
      }),
    ).rejects.toThrow(/setting/i);
    await expect(
      validateServerFn(setPanelSetting, {
        ...base,
        setting: "backLightTimeout",
        value: 1.5,
      }),
    ).rejects.toThrow(/value/i);
  });
});
