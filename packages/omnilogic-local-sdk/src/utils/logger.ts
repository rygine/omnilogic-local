type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "off";

type EmittedLevel = Exclude<LogLevel, "off">;

type LogFields = Record<string, unknown>;

type Logger = Record<
  EmittedLevel,
  (message: string, fields?: LogFields) => void
>;

const LOG_RANK: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  off: 100,
};

const DEFAULT_LEVEL: LogLevel = "warn";

const isLogLevel = (value: unknown): value is LogLevel =>
  typeof value === "string" && Object.hasOwn(LOG_RANK, value);

const currentLevel = () => {
  const level = process.env.LOG_LEVEL;
  return isLogLevel(level) ? level : DEFAULT_LEVEL;
};

export const createLogger = (namespace: string): Logger => {
  const emit = (level: EmittedLevel, message: string, fields?: LogFields) => {
    if (LOG_RANK[level] < LOG_RANK[currentLevel()]) {
      return;
    }

    const errors: Error[] = [];
    let tail = "";
    for (const [key, value] of Object.entries(fields ?? {})) {
      if (value instanceof Error) {
        errors.push(value);
      } else {
        tail += ` ${key}=${String(value)}`;
      }
    }
    console.error(
      `${level.padEnd(5)} [${namespace}] ${message}${tail}`,
      ...errors,
    );
  };

  return {
    trace: (message, fields) => emit("trace", message, fields),
    debug: (message, fields) => emit("debug", message, fields),
    info: (message, fields) => emit("info", message, fields),
    warn: (message, fields) => emit("warn", message, fields),
    error: (message, fields) => emit("error", message, fields),
  };
};
