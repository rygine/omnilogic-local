import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { Accessory, uuid } from "@homebridge/hap-nodejs";
import type { API, PlatformAccessory } from "homebridge";

import type { Context } from "@/platform";

import { hap } from "./hap";

// hap-nodejs's Accessory with the plugin's context
class FakeAccessory extends Accessory {
  context: Record<string, unknown> = {};

  updateDisplayName(name: string): void {
    this.displayName = name;
  }
}

const accessoryFor = (name: string, context: Context): FakeAccessory => {
  const accessory = new FakeAccessory(name, uuid.generate(context.id));
  accessory.context = context;
  return accessory;
};

// homebridge as the platform sees it
export const fakeApi = () => {
  const registered: Accessory[] = [];
  const unregistered: Accessory[] = [];
  const updated: Accessory[] = [];
  const events = new Map<string, () => unknown>();
  const api = {
    hap,
    platformAccessory: FakeAccessory,
    registerPlatformAccessories: (
      _plugin: string,
      _platform: string,
      list: Accessory[],
    ) => registered.push(...list),
    unregisterPlatformAccessories: (
      _plugin: string,
      _platform: string,
      list: Accessory[],
    ) => unregistered.push(...list),
    updatePlatformAccessories: (list: Accessory[]) => updated.push(...list),
    user: { storagePath: () => mkdtempSync(join(tmpdir(), "omni-")) },
    on: (event: string, listener: () => unknown) => {
      events.set(event, listener);
    },
  } as unknown as API;
  return {
    api,
    registered,
    unregistered,
    updated,
    cached: (name: string, context: Context) =>
      accessoryFor(name, context) as unknown as PlatformAccessory,
    launch: async () => {
      await events.get("didFinishLaunching")?.();
    },
    shutdown: async () => {
      await events.get("shutdown")?.();
    },
  };
};
