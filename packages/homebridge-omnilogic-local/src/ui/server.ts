import {
  HomebridgePluginUiServer,
  RequestError,
} from "@homebridge/plugin-ui-utils";

import { discoverHandler, type Payload } from "@/ui/discover";

class UiServer extends HomebridgePluginUiServer {
  constructor() {
    super();
    this.onRequest("/discover", async (payload: Payload) => {
      try {
        const found = await discoverHandler(payload);
        console.log(
          `Discovered ${found.length} pieces of equipment at ${payload.host}:${payload.port}`,
        );
        return found;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(
          `Could not reach the controller at ${payload.host}:${payload.port}: ${message}`,
        );
        throw new RequestError(message, { status: 400 });
      }
    });
    this.ready();
  }
}

void new UiServer();
