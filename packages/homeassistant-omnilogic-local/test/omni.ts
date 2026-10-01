import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  OmniLogic,
  SWITCH_OPCODE,
  type Telemetry,
} from "@rygine/omnilogic-local-sdk";

import { devicesOf } from "@/bridge";
import type { DeviceSpec } from "@/entities/entity";

import { configXml } from "../../homebridge-omnilogic-local/test/fixtures";
import { telemetryFixture } from "../../homebridge-omnilogic-local/test/telemetry";

export { configXml, telemetryFixture };

export type Sent = { name: string; params: Record<string, number | string> };

const decode = (xml: string): Sent | undefined => {
  const name = /<Name>([^<]*)<\/Name>/.exec(xml)?.[1];
  if (name === undefined) {
    return undefined;
  }
  const params: Record<string, number | string> = {};
  for (const m of xml.matchAll(
    /<Parameter name="([^"]*)" dataType="([^"]*)"[^>]*>([^<]*)<\/Parameter>/g,
  )) {
    params[m[1]!] = m[2] === "string" ? m[3]! : Number(m[3]);
  }
  return { name, params };
};

export const fixture = (name: string): string =>
  readFileSync(join(import.meta.dirname, "../../../fixtures", name), "utf8");

// a session over a stubbed transport
export const testOmni = (
  opts: {
    config?: () => string;
    telemetry?: Telemetry;
    replies?: Record<string, string>;
  } = {},
) => {
  const sent: Sent[] = [];
  const telemetry = opts.telemetry ?? telemetryFixture();
  const record = (xml: string) => {
    const s = decode(xml);
    if (s !== undefined) {
      sent.push(s);
    }
    return s;
  };
  const protocol = {
    sendMessage: (_opcode: number, xml: string) => {
      record(xml);
      return Promise.resolve({ id: 1 });
    },
    sendAndReceive: (opcode: number, xml: string) => {
      if (opcode === SWITCH_OPCODE.RequestConfiguration) {
        return Promise.resolve((opts.config ?? configXml)());
      }
      if (opcode === SWITCH_OPCODE.GetSysInfo) {
        return Promise.resolve(fixture("sysinfo.xml"));
      }
      const s = record(xml);
      return Promise.resolve(opts.replies?.[s?.name ?? ""] ?? "<Response/>");
    },
  };
  const omni = new OmniLogic({
    host: "127.0.0.1",
    cacheTTL: 0,
    protocol: protocol as never,
  });
  omni.fetchTelemetry = <R extends boolean = false>(_options?: { raw?: R }) =>
    Promise.resolve(telemetry as R extends true ? string : Telemetry);
  return { omni, sent, telemetry };
};

// a read's reply, its parameter values in the spec's order
export const reply = (name: string, ...values: (number | string)[]) =>
  `<Response><Name>${name}</Name><Parameters>${values
    .map((v) => `<Parameter name="p" dataType="int">${v}</Parameter>`)
    .join("")}</Parameters></Response>`;

// one entity, by device id and key
export const entity = (devices: DeviceSpec[], id: string, key: string) => {
  const found = devices
    .find((d) => d.id === id)
    ?.entities.find((e) => e.key === key);
  if (found === undefined) {
    throw new Error(`no entity ${id}/${key}`);
  }
  return found;
};

// a refreshed session and the devices its configuration holds
export const ready = async (
  opts: Parameters<typeof testOmni>[0] & { speedUnit?: "rpm" | "percent" } = {},
) => {
  const t = testOmni(opts);
  await t.omni.refresh();
  return { ...t, devices: devicesOf(t.omni, opts.speedUnit ?? "rpm") };
};

// a log that drops everything
export const silent = { debug: () => {}, info: () => {}, warn: () => {} };

// the topics a discovery entry is built from
export const topics = {
  state: "s",
  command: (f?: string) => `set/${f}`,
  availability: [{ topic: "bridge" }],
};
