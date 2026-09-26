import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";
import type { LogRow } from "@/server/log/logger";
import { isStringArray } from "@/shared/guards";
import type { LogSortKey, SortDirection } from "@/shared/log-sort";

const LOG_PAGE_SIZE = 100;

// one controller access, as the page reads it
export type LogEntry = {
  time: Date;
  // the operation, such as getWorld or setFilterSpeed
  op: string;
  ok: boolean;
  durationMs: number;
  errors?: string[];
};

type LogQuery = {
  // only successes (true) or only failures (false), both when unset
  ok?: boolean;
  // only these operations, any when unset or empty
  ops?: string[];
  // newest first by default
  sort?: LogSortKey;
  dir?: SortDirection;
  page?: number;
  pageSize?: number;
};

export type LogQueryResult = {
  entries: LogEntry[];
  total: number;
  pageCount: number;
};

const errorsOf = (value: string | null): string[] | undefined => {
  try {
    const parsed: unknown = JSON.parse(value ?? "null");
    return isStringArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

const toEntry = (row: LogRow): LogEntry | undefined => {
  const time = new Date(row.time);
  if (Number.isNaN(time.getTime())) {
    return undefined;
  }
  return {
    time,
    op: row.op,
    ok: row.ok,
    durationMs: row.durationMs,
    errors: errorsOf(row.errors),
  };
};

export const queryLogs = async (
  query: LogQuery = {},
  client: PrismaClient = prisma,
): Promise<LogQueryResult> => {
  const page = Math.max(query.page ?? 1, 1);
  const pageSize = Math.max(query.pageSize ?? LOG_PAGE_SIZE, 1);

  const where: Prisma.LogWhereInput = {
    ...(query.ok !== undefined ? { ok: query.ok } : {}),
    ...(query.ops && query.ops.length > 0 ? { op: { in: query.ops } } : {}),
  };

  // insertion order breaks ties
  const sort = query.sort ?? "time";
  const dir = query.dir ?? (sort === "time" ? "desc" : "asc");
  const [total, rows] = await Promise.all([
    client.log.count({ where }),
    client.log.findMany({
      where,
      orderBy: [{ [sort]: dir }, { id: dir }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    entries: rows
      .map(toEntry)
      .filter((entry): entry is LogEntry => entry !== undefined),
    total,
    pageCount: Math.ceil(total / pageSize),
  };
};

// every operation the log has a row for
export const listLogOperations = async (
  client: PrismaClient = prisma,
): Promise<string[]> => {
  const rows = await client.log.findMany({
    distinct: ["op"],
    select: { op: true },
    orderBy: { op: "asc" },
  });
  return rows.map((row) => row.op);
};
