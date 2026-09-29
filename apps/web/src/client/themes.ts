import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";

import {
  clearCountdownTimers,
  scheduleCountdownTimers,
} from "@/client/countdown-timers";
import {
  READ_QUERY_DEFAULTS,
  pollUntilFailure,
  queryKeys,
} from "@/client/queries";
import { formatDuration } from "@/client/schedule-format";
import { useSettings } from "@/client/settings";
import { createStoredValue, type StoredValue } from "@/client/stored";
import {
  activateTheme,
  createTheme,
  deleteTheme,
  getThemes,
  renameTheme,
} from "@/server/fns/themes";
import type { ThemeSummary } from "@/server/serializers";
import { messageOf } from "@/shared/log";

const themesQueryKey = (host: string, port: number) =>
  ["themes", host, port] as const;

// polled on the refresh cadence, like the world
export const useThemes = (): UseQueryResult<ThemeSummary[]> => {
  const { host, port, refreshSeconds } = useSettings();
  return useQuery({
    queryKey: themesQueryKey(host, port),
    queryFn: () => getThemes({ data: { host, port } }),
    enabled: !!host,
    ...READ_QUERY_DEFAULTS,
    refetchInterval: pollUntilFailure(refreshSeconds * 1000),
  });
};

// a loading notification for a theme write, which takes about 15 s
const notify = (id: string, message: string) =>
  notifications.show({ id, message, loading: true, autoClose: false });
const done = (id: string, message: string) =>
  notifications.update({
    id,
    message,
    loading: false,
    color: "green",
    autoClose: 3000,
  });
const failed = (id: string, message: string) =>
  notifications.update({
    id,
    message,
    loading: false,
    color: "red",
    autoClose: 6000,
  });

const useInvalidateThemes = () => {
  const { host, port } = useSettings();
  const qc = useQueryClient();
  return () =>
    void qc.invalidateQueries({ queryKey: themesQueryKey(host, port) });
};

// the countdown this browser started on a theme
export type ThemeCountdown = { at: number; endsAt: number };
const countdowns = new Map<string, StoredValue<ThemeCountdown | null>>();
const countdownKey = (host: string, port: number, themeId: number) =>
  `theme-countdown:${host}:${String(port)}:${String(themeId)}`;
const countdownStore = (key: string): StoredValue<ThemeCountdown | null> => {
  let store = countdowns.get(key);
  if (store === undefined) {
    store = createStoredValue<ThemeCountdown | null>({
      key,
      fallback: null,
      parse: (raw) => {
        const v = JSON.parse(raw);
        return typeof v.at === "number" && typeof v.endsAt === "number"
          ? { at: v.at, endsAt: v.endsAt }
          : undefined;
      },
      serialize: JSON.stringify,
    });
    countdowns.set(key, store);
  }
  return store;
};
export const useThemeCountdown = (themeId: number): ThemeCountdown | null => {
  const { host, port } = useSettings();
  return countdownStore(countdownKey(host, port, themeId)).use();
};

// runs or stops a theme, under a countdown when minutes is given
export const useActivateTheme = () => {
  const settings = useSettings();
  const invalidate = useInvalidateThemes();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { theme: ThemeSummary; on: boolean; minutes?: number }) =>
      activateTheme({
        data: {
          ...settings,
          themeId: v.theme.id,
          on: v.on,
          minutes: v.minutes,
        },
      }),
    onMutate: (v) =>
      notify(
        "theme-activate",
        `${v.on ? "Activating" : "Deactivating"} “${v.theme.name}”${v.minutes === undefined ? "" : ` for ${formatDuration(v.minutes)}`}…`,
      ),
    onSuccess: (_d, v) => {
      const themesKey = themesQueryKey(settings.host, settings.port);
      // running one theme ends every other, and a stop ends this one
      const setActive = (on: boolean) =>
        qc.setQueryData<ThemeSummary[]>(themesKey, (list) =>
          list?.map((t) => ({
            ...t,
            active: t.id === v.theme.id ? on : t.active && !on,
          })),
        );
      setActive(v.on);
      const key = countdownKey(settings.host, settings.port, v.theme.id);
      if (v.minutes === undefined) {
        countdownStore(key).set(null);
        clearCountdownTimers([key]);
      } else {
        const at = Date.now();
        const durationMs = v.minutes * 60_000;
        countdownStore(key).set({ at, endsAt: at + durationMs });
        // shows the theme off once its countdown ends
        scheduleCountdownTimers(
          [key],
          [{ at: durationMs, run: () => setActive(false) }],
        );
      }
      done(
        "theme-activate",
        `“${v.theme.name}” ${v.on ? "activated" : "deactivated"}.`,
      );
    },
    onError: (e) => failed("theme-activate", messageOf(e)),
    // running a theme moves equipment
    onSettled: () => {
      invalidate();
      void qc.invalidateQueries({
        queryKey: queryKeys.world(settings.host, settings.port),
      });
    },
  });
};

export const useCreateTheme = () => {
  const settings = useSettings();
  const invalidate = useInvalidateThemes();
  return useMutation({
    mutationFn: (name: string) => createTheme({ data: { ...settings, name } }),
    onMutate: () =>
      notify("theme-create", "Saving current state as a new theme…"),
    onSuccess: (t) => done("theme-create", `Theme “${t.name}” saved.`),
    onError: (e) => failed("theme-create", messageOf(e)),
    onSettled: invalidate,
  });
};

export const useDeleteTheme = () => {
  const settings = useSettings();
  const invalidate = useInvalidateThemes();
  return useMutation({
    mutationFn: (theme: ThemeSummary) =>
      deleteTheme({ data: { ...settings, themeId: theme.id } }),
    onMutate: (theme) => notify("theme-delete", `Deleting “${theme.name}”…`),
    onSuccess: (_d, theme) =>
      done("theme-delete", `Theme “${theme.name}” deleted.`),
    onError: (e) => failed("theme-delete", messageOf(e)),
    onSettled: invalidate,
  });
};

// a quick write with no loading notification
export const useRenameTheme = () => {
  const settings = useSettings();
  const invalidate = useInvalidateThemes();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { theme: ThemeSummary; name: string }) =>
      renameTheme({ data: { ...settings, themeId: v.theme.id, name: v.name } }),
    onSuccess: (_d, v) => {
      qc.setQueryData<ThemeSummary[]>(
        themesQueryKey(settings.host, settings.port),
        (list) =>
          list?.map((t) => (t.id === v.theme.id ? { ...t, name: v.name } : t)),
      );
      notifications.show({
        message: `Renamed to “${v.name}”.`,
        color: "green",
      });
    },
    onError: (e) =>
      notifications.show({
        message: messageOf(e),
        color: "red",
        autoClose: 6000,
      }),
    onSettled: invalidate,
  });
};
