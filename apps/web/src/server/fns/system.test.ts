import {
  callServerFn,
  makeRecorder,
  validateServerFn,
  valuesOf,
} from "@tests/server/support";
import { vi } from "vitest";

// every send goes through the SDK's real encoder
const { omni, sent } = makeRecorder();

// what the stubbed controller answers to a coordinates read
const reported = { latitude: 30.1, longitude: -90.1 };

// what the stubbed controller answers to a system info read, in the SDK's parsed shape
const inventory = {
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

// the stub answers the read and encodes the two writes for real
const command = vi.fn(
  (name: string, params: Record<string, number | string>) => {
    switch (name) {
      case "GetCoordinates":
        return Promise.resolve(reported);
      case "SetCoordinates":
        return omni.command("SetCoordinates", {
          latitude: Number(params.latitude),
          longitude: Number(params.longitude),
        });
      case "UiEditConfigObjectName":
        return omni.command("UiEditConfigObjectName", {
          equipmentId: Number(params.equipmentId),
          name: String(params.name),
        });
      default:
        return Promise.reject(new Error(`unexpected command ${name}`));
    }
  },
);

const omniStub = {
  fetchSysInfo: () => Promise.resolve(inventory),
  command,
};

// the inventory and setting stores, empty: every read here goes to the controller
const { upsert, storeUpsert } = vi.hoisted(() => ({
  upsert: vi.fn(),
  storeUpsert: vi.fn(),
}));
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    systemInventory: {
      findUnique: () => Promise.resolve(null),
      upsert: (...args: unknown[]) => {
        upsert(...args);
        return Promise.resolve(undefined);
      },
    },
    storedSetting: {
      findUnique: () => Promise.resolve(null),
      upsert: (...args: unknown[]) => {
        storeUpsert(...args);
        return Promise.resolve(undefined);
      },
    },
  },
}));

vi.mock("../controller-cache", () => ({
  readController: (
    _h: string,
    _p: number,
    fn: (o: unknown) => Promise<unknown>,
  ) => fn(omniStub),
  writeController: (
    _h: string,
    _p: number,
    fn: (o: unknown) => Promise<unknown>,
  ) => fn(omniStub),
}));

import { NAME_MAX_BYTES } from "@/shared/names";

import {
  getCoordinates,
  getSystemInventory,
  renameConfigObject,
  setCoordinates,
} from "./system";

const base = { host: "h", port: 1 };

beforeEach(() => {
  sent.length = 0;
  command.mockClear();
  storeUpsert.mockClear();
});

describe("coordinates", () => {
  it("getCoordinates asks the controller, stores the reply, and sends nothing else", async () => {
    await callServerFn(getCoordinates, base);
    expect(command).toHaveBeenCalledWith("GetCoordinates");
    expect(sent).toHaveLength(0);
    expect(storeUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { host_port_key: { ...base, key: "coordinates" } },
        update: expect.objectContaining({ json: JSON.stringify(reported) }),
      }),
    );
  });

  it("setCoordinates sends both floats in wire order, then reads the controller back and stores it", async () => {
    await callServerFn(setCoordinates, {
      ...base,
      latitude: 30.1,
      longitude: -90.1,
    });
    expect(sent).toHaveLength(1);
    expect(sent[0]!.opcode).toBe(416);
    // latitude, then longitude
    expect(valuesOf(sent[0]!.xml)).toEqual(["30.1", "-90.1"]);
    expect(command.mock.calls.map((c) => c[0])).toEqual([
      "SetCoordinates",
      "GetCoordinates",
    ]);
    expect(storeUpsert).toHaveBeenCalledTimes(1);
  });

  it("refuses coordinates off the globe", async () => {
    await expect(
      validateServerFn(setCoordinates, { ...base, latitude: 91, longitude: 0 }),
    ).rejects.toThrow(/latitude/i);
    await expect(
      validateServerFn(setCoordinates, {
        ...base,
        latitude: 0,
        longitude: -181,
      }),
    ).rejects.toThrow(/longitude/i);
    await expect(
      validateServerFn(setCoordinates, {
        ...base,
        latitude: -90,
        longitude: 180,
      }),
    ).resolves.toBeUndefined();
  });
});

describe("renameConfigObject", () => {
  it("sends UiEditConfigObjectName with the id and the name", async () => {
    await callServerFn(renameConfigObject, {
      ...base,
      equipmentId: 22,
      name: "Blower2",
    });
    expect(sent).toHaveLength(1);
    expect(sent[0]!.opcode).toBe(332);
    expect(valuesOf(sent[0]!.xml)).toEqual(["22", "Blower2"]);
  });

  it("renames a body of water through the same command", async () => {
    await callServerFn(renameConfigObject, {
      ...base,
      equipmentId: 1,
      name: "Lap pool",
    });
    expect(valuesOf(sent[0]!.xml)).toEqual(["1", "Lap pool"]);
  });

  // the schema refuses a name the panel would truncate to 13 bytes
  it("caps the name at the firmware's 13 bytes, trimmed", async () => {
    const validate = (name: string) =>
      validateServerFn(renameConfigObject, { ...base, equipmentId: 22, name });
    expect(NAME_MAX_BYTES).toBe(13);
    await expect(validate("Blower")).resolves.toBeUndefined();
    await expect(validate("  Blower  ")).resolves.toBeUndefined();
    await expect(validate("1234567890123")).resolves.toBeUndefined();
    await expect(validate("12345678901234")).rejects.toThrow(/bytes/);
    // 7 characters, 14 bytes
    await expect(validate("ééééééé")).rejects.toThrow(/bytes/);
    await expect(validate("")).rejects.toThrow(/required/);
    await expect(validate("   ")).rejects.toThrow(/required/);
  });
});

describe("getSystemInventory", () => {
  it("reads the board inventory from the controller when nothing is stored", async () => {
    const spy = vi.spyOn(omniStub, "fetchSysInfo");
    await callServerFn(getSystemInventory, base);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(upsert).toHaveBeenCalledTimes(1);
  });
});
