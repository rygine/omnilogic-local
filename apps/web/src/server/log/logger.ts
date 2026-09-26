import { prisma } from "@/server/db/prisma";
import { messageOf } from "@/shared/log";

// the columns as stored
export type LogRow = {
  time: string;
  op: string;
  ok: boolean;
  durationMs: number;
  errors: string | null;
};

const LOG_RANK: Record<string, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  off: 100,
};

// the console's log level, read on every call
const consoleRank = (): number =>
  LOG_RANK[process.env.LOG_LEVEL ?? ""] ?? LOG_RANK.debug!;

// logs one controller access to the console when LOG_LEVEL admits it, and always to the Logs page
export const logAccess = (
  op: string,
  ok: boolean,
  durationMs: number,
  error?: unknown,
): void => {
  const level = ok ? "info" : "error";
  if (LOG_RANK[level]! >= consoleRank()) {
    const tail = ok ? "" : ` error=${messageOf(error)}`;
    console[level](
      `${level.padEnd(5)} [controller] controller access${ok ? "" : " failed"} op=${op} durationMs=${durationMs} ok=${ok}${tail}`,
      ...(error instanceof Error ? [error] : []),
    );
  }
  const data: LogRow = {
    time: new Date().toISOString(),
    op,
    ok,
    durationMs,
    errors:
      error instanceof Error
        ? JSON.stringify([error.stack ?? error.message])
        : null,
  };
  void prisma.log.create({ data }).catch((e: unknown) => {
    console.error("log: database write failed", e);
  });
};
