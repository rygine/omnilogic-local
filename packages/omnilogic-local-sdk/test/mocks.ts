import { readFileSync } from "node:fs";
import { join } from "node:path";

import { OmniLogic, type OmniLogicOptions } from "@/client/omnilogic";
import type { CommandName } from "@/client/spec";
import type { OmniLogicProtocol } from "@/transport/protocol";
import type { MSPConfig } from "@/types/config";
import type { Telemetry } from "@/types/telemetry";
import { parseConfig } from "@/utils/xml";

// the parameter values of a payload, in wire order
export const valuesOf = (xml: string): string[] => {
  return [...xml.matchAll(/<Parameter\b[^>]*>([^<]*)<\/Parameter>/g)].map(
    (m) => m[1]!,
  );
};

export type Sent = { opcode: number; xml: string; attempts?: number };

// the command a payload carries, with its parameters typed by their wire dataType
const decodePayload = (
  xml: string,
): { name: CommandName; params: Record<string, number | string> } => {
  const name = /<Name>([^<]*)<\/Name>/.exec(xml)![1] as CommandName;
  const params: Record<string, number | string> = {};
  for (const m of xml.matchAll(
    /<Parameter name="([^"]*)" dataType="([^"]*)"[^>]*>([^<]*)<\/Parameter>/g,
  )) {
    params[m[1]!] = m[2] === "string" ? m[3]! : Number(m[3]);
  }
  return { name, params };
};

type Script = {
  // called with every send-only command, decoded from the payload the real encoder built
  onSend?: (name: CommandName, params: Record<string, number | string>) => void;
  // what every read answers with (default: nothing)
  response?: string;
  // the config and telemetry fetches, replacing the transport's (default: empty)
  telemetry?: () => unknown;
  config?: () => unknown;
  // send the fetches through the recording transport instead
  realFetches?: boolean;
};

// a session over a recording transport, with a script that watches sends and answers the fetches
export const makeRecorder = (
  script: Script = {},
  options: Partial<OmniLogicOptions> = {},
) => {
  const sent: Sent[] = [];
  const response = script.response ?? "<Response/>";
  const protocol = {
    sendMessage: (opcode: number, xml: string) => {
      sent.push({ opcode, xml });
      if (script.onSend !== undefined) {
        const { name, params } = decodePayload(xml);
        script.onSend(name, params);
      }
      return Promise.resolve({ id: 1 });
    },
    sendAndReceive: (
      opcode: number,
      xml: string,
      operation: { attempts?: number } = {},
    ) => {
      sent.push({ opcode, xml, attempts: operation.attempts });
      return Promise.resolve(response);
    },
  } as unknown as OmniLogicProtocol;
  const omni = new OmniLogic({ host: "127.0.0.1", ...options, protocol });
  if (script.realFetches) {
    return { omni, sent };
  }
  const telemetry = script.telemetry ?? (() => EMPTY_TELEMETRY);
  omni.fetchTelemetry = <R extends boolean = false>(_options?: { raw?: R }) =>
    Promise.resolve(telemetry() as R extends true ? string : Telemetry);
  const config = script.config ?? (() => EMPTY_CONFIG);
  omni.fetchConfig = <R extends boolean = false>(_options?: { raw?: R }) =>
    Promise.resolve(config() as R extends true ? string : MSPConfig);
  return { omni, sent };
};

// a controller capture from the repository's fixtures folder, as text
export const fixture = (name: string): string =>
  readFileSync(join(import.meta.dirname, "../../../fixtures", name), "utf8");

// a config fixture, parsed
export const loadConfigFixture = (name = "config.xml"): MSPConfig =>
  parseConfig(fixture(name));

// telemetry reporting nothing: the controller on, every list empty, no checksum
export const EMPTY_TELEMETRY = {
  backyard: { configChksum: 0, state: 1 },
  bodiesOfWater: [],
  chlorinators: [],
  colorLogicLights: [],
  csads: [],
  filters: [],
  themes: [],
  heaters: [],
  pumps: [],
  relays: [],
  smartValveActuators: [],
  valveActuators: [],
  virtualHeaters: [],
};

// a config with nothing installed
export const EMPTY_CONFIG = {
  backyard: { bodiesOfWater: [] },
} as unknown as MSPConfig;

// a session with a config cached through a stubbed refresh
export const seeded = async (config: MSPConfig, response?: string) => {
  const { omni, sent } = makeRecorder({
    response,
    config: () => config,
    telemetry: () => EMPTY_TELEMETRY,
  });
  await omni.refresh({ refetch: true });
  return { omni, sent };
};

// a session seeded with a config fixture
export const seededOmni = async (
  options: { response?: string; xml?: string } = {},
) =>
  seeded(
    options.xml === undefined ? loadConfigFixture() : parseConfig(options.xml),
    options.response,
  );
