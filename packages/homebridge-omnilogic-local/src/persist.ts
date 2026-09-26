import { readFileSync, renameSync, writeFileSync } from "node:fs";

import type { Logging } from "homebridge";

import { minutes as inMinutes } from "@/accessories/attach";
import { isRecord, numberOf } from "@/helpers";

export const loadJson = (file: string): Record<string, unknown> => {
  try {
    const saved: unknown = JSON.parse(readFileSync(file, "utf8"));
    return isRecord(saved) ? saved : {};
  } catch {
    return {};
  }
};

// an atomic write
export const saveJson = (file: string, data: unknown): void => {
  writeFileSync(`${file}.tmp`, JSON.stringify(data));
  renameSync(`${file}.tmp`, file);
};

// the last reading, kept across a restart
export class Readings {
  #file: string;
  #values: Record<string, number> = {};

  constructor(file: string) {
    this.#file = file;
    for (const [key, value] of Object.entries(loadJson(file))) {
      if (typeof value === "number") {
        this.#values[key] = value;
      }
    }
  }

  // the last value when there is no new reading
  keep(key: string, value: number | undefined): number | undefined {
    if (value === undefined) {
      return this.#values[key];
    }
    if (this.#values[key] !== value) {
      this.#values[key] = value;
      this.#save();
    }
    return value;
  }

  #save(): void {
    try {
      saveJson(this.#file, this.#values);
    } catch {
      // best effort
    }
  }
}

// turning on starts the timer and turning off cancels it, returns true when a deadline changed
export type AutoOff = (on: boolean) => boolean;

// the delay before a failed off is sent again
const RETRY_MS = 60_000;

// the plugin's own countdowns, kept across a restart
export class OffTimers {
  #file: string;
  #log: Logging;
  #deadlines: Record<string, number> = {};
  #timers = new Map<string, ReturnType<typeof setTimeout>>();
  #bound = new Set<string>();
  #stopped = 0;

  constructor(file: string, log: Logging) {
    this.#file = file;
    this.#log = log;
    for (const [key, value] of Object.entries(loadJson(file))) {
      const deadline = numberOf(value);
      if (deadline === undefined) {
        this.#log.warn(`ignoring a saved timer for ${key}`);
        continue;
      }
      this.#deadlines[key] = deadline;
    }
  }

  // the timer for one key, resuming a deadline saved before a restart
  for(
    key: string,
    minutes: number,
    fire: () => Promise<unknown>,
    label: string = key,
  ): AutoOff {
    this.#bound.add(key);
    const run = () => {
      // this timer's deadline
      const mine = this.#deadlines[key];
      const stopped = this.#stopped;
      fire()
        .then(() => {
          if (stopped !== this.#stopped || this.#deadlines[key] !== mine) {
            return false;
          }
          return this.#clear(key);
        })
        .catch((error: unknown) => {
          if (stopped !== this.#stopped || this.#deadlines[key] !== mine) {
            return;
          }
          this.#log.warn(
            `${label}: off failed, trying again: ${String(error)}`,
          );
          this.#schedule(key, run, RETRY_MS);
        });
    };
    const deadline = this.#deadlines[key];
    if (deadline !== undefined) {
      const left = Math.ceil((deadline - Date.now()) / 60_000);
      this.#log.info(
        left > 0
          ? `${label}: found a timer from before the restart, ${inMinutes(left)} left`
          : `${label}: found a timer that ran out while Homebridge was down, turning it off now`,
      );
      this.#schedule(key, run, deadline - Date.now());
    }
    const arm = () => {
      this.#deadlines[key] = Date.now() + minutes * 60_000;
      this.#save();
      this.#schedule(key, run, minutes * 60_000);
    };
    return (on) => {
      if (on) {
        arm();
        return true;
      }
      return this.#clear(key);
    };
  }

  // drops the saved deadlines no accessory uses
  prune(): void {
    for (const key of Object.keys(this.#deadlines)) {
      if (!this.#bound.has(key)) {
        this.#log.warn(
          `${key}: dropping a saved timer that is no longer configured`,
        );
        this.#clear(key);
      }
    }
  }

  // true when there was a deadline
  #clear(key: string): boolean {
    const timer = this.#timers.get(key);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.#timers.delete(key);
    }
    if (!(key in this.#deadlines)) {
      return false;
    }
    delete this.#deadlines[key];
    this.#save();
    return true;
  }

  // the file keeps every deadline for the next run
  stop(): void {
    for (const timer of this.#timers.values()) {
      clearTimeout(timer);
    }
    this.#timers.clear();
    this.#stopped += 1;
  }

  #schedule(key: string, run: () => void, ms: number): void {
    const timer = this.#timers.get(key);
    if (timer !== undefined) {
      clearTimeout(timer);
    }
    this.#timers.set(key, setTimeout(run, Math.max(0, ms)).unref());
  }

  #save(): void {
    try {
      saveJson(this.#file, this.#deadlines);
    } catch (error) {
      this.#log.warn(`could not save the off timers: ${String(error)}`);
    }
  }
}
