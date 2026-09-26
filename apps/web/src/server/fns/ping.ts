import { OmniLogic } from "@rygine/omnilogic-local-sdk";
import { createServerFn } from "@tanstack/react-start";

import { hostPort } from "./_validators";

// a controller on the local network answers in well under a second
const PING_ACK_TIMEOUT_MS = 1000;

export const ping = createServerFn({ method: "POST" })
  .validator(hostPort)
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const omni = new OmniLogic({
      host: data.host,
      port: data.port,
      timings: { ackTimeoutMs: PING_ACK_TIMEOUT_MS },
    });
    try {
      await omni.fetchSysInfo();
      return { ok: true };
    } catch {
      return { ok: false };
    }
  });
