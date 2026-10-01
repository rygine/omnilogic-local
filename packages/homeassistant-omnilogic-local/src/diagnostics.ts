import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { OmniLogic } from "@rygine/omnilogic-local-sdk";

import type { BridgeOptions } from "@/bridge";

import pkg from "../package.json" with { type: "json" };

const withoutHua = (xml: string) =>
  xml.replace(/(<Parameter name="HUA"[^>]*>)[^<]*/g, "$1redacted");

export const saveDiagnostics = async (
  omni: OmniLogic,
  settings: Omit<BridgeOptions, "log" | "api"> & { apiAccess: boolean },
  dir: string,
) => {
  const controller = {
    config: await omni.fetchConfig({ raw: true }),
    telemetry: await omni.fetchTelemetry({ raw: true }),
    sysinfo: withoutHua(await omni.fetchSysInfo({ raw: true })),
  };

  await mkdir(dir, { recursive: true });
  const path = join(
    dir,
    `diagnostics-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
  await writeFile(
    path,
    JSON.stringify(
      { bridge: { version: pkg.version, ...settings }, controller },
      null,
      2,
    ),
  );
  return path;
};
