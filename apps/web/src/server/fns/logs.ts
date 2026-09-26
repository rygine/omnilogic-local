import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { LOG_SORT_KEYS } from "@/shared/log-sort";

import { toWebAppError } from "../errors";
import {
  listLogOperations,
  queryLogs,
  type LogQueryResult,
} from "../log/query";

const logQueryArgs = z.object({
  ok: z.boolean().optional(),
  ops: z.array(z.string().min(1)).optional(),
  sort: z.enum(LOG_SORT_KEYS).optional(),
  dir: z.enum(["asc", "desc"]).optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().max(500).optional(),
});

export const getLogs = createServerFn({ method: "POST" })
  .validator(logQueryArgs)
  .handler(async ({ data }): Promise<LogQueryResult> => {
    try {
      return await queryLogs(data);
    } catch (err) {
      throw toWebAppError(err);
    }
  });

export const getLogOperations = createServerFn({ method: "GET" }).handler(
  async (): Promise<string[]> => {
    try {
      return await listLogOperations();
    } catch (err) {
      throw toWebAppError(err);
    }
  },
);
