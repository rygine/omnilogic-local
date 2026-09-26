import { createStoredValue } from "@/client/stored";
import { isOneOf } from "@/shared/guards";

// Mantine's six notification positions
export const NOTIFICATION_POSITIONS = [
  "top-left",
  "top-center",
  "top-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
] as const;
export type NotificationPosition = (typeof NOTIFICATION_POSITIONS)[number];

const isNotificationPosition = isOneOf([...NOTIFICATION_POSITIONS]);

type Settings = {
  host: string;
  port: number;
  // the interval between reads of the controller, in seconds
  refreshSeconds: number;
  notificationPosition: NotificationPosition;
};

// the connection, what the Controller form edits
export type Connection = Pick<Settings, "host" | "port">;

const DEFAULT_REFRESH_SECONDS = 30;

const DEFAULTS: Settings = {
  host: "",
  port: 10444,
  refreshSeconds: DEFAULT_REFRESH_SECONDS,
  notificationPosition: "top-right",
};

const store = createStoredValue<Settings>({
  key: "omni.settings",
  fallback: DEFAULTS,
  parse: (raw) => {
    const parsed = JSON.parse(raw);
    return {
      host: typeof parsed.host === "string" ? parsed.host : "",
      port:
        typeof parsed.port === "number" && Number.isFinite(parsed.port)
          ? parsed.port
          : 10444,
      refreshSeconds:
        typeof parsed.refreshSeconds === "number" &&
        Number.isFinite(parsed.refreshSeconds) &&
        parsed.refreshSeconds >= 5
          ? parsed.refreshSeconds
          : DEFAULT_REFRESH_SECONDS,
      notificationPosition: isNotificationPosition(parsed.notificationPosition)
        ? parsed.notificationPosition
        : DEFAULTS.notificationPosition,
    };
  },
  serialize: JSON.stringify,
});

export const getSettings = store.get;
export const setSettings = store.set;
export const useSettings = store.use;

export const hasSettings = (s: Settings): boolean => {
  return s.host.trim().length > 0;
};
