import { createServerFn } from "@tanstack/react-start";

import { serializeSettings, type ControllerSettings } from "../config-settings";
import { readController } from "../controller-cache";
import { hostPort } from "./_validators";

// read-only config settings, grouped for the System page
export const getControllerSettings = createServerFn({ method: "POST" })
  .validator(hostPort)
  .handler(({ data }): Promise<ControllerSettings> =>
    readController(
      data.host,
      data.port,
      async (omni) => serializeSettings(omni),
      "getControllerSettings",
    ),
  );
