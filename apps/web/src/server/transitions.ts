import {
  type Light,
  type Filter,
  type OmniLogic,
} from "@rygine/omnilogic-local-sdk";

import { WebAppError } from "@/server/errors";
import { PRIMING_GRACE_MS } from "@/shared/priming";

// when each controller's pumps accept commands again
const lockedUntil = new Map<string, number>();
// the filter a write here started, per controller
const starting = new Map<string, { filterId: number; until: number }>();
// how long a started pump shows on without priming
const START_WINDOW_MS = 60_000;

export const controllerKey = (host: string, port: number): string =>
  `${host}:${port}`;

// the filters the controller has a telemetry row for
const filters = (omni: OmniLogic): Filter[] =>
  omni.backyard.bodies.flatMap((b) =>
    b.filter &&
    omni.telemetry.filters.some((r) => r.systemId === b.filter?.equipmentId)
      ? [b.filter]
      : [],
  );

const primingFilter = (omni: OmniLogic): Filter | undefined =>
  filters(omni).find((f) => f.isPriming);

const filterName = (omni: OmniLogic, filterId: number): string =>
  omni.config.backyard.bodiesOfWater.find(
    (b) => b.filter?.systemId === filterId,
  )?.filter?.name ?? "The filter pump";

// the filter's priming duration in seconds, 0 when it does not prime
export const primingSeconds = (omni: OmniLogic, filterId: number): number => {
  const filter = omni.config.backyard.bodiesOfWater.find(
    (b) => b.filter?.systemId === filterId,
  )?.filter;
  return filter?.primingEnabled === true ? filter.primingDuration : 0;
};

// the end of a priming run plus the grace, or of the fallback without priming
const untilMs = (primingSecondsForIt: number, fallbackMs: number): number =>
  Date.now() +
  (primingSecondsForIt > 0
    ? primingSecondsForIt * 1000 + PRIMING_GRACE_MS
    : fallbackMs);

// no pump is commanded for a priming run of this many seconds plus the grace
export const lockPumps = (key: string, seconds: number): void => {
  lockedUntil.set(
    key,
    Math.max(lockedUntil.get(key) ?? 0, untilMs(seconds, PRIMING_GRACE_MS)),
  );
};

// a start sent here, shown as on until the controller reports it, a stop, or the window ends
export const noteStart = (
  key: string,
  filterId: number,
  primingSecondsForIt: number,
): void => {
  starting.set(key, {
    filterId,
    until: untilMs(primingSecondsForIt, START_WINDOW_MS),
  });
};

export const clearStart = (key: string): void => {
  starting.delete(key);
};

// the filter a write here started that the controller has not reported yet
export const startingFilter = (key: string, omni: OmniLogic): number | null => {
  const s = starting.get(key);
  if (s === undefined) {
    return null;
  }
  const filter = filters(omni).find((f) => f.equipmentId === s.filterId);
  const reported =
    filter !== undefined && (filter.speed > 0 || filter.isPriming);
  if (reported || Date.now() >= s.until) {
    starting.delete(key);
    return null;
  }
  return s.filterId;
};

// locks the pumps for a priming run the controller reports
export const observePriming = (key: string, omni: OmniLogic): void => {
  const priming = primingFilter(omni);
  if (priming !== undefined && Date.now() >= (lockedUntil.get(key) ?? 0)) {
    lockPumps(key, primingSeconds(omni, priming.equipmentId));
  }
};

// how long the pumps refuse commands, in ms, null when they accept them
export const pumpsBusyFor = (key: string, omni: OmniLogic): number | null => {
  observePriming(key, omni);
  const left = (lockedUntil.get(key) ?? 0) - Date.now();
  return left > 0 ? left : null;
};

export const requireIdlePumps = (key: string, omni: OmniLogic): void => {
  const left = pumpsBusyFor(key, omni);
  if (left === null) {
    return;
  }
  const seconds = Math.ceil(left / 1000);
  const priming = primingFilter(omni);
  const what =
    priming === undefined
      ? "The pumps are settling after a start"
      : `${filterName(omni, priming.equipmentId)} is ${priming.status.toLowerCase()}`;
  throw new WebAppError(
    "BUSY",
    `${what}. Pump controls return in about ${seconds} s.`,
  );
};

// what a light between off and on is doing, in words, by its power state
const LIGHT_BUSY: Record<string, string> = {
  POWERING_OFF: "powering off",
  CHANGING_SHOW: "changing show",
  FIFTEEN_SECONDS_WHITE: "warming up",
  COOLDOWN: "cooling down",
};

export const lightBusyWord = (powerState: string): string | null =>
  powerState === "OFF" || powerState === "ACTIVE"
    ? null
    : (LIGHT_BUSY[powerState] ?? "changing");

// the controller drops a light command while the light is between off and on
export const requireSettledLight = (light: Light): void => {
  const word =
    light.state === undefined ? null : lightBusyWord(light.powerState);
  if (word !== null) {
    throw new WebAppError(
      "BUSY",
      `${light.name} is ${word}. Try again once it settles.`,
    );
  }
};

// for tests
export const resetPumpLocks = (): void => {
  lockedUntil.clear();
  starting.clear();
};
