import type { OmniLogic } from "@rygine/omnilogic-local-sdk";
import { vi } from "vitest";

const { findUnique, upsert, readController } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  upsert: vi.fn(),
  readController: vi.fn(),
}));
vi.mock("@/server/db/prisma", () => ({
  prisma: { storedSetting: { findUnique, upsert } },
}));
vi.mock("@/server/controller-cache", () => ({ readController }));

import {
  findStored,
  patchStored,
  readStoredSetting,
  storeSetting,
} from "./stored";

const target = { host: "h", port: 1 };
const where = { host_port_key: { host: "h", port: 1, key: "panel" } };
const value = { beeper: true, backLight: false };
const row = {
  ...target,
  key: "panel",
  json: JSON.stringify(value),
  readAt: "2026-09-01T00:00:00.000Z",
};
const omni = {} as OmniLogic;

beforeEach(() => {
  findUnique.mockReset();
  upsert.mockReset().mockResolvedValue(undefined);
  readController
    .mockReset()
    .mockImplementation(
      (_h: string, _p: number, fn: (o: OmniLogic) => unknown) => fn(omni),
    );
});

describe("findStored", () => {
  it("returns the parsed row with its readAt", async () => {
    findUnique.mockResolvedValue(row);
    expect(await findStored(target, "panel")).toEqual({
      value,
      readAt: row.readAt,
    });
    expect(findUnique).toHaveBeenCalledWith({ where });
  });

  it("returns null when nothing is stored", async () => {
    findUnique.mockResolvedValue(null);
    expect(await findStored(target, "panel")).toBeNull();
  });
});

describe("storeSetting", () => {
  it("upserts the value as JSON, stamped now", async () => {
    const stored = await storeSetting(target, "panel", value);
    expect(stored.value).toEqual(value);
    expect(Date.now() - new Date(stored.readAt).getTime()).toBeLessThan(5000);
    expect(upsert).toHaveBeenCalledWith({
      where,
      create: {
        ...target,
        key: "panel",
        json: JSON.stringify(value),
        readAt: stored.readAt,
      },
      update: { json: JSON.stringify(value), readAt: stored.readAt },
    });
  });
});

describe("patchStored", () => {
  it("merges the patch into the stored object", async () => {
    findUnique.mockResolvedValue(row);
    await patchStored(target, "panel", { backLight: true });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          json: JSON.stringify({ beeper: true, backLight: true }),
        }),
      }),
    );
  });

  it("does nothing when nothing is stored", async () => {
    findUnique.mockResolvedValue(null);
    await patchStored(target, "panel", { backLight: true });
    expect(upsert).not.toHaveBeenCalled();
  });
});

describe("readStoredSetting", () => {
  const read = vi.fn(() => Promise.resolve(value));
  beforeEach(() => read.mockClear());

  it("serves the stored row without touching the controller", async () => {
    findUnique.mockResolvedValue(row);
    const result = await readStoredSetting(target, "panel", false, "op", read);
    expect(result).toEqual({ value, readAt: row.readAt });
    expect(readController).not.toHaveBeenCalled();
    expect(read).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it("reads the controller through the cache and stores the row when nothing is stored", async () => {
    findUnique.mockResolvedValue(null);
    const result = await readStoredSetting(target, "panel", false, "op", read);
    expect(readController).toHaveBeenCalledWith(
      "h",
      1,
      expect.any(Function),
      "op",
      false,
    );
    expect(read).toHaveBeenCalledWith(omni);
    expect(result.value).toEqual(value);
    expect(upsert).toHaveBeenCalledTimes(1);
  });

  it("re-reads on request without consulting the store", async () => {
    await readStoredSetting(target, "panel", true, "op", read);
    expect(findUnique).not.toHaveBeenCalled();
    expect(read).toHaveBeenCalledTimes(1);
    expect(upsert).toHaveBeenCalledTimes(1);
    // the configuration and telemetry are refetched too
    expect(readController).toHaveBeenCalledWith(
      "h",
      1,
      expect.any(Function),
      "op",
      true,
    );
  });
});
