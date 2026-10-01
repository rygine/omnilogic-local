export type Log = Pick<Console, "debug" | "info" | "warn">;

const LEVELS = ["trace", "debug", "info", "warn", "error", "off"];

// the lowest level LOG_LEVEL lets through
const minimumLevel = () => {
  const i = LEVELS.indexOf(process.env.LOG_LEVEL ?? "");
  return i === -1 ? LEVELS.indexOf("warn") : i;
};

const logAt =
  (level: keyof Log) =>
  (...args: unknown[]) => {
    if (LEVELS.indexOf(level) >= minimumLevel()) {
      console[level](...args);
    }
  };

// the console, quiet below LOG_LEVEL
export const logger: Log = {
  debug: logAt("debug"),
  info: logAt("info"),
  warn: logAt("warn"),
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
