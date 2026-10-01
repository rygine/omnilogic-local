import {
  ColorLogicPowerState,
  type BodyOfWater,
} from "@rygine/omnilogic-local-sdk";
import type {
  Characteristic,
  CharacteristicValue,
  HAP,
  Logging,
  Service,
} from "homebridge";

import {
  defaultSpeedFor,
  presetsFor,
  type Presets,
  type Range,
  type SpeedType,
} from "@/helpers";
import type { AutoOff, Readings } from "@/persist";
import type { ControllerSession } from "@/session";

export type Attach = {
  hap: HAP;
  service: Service;
  session: ControllerSession;
  log: Logging;
  readings: Pick<Readings, "keep">;
};

// push the controller's current values to HomeKit
export type Handle = { update: () => void };

// hap-nodejs's HAPStatus.SERVICE_COMMUNICATION_FAILURE
const SERVICE_COMMUNICATION_FAILURE = -70402;

// the accessory's name as HomeKit shows it
export const label = (a: Attach): string => {
  const name = a.service.getCharacteristic(a.hap.Characteristic.Name).value;
  return typeof name === "string" ? name : "";
};

// the error and every cause under it
const describe = (error: unknown): string =>
  error instanceof Error && error.cause !== undefined
    ? `${String(error)} (${describe(error.cause)})`
    : String(error);

export const failed = (a: Attach, error: unknown, what = ""): never => {
  a.log.warn(
    `${[label(a), what].filter(Boolean).join(" ")} failed, the tile reverts: ${describe(error)}`,
  );
  throw new a.hap.HapStatusError(SERVICE_COMMUNICATION_FAILURE);
};

// wrap a handler in a try/catch that logs on error and reverts the tile
export const guard =
  (a: Attach, handler: (value: CharacteristicValue) => Promise<void>) =>
  async (value: CharacteristicValue): Promise<void> => {
    try {
      await handler(value);
    } catch (e) {
      if (e instanceof a.hap.HapStatusError) {
        throw e;
      }
      failed(a, e);
    }
  };

// logs a change from HomeKit that the controller acknowledged
export const sent = (a: Attach, what: string): void => {
  a.log.info(`${label(a)}: ${what}`);
};

// "1 minute", "5 minutes"
export const minutes = (n: number): string =>
  `${n} minute${n === 1 ? "" : "s"}`;

// " for 5 minutes" at the end of a log line, empty without a turn-off time
export const forMinutes = (n: number | undefined): string =>
  n === undefined ? "" : ` for ${minutes(n)}`;

// replaces the value HomeKit sent with this one, after hap-nodejs has stored it
export const defer = (
  characteristic: Characteristic,
  value: CharacteristicValue,
): void => {
  setImmediate(() => characteristic.updateValue(value));
};

export const lightOf = (a: Attach, lightId: number) => {
  const { backyard } = a.session.omni;
  const light = [
    ...backyard.lights,
    ...backyard.bodies.flatMap((b) => b.lights),
  ].find((l) => l.equipmentId === lightId);
  if (light === undefined) {
    throw new Error(`no light ${lightId}`);
  }
  return light;
};

export const relayOf = (a: Attach, relayId: number) => {
  const { backyard } = a.session.omni;
  const relay = [
    ...backyard.relays,
    ...backyard.bodies.flatMap((b) => b.relays),
  ].find((r) => r.equipmentId === relayId);
  if (relay === undefined) {
    throw new Error(`no relay ${relayId}`);
  }
  return relay;
};

// an auxiliary pump
export const pumpOf = (a: Attach, pumpId: number) => {
  const pump = a.session.omni.backyard.bodies
    .flatMap((b) => b.pumps)
    .find((p) => p.equipmentId === pumpId);
  if (pump === undefined) {
    throw new Error(`no pump ${pumpId}`);
  }
  return pump;
};

export const lightChanging = (a: Attach, lightId: number) => {
  const state = lightOf(a, lightId).state?.lightState;
  return (
    state !== undefined &&
    state !== ColorLogicPowerState.OFF &&
    state !== ColorLogicPowerState.ACTIVE
  );
};

// sends to a light, refused while it is changing
export const lightSender = (a: Attach, lightId: number) => {
  let sentSinceRead = false;
  return {
    send: async (command: () => Promise<unknown>, what: string) => {
      await a.session
        .write(async () => {
          if (sentSinceRead || lightChanging(a, lightId)) {
            throw new Error(`${what}: the light is still changing`);
          }
          await command();
          sentSinceRead = true;
        })
        .catch((e: unknown) => failed(a, e, what));
    },
    read: () => {
      sentSinceRead = false;
    },
  };
};

export const deviceOf = <K extends "filter" | "heater" | "chlorinator">(
  a: Attach,
  bodyId: number,
  kind: K,
): NonNullable<BodyOfWater[K]> => {
  const device = a.session.omni.backyard.body(bodyId)?.[kind];
  if (device === undefined) {
    throw new Error(`no ${kind} on body ${bodyId}`);
  }
  return device;
};

export const speeds = (
  a: Attach,
  bodyId: number,
): {
  speedType: SpeedType;
  range: Range;
  presets?: Presets;
  defaultSpeed: number;
} => {
  const filter = deviceOf(a, bodyId, "filter");
  const presets = presetsFor(filter.speedType, filter.presets);
  return {
    speedType: filter.speedType,
    range: { min: filter.minSpeed, max: filter.maxSpeed },
    presets,
    defaultSpeed: defaultSpeedFor(filter.speedType, presets, filter.maxSpeed),
  };
};

// the body's water temperature, or the pool reading for a spa that shares the pool pump and has none
export const waterTemp = (a: Attach, bodyId: number): number | undefined => {
  const { backyard, config } = a.session.omni;
  const own = backyard.body(bodyId)?.waterTemp;
  const body = config.backyard.bodiesOfWater.find((b) => b.systemId === bodyId);
  const borrows =
    body?.sharedType === "BOW_SHARED_EQUIPMENT" && body.type !== "BOW_POOL";
  if (own !== undefined || !borrows) {
    return own;
  }
  return backyard.bodies
    .filter((b) => b.type === "BOW_POOL")
    .map((b) => b.waterTemp)
    .find((t) => t !== undefined);
};

// the on state and level from one HomeKit write
export type OnAndLevel = { on?: boolean; percent?: number };

// sends the values from one HomeKit write as one command
export const coalesce = (
  apply: (part: OnAndLevel) => Promise<void>,
): ((part: OnAndLevel) => Promise<void>) => {
  let pending: OnAndLevel | null = null;
  let waiting: { resolve: () => void; reject: (e: unknown) => void }[] = [];
  return (part) =>
    new Promise((resolve, reject) => {
      const first = pending === null;
      pending = { ...pending, ...part };
      waiting.push({ resolve, reject });
      if (!first) {
        return;
      }
      setImmediate(() => {
        const p = pending ?? {};
        pending = null;
        const settling = waiting;
        waiting = [];
        apply(p).then(
          () => settling.forEach((w) => w.resolve()),
          (e: unknown) => settling.forEach((w) => w.reject(e)),
        );
      });
    });
};

// a heater's off timer, canceled once the heater is seen off
export const heaterTimer = (a: Attach, autoOff: AutoOff | undefined) => {
  let seenOn = true;
  return {
    arm: () => {
      seenOn = false;
      autoOff?.(true);
    },
    cancel: () => autoOff?.(false) === true,
    read: (enabled: boolean) => {
      if (enabled) {
        seenOn = true;
      } else if (seenOn && autoOff?.(false) === true) {
        sent(a, "timer canceled, the heater is off");
      }
    },
  };
};

// shows a pump as on from the moment a start is sent until the controller reports it running
export const startWindow = (a: Attach, bodyId: number) => {
  const primingSeconds = a.session.primingSeconds(
    deviceOf(a, bodyId, "filter").equipmentId,
  );
  let until = 0;
  return {
    primingSeconds,
    started: (primes: boolean) => {
      until =
        Date.now() +
        (primes && primingSeconds > 0 ? (primingSeconds + 30) * 1000 : 60_000);
    },
    stopped: () => {
      until = 0;
    },
    isOn: (reported: boolean) => {
      if (reported) {
        until = 0;
      }
      return reported || Date.now() < until;
    },
  };
};
