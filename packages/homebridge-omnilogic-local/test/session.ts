import {
  OmniLogic,
  SWITCH_OPCODE,
  type Telemetry,
} from "@rygine/omnilogic-local-sdk";
import type { Logging } from "homebridge";

import { ControllerSession } from "@/session";

import { configXml } from "./fixtures";
import { silentLog } from "./hap";
import { telemetryFixture } from "./telemetry";

export type Sent = { name: string; params: Record<string, number | string> };

const decode = (xml: string): Sent => {
  const name = /<Name>([^<]*)<\/Name>/.exec(xml)![1]!;
  const params: Record<string, number | string> = {};
  for (const m of xml.matchAll(
    /<Parameter name="([^"]*)" dataType="([^"]*)"[^>]*>([^<]*)<\/Parameter>/g,
  )) {
    params[m[1]!] = m[2] === "string" ? m[3]! : Number(m[3]);
  }
  return { name, params };
};

// a session over a stubbed transport
export const testSession = (
  opts: {
    telemetry?: Telemetry;
    pollInterval?: number;
    log?: Logging;
    // the controller's reply to a config request
    config?: () => string;
  } = {},
) => {
  const sent: Sent[] = [];
  const telemetry = opts.telemetry ?? telemetryFixture();
  const protocol = {
    sendMessage: (_opcode: number, xml: string) => {
      sent.push(decode(xml));
      return Promise.resolve({ id: 1 });
    },
    sendAndReceive: (opcode: number) =>
      Promise.resolve(
        opcode === SWITCH_OPCODE.RequestConfiguration
          ? (opts.config ?? configXml)()
          : "<Response/>",
      ),
  };
  const omni = new OmniLogic({
    host: "127.0.0.1",
    cacheTTL: 0,
    protocol: protocol as never,
  });
  omni.fetchTelemetry = <R extends boolean = false>(_options?: { raw?: R }) =>
    Promise.resolve(telemetry as R extends true ? string : Telemetry);
  const log = opts.log ?? silentLog;
  const session = new ControllerSession(omni, {
    pollInterval: opts.pollInterval ?? 300,
    log,
  });
  return { session, omni, sent, telemetry };
};

// the same session, with the first read of the controller done
export const readySession = async () => {
  const t = testSession();
  await t.session.refresh();
  return t;
};
