import { OmniLogic } from "@rygine/omnilogic-local-sdk";
import { createServerFn } from "@tanstack/react-start";

import { checkFirmware } from "@/server/connection";

import { hostPort } from "./_validators";

// a controller on the local network answers in well under a second
const PING_ACK_TIMEOUT_MS = 1000;

export const ping = createServerFn({ method: "POST" })
  .validator(hostPort)
  .handler(async ({ data }) => {
    const omni = new OmniLogic({
      host: data.host,
      port: data.port,
      timings: { ackTimeoutMs: PING_ACK_TIMEOUT_MS },
    });
    return checkFirmware(omni);
  });
