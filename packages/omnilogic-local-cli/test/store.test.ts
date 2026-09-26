import { mkdtempSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { MSPConfig } from "@rygine/omnilogic-local-sdk";

import { configDir, Store } from "@/store";

const fresh = () => new Store(mkdtempSync(join(tmpdir(), "omnilogic-local-")));

describe("configDir", () => {
  it("is under XDG_CONFIG_HOME when set, else ~/.config", () => {
    expect(configDir({ XDG_CONFIG_HOME: "/x", HOME: "/h" })).toBe(
      "/x/omnilogic-local",
    );
    expect(configDir({ HOME: "/h" })).toBe("/h/.config/omnilogic-local");
    expect(configDir({ XDG_CONFIG_HOME: "", HOME: "/h" })).toBe(
      "/h/.config/omnilogic-local",
    );
  });
});

describe("Store", () => {
  it("has no safe list and no cached config to start", () => {
    const store = fresh();
    expect(store.safe()).toEqual([]);
    expect(store.cachedConfig()).toBeUndefined();
  });

  it("remembers a safe command once, sorted", () => {
    const store = fresh();
    store.addSafe("SetUIPoolFilterCmd");
    store.addSafe("SetUIHeaterCmd");
    store.addSafe("SetUIPoolFilterCmd");
    expect(store.safe()).toEqual(["SetUIHeaterCmd", "SetUIPoolFilterCmd"]);
  });

  it("reports a directory it cannot write and carries on", () => {
    const file = join(mkdtempSync(join(tmpdir(), "omnilogic-local-")), "f");
    writeFileSync(file, "");
    const lines: string[] = [];
    const store = new Store(join(file, "under-a-file"), (l) => lines.push(l));
    store.addSafe("SetUIHeaterCmd");
    store.cacheConfig({ checksum: 1 } as MSPConfig);
    expect(lines).toEqual([
      expect.stringContaining("safe.json: not saved"),
      expect.stringContaining("config.json: not saved"),
    ]);
    expect(store.safe()).toEqual([]);
    expect(store.cachedConfig()).toBeUndefined();
  });

  it("ignores a safe.json that is not a list of names", () => {
    const dir = mkdtempSync(join(tmpdir(), "omnilogic-local-"));
    writeFileSync(join(dir, "safe.json"), '{"nope": 1}');
    expect(new Store(dir).safe()).toEqual([]);
  });

  it("caches the configuration and reports its age", () => {
    const dir = mkdtempSync(join(tmpdir(), "omnilogic-local-"));
    const store = new Store(dir);
    const config = { checksum: 7, backyard: {} } as MSPConfig;
    store.cacheConfig(config);
    const old = (Date.now() - 400_000) / 1000;
    utimesSync(join(dir, "config.json"), old, old);
    const cached = store.cachedConfig();
    expect(cached?.config).toEqual(config);
    expect(cached?.ageSeconds).toBeGreaterThanOrEqual(399);
  });
});
