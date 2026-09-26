import {
  getAvailableShows,
  LIGHT_BRIGHTNESS,
  LIGHT_SPEED,
  type LightShowInfo,
  type MSPConfig,
  type Telemetry,
} from "@rygine/omnilogic-local-sdk";

import type { Presets } from "@/helpers";

export type EquipmentKind =
  | "filter"
  | "pump"
  | "heater"
  | "chlorinator"
  | "spillover"
  | "light"
  | "relay"
  | "theme"
  | "waterTemp"
  | "airTemp";

export type Exposable = {
  id: number;
  kind: EquipmentKind;
  body: string;
  // the body of water it belongs to, or the backyard's own id
  bodyId?: number;
  defaultName: string;
  // a filter pump
  minSpeed?: number;
  maxSpeed?: number;
  presets?: Presets;
  lastSpeed?: number;
  // a chlorinator
  output?: number;
  // a heater, °F
  minSetPoint?: number;
  maxSetPoint?: number;
  setPoint?: number;
  // a heater whose first heat source can cool
  cooling?: boolean;
  // a light
  shows?: LightShowInfo[];
  show?: number;
  omniDirect?: boolean;
  // every speed from slowest to fastest
  speeds?: string[];
  // every brightness from dimmest to brightest
  brightnesses?: number[];
};

// "Pool" + "Pool Lights" stays "Pool Lights"
const named = (body: string, name: string): string =>
  name.toLowerCase().startsWith(body.toLowerCase()) ? name : `${body} ${name}`;

type LightConfig = MSPConfig["backyard"]["colorLogicLights"][number];
type RelayConfig = MSPConfig["backyard"]["relays"][number];

const lightEntry = (
  light: LightConfig,
  body: string,
  bodyId: number,
  defaultName: string,
  telemetry?: Telemetry,
): Exposable => ({
  id: light.systemId,
  kind: "light",
  body,
  bodyId,
  defaultName,
  shows: getAvailableShows(light.type, light.v2Active === true),
  show: telemetry?.colorLogicLights.find((l) => l.systemId === light.systemId)
    ?.currentShow,
  omniDirect: light.v2Active === true,
  speeds: Object.values(LIGHT_SPEED),
  brightnesses: Object.values(LIGHT_BRIGHTNESS),
});

const relayEntry = (
  relay: RelayConfig,
  body: string,
  bodyId: number,
  defaultName: string,
): Exposable => ({
  id: relay.systemId,
  kind: "relay",
  body,
  bodyId,
  defaultName,
});

// everything the config lets the plugin expose
export const discover = (
  config: MSPConfig,
  telemetry?: Telemetry,
): Exposable[] => {
  const backyard = config.backyard;
  const out: Exposable[] = [
    {
      id: 0,
      kind: "airTemp",
      body: backyard.name,
      bodyId: backyard.systemId,
      defaultName: named(backyard.name, "Air Temperature Sensor"),
    },
    ...backyard.colorLogicLights.map((l) =>
      lightEntry(
        l,
        backyard.name,
        backyard.systemId,
        named(backyard.name, l.name),
        telemetry,
      ),
    ),
    ...backyard.relays.map((r) =>
      relayEntry(
        r,
        backyard.name,
        backyard.systemId,
        named(backyard.name, r.name),
      ),
    ),
  ];
  for (const body of config.backyard.bodiesOfWater) {
    const b = body.name;
    const bodyId = body.systemId;
    if (body.filter) {
      const filterId = body.filter.systemId;
      const pump = {
        minSpeed: body.filter.minPumpSpeed,
        maxSpeed: body.filter.maxPumpSpeed,
        presets: {
          low: body.filter.vspLowPumpSpeed,
          medium: body.filter.vspMediumPumpSpeed,
          high: body.filter.vspHighPumpSpeed,
        },
        lastSpeed:
          telemetry?.filters.find((f) => f.systemId === filterId)?.lastSpeed ||
          undefined,
      };
      out.push({
        id: filterId,
        kind: "filter",
        body: b,
        bodyId,
        defaultName: named(b, body.filter.name),
        ...pump,
      });
      if (
        body.type === "BOW_POOL" &&
        body.sharedType === "BOW_SHARED_EQUIPMENT"
      ) {
        out.push({
          id: body.systemId,
          kind: "spillover",
          body: b,
          bodyId,
          defaultName: `${b} Spillover`,
          ...pump,
        });
      }
    }
    if (body.heater) {
      const heaterId = body.heater.systemId;
      out.push({
        id: heaterId,
        kind: "heater",
        body: b,
        bodyId,
        defaultName: `${b} Heater`,
        minSetPoint: body.heater.minSettableWaterTemp,
        maxSetPoint: body.heater.maxSettableWaterTemp,
        setPoint: telemetry?.virtualHeaters.find((h) => h.systemId === heaterId)
          ?.currentSetPoint,
        cooling:
          body.heater.operations.flatMap((o) => o.heaterEquipment ?? [])[0]
            ?.supportsCooling === true,
      });
    }
    if (body.chlorinator) {
      const chlorinatorId = body.chlorinator.systemId;
      out.push({
        id: chlorinatorId,
        kind: "chlorinator",
        body: b,
        bodyId,
        defaultName: named(b, body.chlorinator.name),
        output: telemetry?.chlorinators.find(
          (c) => c.systemId === chlorinatorId,
        )?.timedPercent,
      });
    }
    for (const light of body.colorLogicLights) {
      out.push(lightEntry(light, b, bodyId, named(b, light.name), telemetry));
    }
    for (const relay of body.relays) {
      out.push(relayEntry(relay, b, bodyId, named(b, relay.name)));
    }
    for (const pump of body.pumps) {
      out.push({
        id: pump.systemId,
        kind: "pump",
        body: b,
        bodyId,
        defaultName: named(b, pump.name),
      });
    }
    out.push({
      id: body.systemId,
      kind: "waterTemp",
      body: b,
      bodyId,
      defaultName: `${b} Water Temperature Sensor`,
    });
  }
  for (const theme of config.themes) {
    out.push({
      id: theme.systemId,
      kind: "theme",
      body: "Themes",
      defaultName: theme.name,
    });
  }
  return out;
};
