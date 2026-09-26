import { vi } from "vitest";

const { create } = vi.hoisted(() => ({
  create: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/server/db/prisma", () => ({ prisma: { log: { create } } }));

import { logAccess } from "./logger";

beforeEach(() => {
  create.mockClear();
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

it("persists a row with the access columns", async () => {
  logAccess("getWorld", true, 42);
  await Promise.resolve();
  const row = create.mock.calls[0]![0].data;
  expect(row).toMatchObject({
    op: "getWorld",
    ok: true,
    durationMs: 42,
    errors: null,
  });
});

it("stores a failure's error", async () => {
  logAccess("getWorld", false, 9000, new Error("boom"));
  await Promise.resolve();
  const row = create.mock.calls[0]![0].data;
  expect(row.ok).toBe(false);
  expect(JSON.parse(row.errors)[0]).toContain("boom");
});

// LOG_LEVEL quiets the console, never the Logs page
it("stores the row whatever LOG_LEVEL keeps off the console", async () => {
  vi.stubEnv("LOG_LEVEL", "off");
  logAccess("getWorld", true, 42);
  logAccess("getWorld", false, 42, new Error("boom"));
  await Promise.resolve();
  expect(create).toHaveBeenCalledTimes(2);
  expect(console.info).not.toHaveBeenCalled();
  expect(console.error).not.toHaveBeenCalled();
});

it("writes the console line at or above LOG_LEVEL", () => {
  vi.stubEnv("LOG_LEVEL", "warn");
  logAccess("getWorld", true, 42);
  logAccess("getWorld", false, 42, new Error("boom"));
  expect(console.info).not.toHaveBeenCalled();
  expect(console.error).toHaveBeenCalledTimes(1);
});
