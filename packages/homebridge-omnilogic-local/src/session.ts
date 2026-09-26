import { EventEmitter } from "node:events";

import type { OmniLogic } from "@rygine/omnilogic-local-sdk";
import type { Logging } from "homebridge";

// the delays after a write before each re-read
const SETTLE_MS = [2000, 10000, 30000, 60000];
// the interval between reads while a filter primes
const PRIMING_POLL_MS = 10000;
// the delay after priming ends before a pump takes commands again
const PRIMING_GRACE_MS = 30000;

export class ControllerSession extends EventEmitter<{
  refreshed: [];
  fault: [boolean];
}> {
  omni: OmniLogic;
  faulted = false;
  #pollInterval: number;
  #log: Logging;
  #timer: ReturnType<typeof setInterval> | null = null;
  #settle: ReturnType<typeof setTimeout>[] = [];
  #primingPoll: ReturnType<typeof setTimeout> | null = null;
  #pumpsLockedUntil = Number.NEGATIVE_INFINITY;
  #read = false;
  #stopped = false;
  #inFlight: Promise<boolean> | null = null;

  constructor(
    omni: OmniLogic,
    options: { pollInterval: number; log: Logging },
  ) {
    super();
    this.omni = omni;
    this.#pollInterval = options.pollInterval;
    this.#log = options.log;
  }

  // overlapping reads share the one in flight
  refresh(): Promise<boolean> {
    if (this.#inFlight) {
      return this.#inFlight;
    }
    const run = this.#refreshNow().finally(() => {
      this.#inFlight = null;
    });
    this.#inFlight = run;
    return run;
  }

  async #refreshNow(): Promise<boolean> {
    let ok: boolean;
    try {
      await this.omni.refresh();
      this.#read = true;
      if (this.faulted) {
        this.faulted = false;
        this.#log.info("controller answering again");
        this.emit("fault", false);
      }
      const priming = this.#priming();
      if (priming !== undefined) {
        if (Date.now() >= this.#pumpsLockedUntil) {
          this.lockPumps(this.primingSeconds(priming.equipmentId));
        } else {
          // priming is already under way
          this.lockPumps(0);
        }
      }
      ok = true;
    } catch (error) {
      if (!this.faulted) {
        this.faulted = true;
        this.#log.warn(`controller not answering: ${String(error)}`);
        this.emit("fault", true);
      }
      ok = false;
    }
    this.#clearPrimingPoll();
    if (!this.#stopped && this.#priming() !== undefined) {
      this.#primingPoll = setTimeout(this.#poll, PRIMING_POLL_MS);
    }
    if (ok) {
      this.emit("refreshed");
    }
    return ok;
  }

  // the scheduled read
  #poll = (): void => {
    this.refresh().catch((error: unknown) => {
      this.#log.warn(`a poll failed: ${String(error)}`);
    });
  };

  start(): void {
    this.#stopped = false;
    this.#poll();
    this.#timer = setInterval(this.#poll, this.#pollInterval * 1000);
  }

  stop(): void {
    this.#stopped = true;
    if (this.#timer !== null) {
      clearInterval(this.#timer);
      this.#timer = null;
    }
    this.#clearSettle();
    this.#clearPrimingPoll();
  }

  #priming() {
    return this.#read
      ? this.omni.backyard.bodies.map((b) => b.filter).find((f) => f?.isPriming)
      : undefined;
  }

  #clearPrimingPoll(): void {
    if (this.#primingPoll !== null) {
      clearTimeout(this.#primingPoll);
      this.#primingPoll = null;
    }
  }

  // seconds, 0 when the filter does not prime
  primingSeconds(filterId: number): number {
    const filter = this.omni.config.backyard.bodiesOfWater.find(
      (b) => b.filter?.systemId === filterId,
    )?.filter;
    return filter?.primingEnabled === true ? filter.primingDuration : 0;
  }

  lockPumps(primingSeconds: number): void {
    this.#pumpsLockedUntil = Math.max(
      this.#pumpsLockedUntil,
      Date.now() + primingSeconds * 1000 + PRIMING_GRACE_MS,
    );
  }

  pumpsSettling(): boolean {
    return this.#priming() !== undefined || Date.now() < this.#pumpsLockedUntil;
  }

  #clearSettle(): void {
    for (const timer of this.#settle) {
      clearTimeout(timer);
    }
    this.#settle = [];
  }

  // the reads after a write, shared by writes in quick succession
  async write(fn: () => Promise<unknown>): Promise<void> {
    try {
      await fn();
    } finally {
      // a write that failed may still have been applied
      this.#clearSettle();
      if (!this.#stopped) {
        this.#settle = SETTLE_MS.map((ms) => setTimeout(this.#poll, ms));
      }
    }
  }
}
