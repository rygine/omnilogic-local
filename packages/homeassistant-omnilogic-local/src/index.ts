#!/usr/bin/env node
import { OmniLogic } from "@rygine/omnilogic-local-sdk";
import { connect } from "mqtt";

import { BRIDGE_TOPIC, Bridge } from "@/bridge";
import { loadSettings } from "@/settings";
import { logger, messageOf } from "@/utils";

const settings = await loadSettings().catch((error: unknown) => {
  console.error(messageOf(error));
  process.exit(1);
});

if (settings.logLevel !== undefined) {
  process.env.LOG_LEVEL = settings.logLevel;
}

const omni = new OmniLogic({ host: settings.host, cacheTTL: 0 });

const client = connect(settings.mqttUrl, {
  will: {
    topic: BRIDGE_TOPIC,
    payload: Buffer.from("offline"),
    retain: true,
    qos: 1,
  },
});
client.on("error", (error) => {
  logger.warn(`MQTT: ${error.message}`);
});

const bridge = new Bridge(omni, client, settings);
bridge.start();
logger.info(`bridging the controller at ${settings.host}`);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    bridge.stop();
    client.end(false, {}, () => process.exit(0));
  });
}
