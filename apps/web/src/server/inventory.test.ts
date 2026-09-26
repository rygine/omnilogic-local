import type { OmniLogic, SysInfo } from "@rygine/omnilogic-local-sdk";
import { vi } from "vitest";

const { findUnique, upsert } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  upsert: vi.fn(),
}));
vi.mock("@/server/db/prisma", () => ({
  prisma: { systemInventory: { findUnique, upsert } },
}));

import { readInventory } from "./inventory";

const info: SysInfo = {
  numComponents: 1,
  components: [
    {
      devName: "MSP",
      type: "MSP",
      hua: "00-1a-2b-3c-4d",
      version: "R0502000",
      nodeId: -1,
      systemId: 1,
      upgradeCapable: true,
    },
  ],
};

const getSysInfo = vi.fn();
// a controller reporting this firmware version, undefined when not known
const omniWith = (version: string | undefined) =>
  ({ mspVersion: version, fetchSysInfo: getSysInfo }) as unknown as OmniLogic;

const stored = {
  host: "h",
  port: 1,
  firmwareVersion: "R0502000",
  json: JSON.stringify(info),
  readAt: "2026-09-01T00:00:00.000Z",
};
const target = { host: "h", port: 1 };

beforeEach(() => {
  findUnique.mockReset();
  upsert.mockReset().mockResolvedValue(undefined);
  getSysInfo.mockReset().mockResolvedValue(info);
});

it("reads the controller and stores the row when nothing is stored", async () => {
  findUnique.mockResolvedValue(null);
  const result = await readInventory(omniWith("R0502000"), target);
  expect(getSysInfo).toHaveBeenCalledTimes(1);
  expect(result.info).toEqual(info);
  expect(upsert).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { host_port: target },
      create: expect.objectContaining({
        host: "h",
        port: 1,
        firmwareVersion: "R0502000",
        json: JSON.stringify(info),
        readAt: result.readAt,
      }),
    }),
  );
});

it("serves the stored row, without asking the controller, under the same firmware", async () => {
  findUnique.mockResolvedValue(stored);
  const result = await readInventory(omniWith("R0502000"), target);
  expect(getSysInfo).not.toHaveBeenCalled();
  expect(upsert).not.toHaveBeenCalled();
  expect(result).toEqual({ info, readAt: stored.readAt });
});

it("re-reads when telemetry reports a different firmware version", async () => {
  findUnique.mockResolvedValue(stored);
  await readInventory(omniWith("R0503000"), target);
  expect(getSysInfo).toHaveBeenCalledTimes(1);
  expect(upsert).toHaveBeenCalledWith(
    expect.objectContaining({
      update: expect.objectContaining({ firmwareVersion: "R0503000" }),
    }),
  );
});

it("re-reads a row stored before the firmware version was known", async () => {
  findUnique.mockResolvedValue({ ...stored, firmwareVersion: null });
  await readInventory(omniWith("R0502000"), target);
  expect(getSysInfo).toHaveBeenCalledTimes(1);
});

it("keeps the stored row while the firmware version is not known", async () => {
  findUnique.mockResolvedValue(stored);
  await readInventory(omniWith(undefined), target);
  expect(getSysInfo).not.toHaveBeenCalled();
});

it("re-reads on request without consulting the store", async () => {
  await readInventory(omniWith("R0502000"), { ...target, refresh: true });
  expect(findUnique).not.toHaveBeenCalled();
  expect(getSysInfo).toHaveBeenCalledTimes(1);
  expect(upsert).toHaveBeenCalledTimes(1);
});
