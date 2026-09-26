import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import type { MSPConfig } from "@rygine/omnilogic-local-sdk";

export const configDir = (env: NodeJS.ProcessEnv): string =>
  join(
    env.XDG_CONFIG_HOME || join(env.HOME || homedir(), ".config"),
    "omnilogic-local",
  );

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// a file of another shape is fetched again
const isConfig = (value: unknown): value is MSPConfig =>
  isRecord(value) &&
  typeof value.checksum === "number" &&
  isRecord(value.backyard);

// config and safe command preferences
export class Store {
  #dir: string;
  #warn: (line: string) => void;

  constructor(dir: string, warn: (line: string) => void = () => {}) {
    this.#dir = dir;
    this.#warn = warn;
  }

  safe(): string[] {
    try {
      const parsed: unknown = JSON.parse(
        readFileSync(join(this.#dir, "safe.json"), "utf8"),
      );
      return Array.isArray(parsed)
        ? parsed.filter((v): v is string => typeof v === "string")
        : [];
    } catch {
      return [];
    }
  }

  addSafe(name: string): void {
    const names = new Set(this.safe());
    names.add(name);
    this.#write(
      "safe.json",
      `${JSON.stringify([...names].toSorted(), null, 2)}\n`,
    );
  }

  cachedConfig(): { config: MSPConfig; ageSeconds: number } | undefined {
    const file = join(this.#dir, "config.json");
    try {
      const ageSeconds = Math.round(
        (Date.now() - statSync(file).mtimeMs) / 1000,
      );
      const config: unknown = JSON.parse(readFileSync(file, "utf8"));
      return isConfig(config) ? { config, ageSeconds } : undefined;
    } catch {
      return undefined;
    }
  }

  cacheConfig(config: MSPConfig): void {
    this.#write("config.json", JSON.stringify(config));
  }

  // a file that cannot be saved is reported
  #write(name: string, text: string): void {
    try {
      mkdirSync(this.#dir, { recursive: true });
      writeFileSync(join(this.#dir, name), text);
    } catch {
      this.#warn(`${name}: not saved, ${this.#dir} is not writable`);
    }
  }
}
