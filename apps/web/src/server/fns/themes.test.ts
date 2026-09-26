import { callServerFn, validateServerFn } from "@tests/server/support";
import { beforeEach, describe, expect, it, vi } from "vitest";

// the omni stub the fns reach through the mocked controller-cache
const themes = {
  rename: vi.fn().mockResolvedValue(undefined),
  list: vi.fn(() => [{ systemId: 5, name: "Evening", commands: [] }]),
  run: vi.fn(() => Promise.resolve()),
  create: vi.fn((name: string) => Promise.resolve({ systemId: 9, name })),
  remove: vi.fn(() => Promise.resolve()),
};
const omni = {
  config: { system: { units: "Standard" } },
  backyard: { themes },
  telemetry: { themes: [{ systemId: 5, groupState: 1 }] },
};

vi.mock("../controller-cache", () => ({
  readController: (_h: string, _p: number, fn: (o: unknown) => unknown) =>
    fn(omni),
  writeController: (_h: string, _p: number, fn: (o: unknown) => unknown) =>
    fn(omni),
}));

import {
  activateTheme,
  createTheme,
  deleteTheme,
  getThemes,
  renameTheme,
} from "./themes";

beforeEach(() => {
  themes.list.mockClear();
  themes.run.mockClear();
  themes.create.mockClear();
  themes.remove.mockClear();
  themes.rename.mockClear();
});

const settings = { host: "h", port: 10444 };

// every case asserts on the themes spies
describe("themes fns", () => {
  it("getThemes reads the saved themes", async () => {
    await callServerFn(getThemes, settings);
    expect(themes.list).toHaveBeenCalled();
  });

  it("activateTheme runs the theme", async () => {
    await callServerFn(activateTheme, { ...settings, themeId: 5, on: true });
    expect(themes.run).toHaveBeenCalledWith(5, true, { minutes: undefined });
  });

  it("activateTheme can deactivate", async () => {
    await callServerFn(activateTheme, { ...settings, themeId: 5, on: false });
    expect(themes.run).toHaveBeenCalledWith(5, false, { minutes: undefined });
  });

  it("activateTheme passes minutes through", async () => {
    await callServerFn(activateTheme, {
      ...settings,
      themeId: 5,
      on: true,
      minutes: 90,
    });
    expect(themes.run).toHaveBeenCalledWith(5, true, { minutes: 90 });
  });

  it("activateTheme refuses a countdown outside a day", async () => {
    await expect(
      validateServerFn(activateTheme, {
        ...settings,
        themeId: 5,
        on: true,
        minutes: 0,
      }),
    ).rejects.toThrow(/small/i);
    await expect(
      validateServerFn(activateTheme, {
        ...settings,
        themeId: 5,
        minutes: 1440,
      }),
    ).rejects.toThrow(/big/i);
  });

  it("createTheme saves the current state under the given name", async () => {
    await callServerFn(createTheme, { ...settings, name: "Party" });
    expect(themes.create).toHaveBeenCalledWith("Party");
  });

  it("createTheme refuses an empty or over-long name", async () => {
    await expect(
      validateServerFn(createTheme, { ...settings, name: "   " }),
    ).rejects.toThrow(/name/i);
    await expect(
      validateServerFn(createTheme, { ...settings, name: "ThirteenChars" }),
    ).rejects.toThrow(/name/i);
    await expect(
      validateServerFn(createTheme, { ...settings, name: " Party " }),
    ).resolves.toBeUndefined();
  });

  // the firmware's limit is in bytes, not characters
  it("counts a theme name in UTF-8 bytes", async () => {
    await expect(
      validateServerFn(createTheme, {
        ...settings,
        name: "ÅÅÅÅÅÅÅ",
      }),
    ).rejects.toThrow(/bytes/i);
    await expect(
      validateServerFn(createTheme, { ...settings, name: "Åpen kveld" }),
    ).resolves.toBeUndefined();
  });

  it("deleteTheme removes by id", async () => {
    await callServerFn(deleteTheme, { ...settings, themeId: 5 });
    expect(themes.remove).toHaveBeenCalledWith(5);
  });
});

describe("renameTheme", () => {
  it("renames through the equipment layer", async () => {
    await callServerFn(renameTheme, {
      ...settings,
      themeId: 29,
      name: "Movie",
    });
    expect(themes.rename).toHaveBeenCalledWith(29, "Movie");
  });

  it("refuses an empty or over-long name", async () => {
    const base = { host: "h", port: 1, themeId: 29 };
    await expect(
      validateServerFn(renameTheme, { ...base, name: "   " }),
    ).rejects.toThrow(/name/i);
    await expect(
      validateServerFn(renameTheme, { ...base, name: "ThirteenChars" }),
    ).rejects.toThrow(/name/i);
    await expect(
      validateServerFn(renameTheme, { ...base, name: " Movie " }),
    ).resolves.toBeUndefined();
  });
});
