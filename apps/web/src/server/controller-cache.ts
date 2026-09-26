import { OmniLogic } from "@rygine/omnilogic-local-sdk";

import { toWebAppError } from "@/server/errors";
import { logAccess } from "@/server/log/logger";
import { controllerKey, observePriming } from "@/server/transitions";

// seconds the configuration and telemetry serve reads before a refresh
const CACHE_TTL_SECONDS = 10;

type Entry = {
  key: string;
  omni: OmniLogic;
  refreshInFlight: Promise<void> | null;
  refreshForced: boolean;
};

// one session per controller
const entries = new Map<string, Entry>();

// logs one controller access and rethrows an error as a WebAppError
const logged = async <T>(op: string, run: () => Promise<T>): Promise<T> => {
  const started = Date.now();
  try {
    const result = await run();
    logAccess(op, true, Date.now() - started);
    return result;
  } catch (error) {
    logAccess(op, false, Date.now() - started, error);
    throw toWebAppError(error);
  }
};

const entryFor = (host: string, port: number): Entry => {
  const key = controllerKey(host, port);
  let entry = entries.get(key);
  if (entry === undefined) {
    entry = {
      key,
      omni: new OmniLogic({ host, port, cacheTTL: CACHE_TTL_SECONDS }),
      refreshInFlight: null,
      refreshForced: false,
    };
    entries.set(key, entry);
  }
  return entry;
};

// one refresh per controller at a time, and a forced refresh never settles for an unforced one
const refreshEntry = async (entry: Entry, force: boolean): Promise<void> => {
  const inFlight = entry.refreshInFlight;
  if (inFlight && (!force || entry.refreshForced)) {
    await inFlight;
    return;
  }
  entry.refreshForced = force;
  const mine = (async () => {
    await inFlight?.catch(() => {});
    await entry.omni.refresh({ refetch: force });
    observePriming(entry.key, entry.omni);
  })();
  entry.refreshInFlight = mine;
  try {
    await mine;
  } finally {
    if (entry.refreshInFlight === mine) {
      entry.refreshInFlight = null;
    }
  }
};

// runs fn against configuration and telemetry no older than the cache window
export const readController = async <T>(
  host: string,
  port: number,
  fn: (omni: OmniLogic) => Promise<T>,
  op = "read",
  // re-read now, inside the cache window
  force = false,
): Promise<T> => {
  return logged(op, async () => {
    const entry = entryFor(host, port);
    await refreshEntry(entry, force);
    return fn(entry.omni);
  });
};

// a write is checked against configuration and telemetry no older than the cache window
export const writeController = <T>(
  host: string,
  port: number,
  fn: (omni: OmniLogic) => Promise<T>,
  op = "write",
): Promise<T> => readController(host, port, fn, op);
