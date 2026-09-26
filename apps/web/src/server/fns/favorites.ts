import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { writeController } from "../controller-cache";
import { hostPort } from "./_validators";

const addArgs = hostPort.extend({
  equipmentId: z.number().int().positive(),
  // the action value, 0 for a plain bookmark
  data: z.number().int().min(0),
});

export const addFavorite = createServerFn({ method: "POST" })
  .validator(addArgs)
  .handler(({ data }) =>
    writeController(
      data.host,
      data.port,
      async (omni) => {
        await omni.backyard.favorites.create({
          equipmentId: data.equipmentId,
          data: data.data,
        });
      },
      "addFavorite",
    ),
  );

const removeArgs = hostPort.extend({
  // the favorite's display-slot id, not its system id
  indexId: z.number().int().positive(),
});

export const removeFavorite = createServerFn({ method: "POST" })
  .validator(removeArgs)
  .handler(({ data }) =>
    writeController(
      data.host,
      data.port,
      (omni) => omni.backyard.favorites.remove(data.indexId),
      "removeFavorite",
    ),
  );
