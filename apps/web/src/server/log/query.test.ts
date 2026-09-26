import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { vi } from "vitest";

const { findMany, count } = vi.hoisted(() => ({
  findMany: vi.fn(),
  count: vi.fn(),
}));
vi.mock("@/server/db/prisma", () => ({
  prisma: { log: { findMany, count } },
}));

import { PrismaClient } from "@/generated/prisma/client";

import { listLogOperations, queryLogs } from "./query";

const rows = [
  {
    id: 2,
    time: "2026-08-06T11:00:00.000Z",
    op: "deleteItem",
    ok: true,
    durationMs: 12,
    errors: null,
  },
  {
    id: 1,
    time: "2026-08-06T10:00:00.000Z",
    op: "getWorld",
    ok: false,
    durationMs: 9000,
    errors: JSON.stringify(["boom"]),
  },
];

it("returns parsed entries with a total and computed page count", async () => {
  findMany.mockResolvedValue(rows);
  count.mockResolvedValue(2);

  const result = await queryLogs({});

  expect(result.total).toBe(2);
  expect(result.pageCount).toBe(1);
  expect(result.entries).toHaveLength(2);
  expect(result.entries[0]!.time).toBeInstanceOf(Date);
  expect(result.entries[0]!.time.toISOString()).toBe(
    "2026-08-06T11:00:00.000Z",
  );
  expect(result.entries[0]).toMatchObject({
    op: "deleteItem",
    ok: true,
    durationMs: 12,
  });
  expect(result.entries[1]!.errors).toEqual(["boom"]);
});

// against a real SQLite file
describe("queryLogs against a real SQLite database", () => {
  let client: PrismaClient;
  let dir: string;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), "query-test-"));
    const adapter = new PrismaBetterSqlite3({
      url: `file:${join(dir, "test.db")}`,
    });
    client = new PrismaClient({ adapter });
    // the Log model's table
    await client.$executeRawUnsafe(`
      CREATE TABLE "logs" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "time" TEXT NOT NULL,
        "op" TEXT NOT NULL,
        "ok" BOOLEAN NOT NULL,
        "durationMs" INTEGER NOT NULL,
        "errors" TEXT
      )
    `);
    await client.log.createMany({
      data: [
        {
          time: "2026-08-05T10:00:00.000Z",
          op: "getWorld",
          ok: true,
          durationMs: 40,
        },
        {
          time: "2026-08-05T11:00:00.000Z",
          op: "getTelemetry",
          ok: false,
          durationMs: 9000,
        },
        {
          time: "2026-08-06T10:00:00.000Z",
          op: "setFilterSpeed",
          ok: false,
          durationMs: 8000,
        },
        {
          time: "2026-08-06T11:00:00.000Z",
          op: "setChlorinator100%",
          ok: true,
          durationMs: 55,
        },
      ],
    });
  });

  afterAll(async () => {
    await client.$disconnect();
    rmSync(dir, { recursive: true, force: true });
  });

  it("filters to failures or successes", async () => {
    const failed = await queryLogs({ ok: false }, client);
    expect(failed.entries.map((entry) => entry.op).toSorted()).toEqual(
      ["getTelemetry", "setFilterSpeed"].toSorted(),
    );
    const succeeded = await queryLogs({ ok: true }, client);
    expect(succeeded.total).toBe(2);
  });

  it("filters to any of several operations", async () => {
    const { entries } = await queryLogs(
      { ops: ["getWorld", "setFilterSpeed"] },
      client,
    );
    expect(entries.map((entry) => entry.op).toSorted()).toEqual([
      "getWorld",
      "setFilterSpeed",
    ]);
  });

  it("combines filters", async () => {
    const { entries } = await queryLogs(
      { ops: ["getWorld", "setFilterSpeed"], ok: false },
      client,
    );
    expect(entries.map((entry) => entry.op)).toEqual(["setFilterSpeed"]);
  });

  it("sorts by a column in either direction, newest first by default", async () => {
    const byDefault = await queryLogs({}, client);
    expect(byDefault.entries[0]?.op).toBe("setChlorinator100%");
    const slowest = await queryLogs(
      { sort: "durationMs", dir: "desc" },
      client,
    );
    expect(slowest.entries.map((entry) => entry.durationMs)).toEqual([
      9000, 8000, 55, 40,
    ]);
    const byName = await queryLogs({ sort: "op" }, client);
    expect(byName.entries.map((entry) => entry.op)).toEqual([
      "getTelemetry",
      "getWorld",
      "setChlorinator100%",
      "setFilterSpeed",
    ]);
  });

  it("lists every distinct operation", async () => {
    expect(await listLogOperations(client)).toEqual([
      "getTelemetry",
      "getWorld",
      "setChlorinator100%",
      "setFilterSpeed",
    ]);
  });
});
