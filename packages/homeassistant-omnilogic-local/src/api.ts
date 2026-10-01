import { isRecord } from "@/utils";

export type Api = { url: string; token: string };

const TIMEOUT_MS = 10_000;

const call = (api: Api, path: string, init: RequestInit = {}) =>
  fetch(`${api.url}${path}`, {
    ...init,
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      Authorization: `Bearer ${api.token}`,
      "Content-Type": "application/json",
    },
  });

export const callService = async (
  api: Api,
  domain: string,
  service: string,
  data: object,
) => {
  const res = await call(api, `/services/${domain}/${service}`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(
      `Home Assistant refused ${domain}.${service}: ${res.status}`,
    );
  }
};

export const notify = (api: Api, id: string, title: string, message: string) =>
  callService(api, "persistent_notification", "create", {
    notification_id: id,
    title,
    message,
  });

export const automationExists = async (api: Api, id: string) =>
  (await call(api, `/config/automation/config/${id}`)).ok;

export const createAutomation = async (
  api: Api,
  id: string,
  automation: object,
) => {
  const res = await call(api, `/config/automation/config/${id}`, {
    method: "POST",
    body: JSON.stringify(automation),
  });
  if (!res.ok) {
    throw new Error(
      `Home Assistant refused the automation: ${res.status} ${await res.text()}`,
    );
  }
};

const states = async (api: Api): Promise<unknown[]> => {
  const res = await call(api, "/states");
  if (res.status === 401) {
    throw new Error("Home Assistant refused the token");
  }
  if (!res.ok) {
    throw new Error(`Home Assistant refused the states request: ${res.status}`);
  }
  const all: unknown = await res.json();
  return Array.isArray(all) ? all : [];
};

export const entityIds = async (api: Api) =>
  new Set(
    (await states(api)).flatMap((s) =>
      isRecord(s) && typeof s.entity_id === "string" ? [s.entity_id] : [],
    ),
  );

// Home Assistant's temperature unit, "°C" or "°F"
export const temperatureUnit = async (api: Api) => {
  const res = await call(api, "/config");
  if (!res.ok) {
    throw new Error(`Home Assistant refused the config request: ${res.status}`);
  }
  const config: unknown = await res.json();
  return isRecord(config) &&
    isRecord(config.unit_system) &&
    config.unit_system.temperature === "°C"
    ? "°C"
    : "°F";
};

// automation entity ids by the id each automation was created with
export const automationIds = async (api: Api) => {
  const ids = new Map<string, string>();
  for (const s of await states(api)) {
    if (
      isRecord(s) &&
      typeof s.entity_id === "string" &&
      s.entity_id.startsWith("automation.") &&
      isRecord(s.attributes) &&
      typeof s.attributes.id === "string"
    ) {
      ids.set(s.attributes.id, s.entity_id);
    }
  }
  return ids;
};
