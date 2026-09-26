import { callServerFn, validateServerFn } from "@tests/server/support";
import { vi } from "vitest";

import type { LogQueryResult } from "@/server/log/query";

const result: LogQueryResult = {
  entries: [
    {
      time: new Date("2026-08-30T00:00:00.000Z"),
      op: "getWorld",
      ok: true,
      durationMs: 42,
    },
  ],
  total: 1,
  pageCount: 1,
};

const queryLogsSpy = vi.fn().mockResolvedValue(result);
vi.mock("@/server/log/query", () => ({
  queryLogs: (...args: unknown[]) => queryLogsSpy(...args),
}));

import { getLogs } from "./logs";

beforeEach(() => {
  queryLogsSpy.mockClear();
});

// the spy's call proves the fn ran with the parsed query
it("passes the parsed query through to queryLogs", async () => {
  await callServerFn(getLogs, { page: 1 });
  expect(queryLogsSpy).toHaveBeenCalledWith({ page: 1 });
});

it("refuses a page size past the cap", async () => {
  await expect(validateServerFn(getLogs, { pageSize: 501 })).rejects.toThrow(
    /pageSize/,
  );
});
