import type { OmniLogic } from "@rygine/omnilogic-local-sdk";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { NAME_MAX_BYTES, utf8Bytes } from "@/shared/names";

import { readController, writeController } from "../controller-cache";
import { readInventory, type SystemInventory } from "../inventory";
import { serializeSystem, type SystemInfo } from "../serializers";
import { readStoredSetting, storeSetting, type Stored } from "../stored";
import { hostPort, withRefresh } from "./_validators";

// read-only controller facts for the System page
export const getSystem = createServerFn({ method: "POST" })
  .validator(hostPort)
  .handler(({ data }): Promise<SystemInfo> =>
    readController(
      data.host,
      data.port,
      async (omni) => serializeSystem(omni),
      "getSystem",
    ),
  );

// every board on the bus with its address and firmware, kept once read
export const getSystemInventory = createServerFn({ method: "POST" })
  .validator(withRefresh)
  .handler(({ data }): Promise<SystemInventory> =>
    readController(
      data.host,
      data.port,
      (omni) => readInventory(omni, data),
      "getSystemInventory",
    ),
  );

// the panel's location, as GetCoordinates reports it
export type Coordinates = { latitude: number; longitude: number };

const coordinatesInput = hostPort.extend({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const readCoordinates = async (omni: OmniLogic): Promise<Coordinates> => {
  const r = await omni.command("GetCoordinates");
  return { latitude: r.latitude, longitude: r.longitude };
};

// writes the coordinates and returns the controller's own values
const writeCoordinates = async (
  omni: OmniLogic,
  coordinates: Coordinates,
): Promise<Coordinates> => {
  await omni.command("SetCoordinates", {
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
  });
  return readCoordinates(omni);
};

const COORDINATES_KEY = "coordinates";

// stored once read, re-read on refresh
export const getCoordinates = createServerFn({ method: "POST" })
  .validator(withRefresh)
  .handler(({ data }): Promise<Stored<Coordinates>> =>
    readStoredSetting(
      data,
      COORDINATES_KEY,
      data.refresh === true,
      "getCoordinates",
      readCoordinates,
    ),
  );

// stores and returns what the controller reports afterwards
export const setCoordinates = createServerFn({ method: "POST" })
  .validator(coordinatesInput)
  .handler(({ data }): Promise<Stored<Coordinates>> =>
    writeController(
      data.host,
      data.port,
      async (omni) =>
        storeSetting(
          data,
          COORDINATES_KEY,
          await writeCoordinates(omni, {
            latitude: data.latitude,
            longitude: data.longitude,
          }),
        ),
      "setCoordinates",
    ),
  );

const renameInput = hostPort.extend({
  equipmentId: z.number().int().nonnegative(),
  name: z
    .string()
    .trim()
    .min(1, "A name is required")
    .refine((s) => utf8Bytes(s) <= NAME_MAX_BYTES, {
      message: `Names are at most ${NAME_MAX_BYTES} bytes`,
    }),
});

// renames a body of water or a device by its id
export const renameConfigObject = createServerFn({ method: "POST" })
  .validator(renameInput)
  .handler(({ data }) =>
    writeController(
      data.host,
      data.port,
      async (omni) => {
        await omni.command("UiEditConfigObjectName", {
          equipmentId: data.equipmentId,
          name: data.name,
        });
      },
      "renameConfigObject",
    ),
  );
