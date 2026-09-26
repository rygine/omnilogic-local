import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { readController } from "../controller-cache";
import { serializeWorld } from "../serializers";
import { controllerKey, pumpsBusyFor, startingFilter } from "../transitions";
import { hostPort } from "./_validators";

const worldArgs = hostPort.extend({
  // re-read inside the cache window, after a write
  fresh: z.boolean().optional(),
});

// the whole controller state in one payload
export const getWorld = createServerFn({ method: "POST" })
  .validator(worldArgs)
  .handler(({ data }) =>
    readController(
      data.host,
      data.port,
      async (omni) => {
        const key = controllerKey(data.host, data.port);
        return serializeWorld(
          omni,
          pumpsBusyFor(key, omni),
          startingFilter(key, omni),
        );
      },
      data.fresh ? "getWorld(fresh)" : "getWorld",
      data.fresh === true,
    ),
  );
