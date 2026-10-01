import { readFile } from "node:fs/promises";

import type { Api } from "@/api";
import { isRecord } from "@/utils";

export type Settings = {
  host: string;
  // credentials ride in the URL
  mqttUrl: string;
  // seconds
  pollInterval: number;
  // seconds, 0 for never
  diagnosticsInterval: number;
  logLevel?: string;
  stateDir: string;
  // Home Assistant's REST API
  api?: Api;
  disableImportedSchedules: boolean;
  speedUnit: "rpm" | "percent";
  diagnosticsDir: string;
};

type BrokerResponse = {
  data: {
    host: string;
    port: number;
    username?: string;
    password?: string;
    ssl?: boolean;
  };
};

const isBrokerResponse = (value: unknown): value is BrokerResponse =>
  isRecord(value) &&
  isRecord(value.data) &&
  typeof value.data.host === "string" &&
  typeof value.data.port === "number";

const numberOr = (what: string, value: unknown, fallback: number) => {
  const n = Number(value ?? fallback);
  if (value === "" || !Number.isFinite(n)) {
    throw new Error(`${what} "${String(value)}" is not a number`);
  }
  return n;
};

// a day, the longest interval
const MAX_SECONDS = 86_400;

const pollSeconds = (value: unknown) =>
  Math.min(Math.max(numberOr("poll interval", value, 30), 5), MAX_SECONDS);

const diagnosticsSeconds = (value: unknown) =>
  Math.min(numberOr("diagnostics interval", value, 600), MAX_SECONDS);

const speedUnitOf = (value: unknown) => {
  if (value === undefined || value === "" || value === "rpm") {
    return "rpm";
  }
  if (value === "percent") {
    return "percent";
  }
  throw new Error(`speed unit ${JSON.stringify(value)} is not rpm or percent`);
};

const brokerUrlFromSupervisor = async (token: string) => {
  const res = await fetch("http://supervisor/services/mqtt", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body: unknown = res.ok ? await res.json() : undefined;
  if (!isBrokerResponse(body)) {
    throw new Error(
      "No MQTT broker: install the Mosquitto broker add-on or set mqtt_url",
    );
  }
  const { data } = body;
  const auth =
    data.username === undefined
      ? ""
      : `${encodeURIComponent(data.username)}:${encodeURIComponent(data.password ?? "")}@`;
  return `${data.ssl === true ? "mqtts" : "mqtt"}://${auth}${data.host}:${data.port}`;
};

export const loadSettings = async (
  env: NodeJS.ProcessEnv = process.env,
  optionsPath = "/data/options.json",
): Promise<Settings> => {
  const token = env.SUPERVISOR_TOKEN;
  if (token !== undefined) {
    const parsed: unknown = JSON.parse(await readFile(optionsPath, "utf8"));
    if (!isRecord(parsed) || typeof parsed.host !== "string") {
      throw new Error(`${optionsPath} is missing "host"`);
    }
    if (parsed.host.trim() === "") {
      throw new Error("The controller address is not set");
    }
    return {
      host: parsed.host,
      mqttUrl:
        typeof parsed.mqtt_url === "string" && parsed.mqtt_url !== ""
          ? parsed.mqtt_url
          : await brokerUrlFromSupervisor(token),
      pollInterval: pollSeconds(parsed.poll_interval),
      diagnosticsInterval: diagnosticsSeconds(parsed.diagnostics_interval),
      logLevel:
        typeof parsed.log_level === "string" ? parsed.log_level : undefined,
      stateDir: "/data",
      api: { url: "http://supervisor/core/api", token },
      disableImportedSchedules: parsed.disable_imported_schedules === true,
      speedUnit: speedUnitOf(parsed.speed_unit),
      diagnosticsDir: "/share/omnilogiclocal",
    };
  }
  const host = env.OMNILOGIC_HOST;
  if (!host) {
    throw new Error("OMNILOGIC_HOST is not set");
  }
  const mqttUrl = env.MQTT_URL;
  if (!mqttUrl) {
    throw new Error("MQTT_URL is not set");
  }
  return {
    host,
    mqttUrl,
    pollInterval: pollSeconds(env.POLL_INTERVAL),
    diagnosticsInterval: diagnosticsSeconds(env.DIAGNOSTICS_INTERVAL),
    logLevel: env.LOG_LEVEL,
    stateDir: env.STATE_DIR ?? ".",
    api:
      env.HA_URL && env.HA_TOKEN
        ? { url: `${env.HA_URL.replace(/\/$/, "")}/api`, token: env.HA_TOKEN }
        : undefined,
    disableImportedSchedules: env.DISABLE_IMPORTED_SCHEDULES === "true",
    speedUnit: speedUnitOf(env.SPEED_UNIT),
    diagnosticsDir: env.STATE_DIR ?? ".",
  };
};
