import { vi } from "vitest";

const { logAccess, refreshMock } = vi.hoisted(() => ({
  logAccess: vi.fn(),
  refreshMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/log/logger", () => ({ logAccess }));

vi.mock("@rygine/omnilogic-local-sdk", () => ({
  OmniLogic: class {
    refresh = refreshMock;
    // a refresh looks at the filters for one that primes
    backyard = { bodies: [] };
  },
}));

import { readController, writeController } from "./controller-cache";

beforeEach(() => {
  logAccess.mockClear();
  refreshMock.mockClear().mockResolvedValue(undefined);
});

it("logs a successful read with op, ok, and durationMs", async () => {
  const result = await readController("h", 1, async () => "ok", "getWorld");

  expect(result).toBe("ok");
  expect(logAccess).toHaveBeenCalledTimes(1);
  expect(logAccess).toHaveBeenCalledWith("getWorld", true, expect.any(Number));
});

it("logs a failed read and re-throws", async () => {
  const boom = new Error("boom");

  await expect(
    readController(
      "h",
      2,
      async () => {
        throw boom;
      },
      "getWorld",
    ),
  ).rejects.toThrow("boom");

  expect(logAccess).toHaveBeenCalledTimes(1);
  expect(logAccess).toHaveBeenCalledWith(
    "getWorld",
    false,
    expect.any(Number),
    boom,
  );
});

it("defaults op to 'read' for readController and 'write' for writeController", async () => {
  await readController("h", 3, async () => "ok");
  expect(logAccess.mock.calls[0]![0]).toBe("read");

  logAccess.mockClear();

  await writeController("h", 3, async () => "ok");
  expect(logAccess.mock.calls[0]![0]).toBe("write");
});

it("logs a successful write with the given op", async () => {
  const result = await writeController(
    "h",
    4,
    async () => "written",
    "setFilterSpeed",
  );

  expect(result).toBe("written");
  expect(logAccess).toHaveBeenCalledWith(
    "setFilterSpeed",
    true,
    expect.any(Number),
  );
});

it("logs a failed write and re-throws", async () => {
  const boom = new Error("write boom");

  await expect(
    writeController(
      "h",
      5,
      async () => {
        throw boom;
      },
      "setFilterSpeed",
    ),
  ).rejects.toThrow("write boom");

  expect(logAccess).toHaveBeenCalledWith(
    "setFilterSpeed",
    false,
    expect.any(Number),
    boom,
  );
});

// a forced read never settles for an unforced refresh already in flight
it("a forced read chains behind an in-flight refresh instead of joining it", async () => {
  const gate = Promise.withResolvers<void>();
  refreshMock.mockImplementationOnce(() => gate.promise);

  const pending = readController("h", 6, async () => "pending");
  await Promise.resolve();
  const forced = readController("h", 6, async () => "forced", "read", true);
  expect(refreshMock).toHaveBeenCalledTimes(1);

  gate.resolve();
  await expect(pending).resolves.toBe("pending");
  await expect(forced).resolves.toBe("forced");
  expect(refreshMock).toHaveBeenCalledTimes(2);
  expect(refreshMock.mock.calls[0]![0]).toEqual({ refetch: false });
  expect(refreshMock.mock.calls[1]![0]).toEqual({ refetch: true });
});
