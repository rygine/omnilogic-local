import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import * as hapNodeJs from "@homebridge/hap-nodejs";

import type { Attach } from "@/accessories/attach";
import { Readings } from "@/persist";
import type { ControllerSession } from "@/session";

// hap-nodejs in memory, no bridge runs
export const hap = hapNodeJs as unknown as Attach["hap"];

export const silentLog = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
} as unknown as Attach["log"];

export const attachment = (
  service: hapNodeJs.Service,
  session: ControllerSession,
  log: Attach["log"] = silentLog,
  readings: Attach["readings"] = new Readings(
    join(mkdtempSync(join(tmpdir(), "omni-")), "readings.json"),
  ),
): Attach => ({
  hap,
  service: service as unknown as Attach["service"],
  session,
  log,
  readings,
});

// a log that keeps its lines
export const recordingLog = () => {
  const lines: string[] = [];
  const push = (m: string) => lines.push(m);
  return {
    lines,
    log: {
      info: push,
      warn: push,
      error: push,
      debug: () => {},
    } as unknown as Attach["log"],
  };
};

type Kind = hapNodeJs.WithUUID<new () => hapNodeJs.Characteristic>;

// a HomeKit set, then one tick for a deferred update to land
export const set = async (
  service: hapNodeJs.Service,
  characteristic: Kind,
  value: hapNodeJs.CharacteristicValue,
) => {
  await service.getCharacteristic(characteristic).handleSetRequest(value);
  await new Promise((r) => setImmediate(r));
};

export const read = (service: hapNodeJs.Service, characteristic: Kind) =>
  service.getCharacteristic(characteristic).value;
