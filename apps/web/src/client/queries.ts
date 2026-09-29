import {
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";

import {
  getCountdownRemaining,
  getHeaterAutoDifferential,
  getSuperchlorinateRemaining,
} from "@/server/fns/bow";
import {
  getChlorinatorDiagnostics,
  getFilterDiagnostics,
  type DiagEntry,
} from "@/server/fns/diagnostics";
import { getPanelSettings, type PanelSettings } from "@/server/fns/panel";
import { getCoordinates, type Coordinates } from "@/server/fns/system";
import { getWorld } from "@/server/fns/world";
import type {
  BowDetail,
  FavoriteSummary,
  ScheduleSummary,
  WorldData,
} from "@/server/serializers";
import type { Stored } from "@/server/stored";

import { useSettings } from "./settings";
import { formatCountdown, useNow } from "./tick";

export const queryKeys = {
  world: (host: string, port: number) => ["world", host, port] as const,
  panel: (host: string, port: number) => ["panel", host, port] as const,
  coordinates: (host: string, port: number) =>
    ["coordinates", host, port] as const,
  heaterDifferential: (host: string, port: number, bowId: number) =>
    ["heater-differential", host, port, bowId] as const,
};

// re-reads the world now, past the SDK's cache window
export const refreshWorldFresh = async (
  qc: QueryClient,
  host: string,
  port: number,
): Promise<void> => {
  if (!host) {
    return;
  }
  try {
    const world = await getWorld({ data: { host, port, fresh: true } });
    qc.setQueryData(queryKeys.world(host, port), world);
  } catch {
    // a failed refresh keeps the last world
  }
};

export const READ_QUERY_DEFAULTS = {
  staleTime: Infinity,
  gcTime: Infinity,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  refetchOnReconnect: false,
} as const;

// re-reads every ms until a read fails, then waits for Try again
export const pollUntilFailure =
  (ms: number) =>
  (query: { state: { status: string } }): number | false =>
    query.state.status === "error" ? false : ms;

// the world, re-read on the refresh cadence while a page observes it
const useWorldSelect = <T>(
  select: (world: WorldData) => T,
): UseQueryResult<T> => {
  const { host, port, refreshSeconds } = useSettings();
  return useQuery({
    queryKey: queryKeys.world(host, port),
    queryFn: () => getWorld({ data: { host, port } }),
    enabled: !!host,
    select,
    ...READ_QUERY_DEFAULTS,
    refetchInterval: pollUntilFailure(refreshSeconds * 1000),
  });
};

const useWorldReady = (): boolean => useWorldSelect(() => true).isSuccess;

// when the world was last read, in ms, undefined before the first read
export const useWorldUpdatedAt = (): number | undefined => {
  const q = useWorldSelect(() => true);
  return q.isSuccess ? q.dataUpdatedAt : undefined;
};

export const useBows = (): UseQueryResult<BowDetail[]> => {
  return useWorldSelect((world) => world.bows);
};

export const useSchedules = (): UseQueryResult<ScheduleSummary[]> => {
  return useWorldSelect((world) => world.schedules);
};

export const useFavorites = (): UseQueryResult<FavoriteSummary[]> => {
  return useWorldSelect((world) => world.favorites);
};

// stored on the server, never polled
export const useCoordinates = (): UseQueryResult<Stored<Coordinates>> => {
  const { host, port } = useSettings();
  const ready = useWorldReady();
  return useQuery({
    queryKey: queryKeys.coordinates(host, port),
    queryFn: () => getCoordinates({ data: { host, port } }),
    enabled: !!host && ready,
    ...READ_QUERY_DEFAULTS,
  });
};

// stored on the server, never polled
export const usePanelSettings = (): UseQueryResult<Stored<PanelSettings>> => {
  const { host, port } = useSettings();
  const ready = useWorldReady();
  return useQuery({
    queryKey: queryKeys.panel(host, port),
    queryFn: () => getPanelSettings({ data: { host, port } }),
    enabled: !!host && ready,
    ...READ_QUERY_DEFAULTS,
  });
};

// the controller's mode, such as "Config Mode", null in normal operation and undefined until loaded
export const useSystemState = (): string | null | undefined =>
  useWorldSelect((world) => world.backyard.systemState).data;

export const useAirTemp = (): number | null | undefined => {
  return useWorldSelect((world) => world.backyard.airTemp).data;
};

// which device's diagnostics to read
export type DiagnosticsTarget = {
  kind: "filter" | "chlorinator";
  bowId: number;
};

// how long a diagnostics reading stays fresh
const DIAGNOSTICS_FRESH_MS = 60_000;

// read when the diagnostics panel opens, never polled
export const useDiagnostics = (
  target: DiagnosticsTarget,
): UseQueryResult<DiagEntry[]> => {
  const { host, port } = useSettings();
  return useQuery({
    queryKey: ["diagnostics", host, port, target.kind, target.bowId],
    queryFn: () =>
      target.kind === "filter"
        ? getFilterDiagnostics({ data: { host, port, bowId: target.bowId } })
        : getChlorinatorDiagnostics({
            data: { host, port, bowId: target.bowId },
          }),
    enabled: !!host,
    staleTime: DIAGNOSTICS_FRESH_MS,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: true,
    retry: false,
  });
};

// stored on the server, never polled
export const useHeaterAutoDifferential = (
  bowId: number,
  enabled: boolean,
): UseQueryResult<Stored<number>> => {
  const { host, port } = useSettings();
  const ready = useWorldReady();
  return useQuery({
    queryKey: queryKeys.heaterDifferential(host, port, bowId),
    queryFn: () => getHeaterAutoDifferential({ data: { host, port, bowId } }),
    enabled: !!host && enabled && ready,
    ...READ_QUERY_DEFAULTS,
  });
};

// shared with the mutations that seed and end a countdown
export const countdownQueryKey = (
  host: string,
  port: number,
  bowId: number,
  equipmentId: number,
) => ["countdown", host, port, bowId, equipmentId] as const;

// polled once a minute while enabled, ticked down between polls
export const useCountdownRemaining = (
  bowId: number,
  equipmentId: number,
  enabled: boolean,
): UseQueryResult<{ seconds: number }> => {
  const { host, port } = useSettings();
  const qc = useQueryClient();
  const key = countdownQueryKey(host, port, bowId, equipmentId);
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      const before = qc.getQueryData<{ seconds: number }>(key);
      const r = await getCountdownRemaining({
        data: { host, port, bowId, equipmentId },
      });
      // a countdown that ended turned its equipment off
      if (before !== undefined && before.seconds > 0 && r.seconds === 0) {
        void refreshWorldFresh(qc, host, port);
      }
      return r;
    },
    enabled: !!host && enabled,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });
};

// polled once a minute while a run is active, ticked down between polls
const useSuperchlorinateRemaining = (
  bowId: number,
  enabled: boolean,
): UseQueryResult<{ minutes: number }> => {
  const { host, port } = useSettings();
  return useQuery({
    queryKey: ["superchlorinate", host, port, bowId],
    queryFn: () => getSuperchlorinateRemaining({ data: { host, port, bowId } }),
    enabled: !!host && enabled,
    refetchInterval: 60 * 1000,
    staleTime: 0,
  });
};

// the run's time left in words, null until the first poll answers
export const useSuperchlorinateCountdown = (
  bowId: number,
  enabled: boolean,
): string | null => {
  const q = useSuperchlorinateRemaining(bowId, enabled);
  const now = useNow();
  return q.data == null
    ? null
    : formatCountdown(q.dataUpdatedAt + q.data.minutes * 60_000 - now);
};
