import { setTimeout } from "node:timers/promises";

import {
  COMMANDS,
  type CommandName,
  type CommandParams,
  type CommandResult,
  SWITCH_OPCODE,
} from "@/client/spec";
import { isRunning } from "@/constants/labels";
import { Backyard } from "@/equipment/backyard";
import {
  DEFAULT_TIMINGS,
  OmniLogicProtocol,
  type Timings,
} from "@/transport/protocol";
import type { MSPConfig } from "@/types/config";
import type { SysInfo } from "@/types/sysinfo";
import type { Telemetry } from "@/types/telemetry";
import { buildCommandXml, parseCommandResponse } from "@/utils/command";
import {
  CommandFailedError,
  EquipmentNotInstalledError,
  FirmwareTooOldError,
  OmniLogicError,
  OmniValidationError,
  SystemStateError,
  ReadingUnavailableError,
} from "@/utils/errors";
import { defined, numberOf } from "@/utils/helpers";
import {
  INVENTORY_PATHS,
  discover,
  installedAt,
  systemIdAt,
  type Inventory,
  type InventoryPath,
} from "@/utils/inventory";
import { createLogger } from "@/utils/logger";
import {
  buildMessageXml,
  parseConfig,
  parseSysInfo,
  parseTelemetry,
} from "@/utils/xml";

const DEFAULT_CACHE_TTL_SECONDS = 30;
const DEFAULT_READ_ATTEMPTS = 3;

export const MIN_MSP_VERSION = "R0502000";

const MSP_VERSION_SHAPE = /^R\d{7}$/;

export const DEFAULT_PORT = 10444;

export type OmniLogicOptions = {
  host: string;
  port?: number;
  // seconds
  cacheTTL?: number;
  // ignored when protocol is supplied
  timings?: Partial<Timings>;
  // how many times a read is sent when the controller acknowledges it but never replies, default 3
  readAttempts?: number;
  // for testing purposes only
  protocol?: OmniLogicProtocol;
  // a cached config to start from, refetched when the checksum moves
  config?: MSPConfig;
};

export type CommandOptions = {
  // send even where the SDK would refuse
  force?: boolean;
  timings?: Partial<Timings>;
  // whether the command took
  verify?: () => boolean;
  // default 0: one check
  timeoutMs?: number;
  // default 4000
  pollMs?: number;
  // how many times to send, a write until verify passes and a read until the controller replies
  attempts?: number;
  // default "<name> failed"
  failure?: string;
  // the reply as sent, unparsed
  raw?: boolean;
};

export type WriteOptions = Pick<CommandOptions, "attempts">;

export type ReadOptions<R extends boolean = boolean> = { raw?: R };
type Fetched<R extends boolean, T> = Promise<R extends true ? string : T>;

// the opcode each fetch answers with
const FETCH_REPLY: Record<keyof typeof SWITCH_OPCODE, number> = {
  RequestConfiguration: 1003,
  GetTelemetry: 1004,
  GetSysInfo: 1411,
};

const omnilogicLog = createLogger("omnilogic");
const commandLog = createLogger("command");

const isInventoryPath = (value: string): value is InventoryPath =>
  INVENTORY_PATHS.some((path) => path === value);

// a check that reads while the controller is off has not passed yet
const verified = (verify: () => boolean) => {
  try {
    return verify();
  } catch (error) {
    if (error instanceof ReadingUnavailableError) {
      return false;
    }
    throw error;
  }
};

export class OmniLogic {
  #protocol: OmniLogicProtocol;
  #backyard = new Backyard(this);
  #mspConfig: MSPConfig | null = null;
  #telemetry: Telemetry | null = null;
  #configChecksum: number = 0;
  #telemetryLastUpdated: number = 0;
  #cacheTTL: number;
  #timings: Timings;
  #readAttempts: number;
  #inventory: Inventory | null = null;

  #telemetryDirty: boolean = true;
  // resolves when the first refresh has finished
  #firstRefresh: Promise<void> | null = null;
  #refreshStarted: number = 0;
  #telemetryCachedFrom: number = 0;
  #writes: number = 0;

  constructor(options: OmniLogicOptions) {
    const {
      host,
      port = DEFAULT_PORT,
      cacheTTL = DEFAULT_CACHE_TTL_SECONDS,
      timings = {},
      readAttempts = DEFAULT_READ_ATTEMPTS,
      protocol,
      config,
    } = options;
    this.#cacheTTL = cacheTTL;
    this.#readAttempts = readAttempts;
    this.#timings = { ...DEFAULT_TIMINGS, ...defined(timings) };
    this.#protocol =
      protocol ?? new OmniLogicProtocol(host, port, this.#timings);
    if (config !== undefined) {
      this.#adopt(config);
      this.#configChecksum = config.checksum;
    }
  }

  get timings() {
    return this.#timings;
  }

  get backyard() {
    return this.#backyard;
  }

  get configChecksum() {
    return this.#configChecksum;
  }

  get mspVersion() {
    return this.#telemetry?.backyard.mspVersion;
  }

  // whether the cached telemetry may be out of date
  get telemetryDirty() {
    return this.#telemetryDirty;
  }

  get config() {
    if (this.#mspConfig === null) {
      throw new OmniLogicError("No config cached; call refresh() first");
    }
    return this.#mspConfig;
  }

  get telemetry() {
    if (this.#telemetry === null) {
      throw new OmniLogicError("No telemetry cached; call refresh() first");
    }
    return this.#telemetry;
  }

  get inventory() {
    if (this.#inventory === null) {
      throw new OmniLogicError("No config cached; call refresh() first");
    }
    return this.#inventory;
  }

  #adopt(config: MSPConfig) {
    this.#mspConfig = config;
    const inventory = discover(config);
    this.#inventory = inventory;
    const listed = new Set(inventory.bodies.map((b) => b.systemId));
    for (const bow of config.backyard.bodiesOfWater) {
      if (!listed.has(bow.systemId)) {
        omnilogicLog.debug("body without an id left out of the inventory", {
          name: bow.name,
        });
      }
    }
    for (const body of inventory.bodies) {
      const installed: Record<string, boolean> = {};
      for (const path of INVENTORY_PATHS) {
        installed[path] = installedAt(body, path);
      }
      omnilogicLog.trace("body inventory", {
        poolId: body.systemId,
        ...installed,
      });
    }
    omnilogicLog.debug("inventory discovered", {
      bodies: inventory.bodies.length,
    });
  }

  /**
   * Send a command to the controller
   */
  command<N extends CommandName>(
    name: N,
    params: CommandParams<N> | undefined,
    options: CommandOptions & { raw: true },
  ): Promise<string | undefined>;
  command<N extends CommandName>(
    name: N,
    ...rest: CommandParams<N> extends Record<string, never>
      ? [params?: CommandParams<N>, options?: CommandOptions]
      : [params: CommandParams<N>, options?: CommandOptions]
  ): Promise<CommandResult<N>>;
  command<N extends CommandName>(
    name: N,
    params: CommandParams<N>,
    options?: CommandOptions,
  ): Promise<CommandResult<N>>;
  command<N extends CommandName>(
    name: CommandName extends N ? N : never,
    params: Record<string, number | string> | undefined,
    options: CommandOptions & { raw: true },
  ): Promise<string | undefined>;
  command<N extends CommandName>(
    name: CommandName extends N ? N : never,
    params?: Record<string, number | string>,
    options?: CommandOptions,
  ): Promise<unknown>;
  async command(
    name: CommandName,
    params: Record<string, number | string> = {},
    options: CommandOptions = {},
  ): Promise<unknown> {
    if (options.force) {
      omnilogicLog.trace("checks skipped (forced)", { command: name });
    } else {
      if (this.#telemetry === null) {
        omnilogicLog.debug("no config or telemetry cached, refreshing first", {
          command: name,
        });
        this.#firstRefresh ??= this.refresh().finally(() => {
          this.#firstRefresh = null;
        });
        await this.#firstRefresh;
      }
      this.#gate(name, params);
    }
    const send = async () => {
      if (!options.force) {
        this.#refuseOutsideNormalOperation(name);
      }
      let reachedWire = true;
      try {
        return await this.#send(name, params, options);
      } catch (error) {
        reachedWire = !(
          error instanceof OmniValidationError ||
          error instanceof SystemStateError
        );
        throw error;
      } finally {
        // a failed write may still have landed
        if (reachedWire && COMMANDS[name].read !== true) {
          this.#writes++;
          this.#telemetryDirty = true;
          omnilogicLog.trace("telemetry marked dirty", { command: name });
        }
      }
    };

    const { verify } = options;
    if (verify === undefined) {
      return send();
    }
    const attempts = Math.max(1, options.attempts ?? 1);
    const timeoutMs = options.timeoutMs ?? 0;
    const pollMs = options.pollMs ?? 4000;
    omnilogicLog.trace("verifying", {
      command: name,
      attempts,
      timeoutMs,
      pollMs,
    });
    let sendError: unknown;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      sendError = undefined;
      const result = await send().catch((error: unknown) => {
        if (
          error instanceof OmniValidationError ||
          error instanceof SystemStateError
        ) {
          throw error;
        }
        omnilogicLog.warn("send failed; checking whether it took", {
          command: name,
          attempt,
          error,
        });
        sendError = error;
        return undefined;
      });
      const deadline = Date.now() + timeoutMs;
      for (let check = 1; ; check++) {
        try {
          await this.refresh({ refetch: true, force: options.force });
        } catch (error) {
          omnilogicLog.warn("refresh failed, so the command is unverified", {
            command: name,
            attempt,
            check,
            error,
          });
          throw new CommandFailedError({
            message: options.failure ?? `${name} failed`,
            command: name,
            attempts: attempt,
            cause: error,
          });
        }
        if (verified(verify)) {
          omnilogicLog.trace("verified", { command: name, attempt, check });
          // a read with no reply has nothing to return
          if (sendError !== undefined && COMMANDS[name].response) {
            throw sendError;
          }
          return result;
        }
        if (Date.now() >= deadline) {
          omnilogicLog.trace("not verified within the timeout", {
            command: name,
            attempt,
            check,
          });
          break;
        }
        omnilogicLog.trace("not verified yet, polling", {
          command: name,
          attempt,
          check,
          pollMs,
        });
        await setTimeout(pollMs);
      }
    }
    throw new CommandFailedError({
      message: options.failure ?? `${name} failed`,
      command: name,
      attempts,
      cause: sendError,
    });
  }

  async #send(
    name: CommandName,
    params: Record<string, number | string>,
    options: CommandOptions,
  ) {
    const spec = COMMANDS[name];
    if (spec.caveat !== undefined) {
      const { effect, alternative } = spec.caveat;
      commandLog.warn(
        `${name} ${effect}`,
        alternative === undefined ? undefined : { alternative },
      );
    }
    commandLog.debug(name, { opcode: spec.opcode, ...params });

    const { xml, unknown } = buildCommandXml(name, params);
    for (const key of unknown) {
      commandLog.warn("ignoring unknown parameter (not in spec)", {
        name,
        key,
      });
    }
    commandLog.trace("payload", {
      name,
      bytes: Buffer.byteLength(xml, "utf8"),
      xml,
    });

    const started = Date.now();
    const operation = {
      timings: options.timings,
      settle: spec.settle,
      attempts:
        spec.read === true ? (options.attempts ?? this.#readAttempts) : 1,
      reply: spec.response?.opcode,
    };
    try {
      if (spec.response) {
        const responseXml = await this.#protocol.sendAndReceive(
          spec.opcode,
          xml,
          operation,
        );
        commandLog.trace("response", {
          name,
          ms: Date.now() - started,
          xml: responseXml,
        });

        const parsed = parseCommandResponse(spec.response, responseXml);
        if (!parsed.ok) {
          throw new OmniLogicError(
            parsed.actual === 0
              ? `${name} answered nothing`
              : `${name} answered with ${parsed.actual} parameters, not the ${parsed.expected} of ${spec.response.name}`,
          );
        }

        if (options.raw) {
          return responseXml === "" ? undefined : responseXml;
        }

        commandLog.debug("parsed response", { name, ...parsed.params });
        return parsed.params;
      }

      const message = await this.#protocol.sendMessage(
        spec.opcode,
        xml,
        operation,
      );
      commandLog.debug("sent", {
        name,
        id: message.id,
        ms: Date.now() - started,
      });
      return undefined;
    } catch (error) {
      commandLog.debug("failed", { name, opcode: spec.opcode, error });
      throw error;
    }
  }

  async #fetch(name: keyof typeof SWITCH_OPCODE) {
    omnilogicLog.debug(name);
    const started = Date.now();
    const xml = await this.#protocol.sendAndReceive(
      SWITCH_OPCODE[name],
      buildMessageXml(name),
      { attempts: this.#readAttempts, reply: FETCH_REPLY[name] },
    );
    omnilogicLog.debug("fetched", {
      name,
      ms: Date.now() - started,
      bytes: Buffer.byteLength(xml, "utf8"),
    });
    return xml;
  }

  fetchConfig<R extends boolean = false>(
    options?: ReadOptions<R>,
  ): Fetched<R, MSPConfig>;
  async fetchConfig(options: ReadOptions = {}) {
    const xmlResponse = await this.#fetch("RequestConfiguration");
    if (options.raw) {
      return xmlResponse;
    }
    const config = parseConfig(xmlResponse);
    omnilogicLog.trace("config parsed", {
      checksum: config.checksum,
      bodies: config.backyard.bodiesOfWater.length,
      schedules: config.schedules.length,
      favorites: config.favorites.length,
      themes: config.themes.length,
    });
    return config;
  }

  fetchTelemetry<R extends boolean = false>(
    options?: ReadOptions<R>,
  ): Fetched<R, Telemetry>;
  async fetchTelemetry(options: ReadOptions = {}) {
    const xmlResponse = await this.#fetch("GetTelemetry");
    if (options.raw) {
      return xmlResponse;
    }
    const telemetry = parseTelemetry(xmlResponse);
    omnilogicLog.trace("telemetry parsed", {
      version: telemetry.version,
      checksum: telemetry.backyard.configChksum,
      bodies: telemetry.bodiesOfWater.length,
    });
    return telemetry;
  }

  fetchSysInfo<R extends boolean = false>(
    options?: ReadOptions<R>,
  ): Fetched<R, SysInfo>;
  async fetchSysInfo(options: ReadOptions = {}) {
    const xmlResponse = await this.#fetch("GetSysInfo");
    if (options.raw) {
      return xmlResponse;
    }
    const info = parseSysInfo(xmlResponse);
    omnilogicLog.trace("sysinfo parsed", {
      components: info.components.length,
    });
    return info;
  }

  #refuseUnsupportedFirmware(telemetry: Telemetry) {
    const version = telemetry.backyard.mspVersion;
    if (version === undefined || !MSP_VERSION_SHAPE.test(version)) {
      omnilogicLog.debug("firmware version unrecognized, not checked", {
        version,
      });
      return;
    }
    // string order is version order
    if (version < MIN_MSP_VERSION) {
      throw new FirmwareTooOldError({ version, minimum: MIN_MSP_VERSION });
    }
    omnilogicLog.trace("firmware supported", { version });
  }

  #refuseOutsideNormalOperation(name: CommandName) {
    const { state } = this.telemetry.backyard;
    if (COMMANDS[name].read !== true && !isRunning(state)) {
      throw new SystemStateError({ command: name, backyardState: state });
    }
  }

  #gate(name: CommandName, params: Record<string, unknown>) {
    const inventory = this.inventory;

    const { requires = [], target } = COMMANDS[name];
    if (requires.length === 0 && target === undefined) {
      return;
    }
    omnilogicLog.trace("gate", { command: name, requires, target });

    if (inventory.bodies.length === 0) {
      omnilogicLog.debug("no bodies discovered; sending anyway", {
        command: name,
      });
      return;
    }

    const poolId = numberOf(params.poolId);
    if (poolId === undefined) {
      omnilogicLog.trace("no poolId to gate on; sending", { command: name });
      return;
    }

    const body = inventory.bodies.find((b) => b.systemId === poolId);
    if (body === undefined) {
      throw new EquipmentNotInstalledError({
        command: name,
        requirement: "body",
        poolId,
        inventory,
      });
    }

    const refuse = (requirement: string, hint?: string) => {
      throw new EquipmentNotInstalledError({
        command: name,
        requirement,
        poolId,
        hint,
        inventory,
      });
    };

    for (const path of requires) {
      if (!installedAt(body, path)) {
        refuse(path);
      }
    }

    // refuses the parent's id where the part's is wanted
    if (target === undefined || !target.includes(".")) {
      return;
    }
    const dot = target.indexOf(".");
    const ownerPath = target.slice(0, dot);
    if (!isInventoryPath(ownerPath)) {
      return;
    }
    const wanted = systemIdAt(body, target);
    const owner = systemIdAt(body, ownerPath);
    if (
      wanted !== undefined &&
      owner !== undefined &&
      params.equipmentId === owner &&
      owner !== wanted
    ) {
      refuse(
        target,
        `it takes the ${target.slice(dot + 1)} id (${wanted}), not the ${ownerPath}'s (${owner})`,
      );
    }
  }

  /**
   * Fetch and cache the latest telemetry and config
   */
  async refresh(
    options: {
      // fetch even when the cached config and telemetry are fresh
      refetch?: boolean;
      // fetch even from a controller the SDK would refuse
      force?: boolean;
    } = {},
  ) {
    const { refetch = false, force = false } = options;

    const now = Date.now() / 1000;
    const age = now - this.#telemetryLastUpdated;
    // a clock stepped backwards leaves the age negative
    const isStale = age >= this.#cacheTTL || age < 0;
    const dirty = this.#telemetryDirty;
    const shouldUpdate = refetch || dirty || isStale;

    if (!shouldUpdate) {
      omnilogicLog.trace("refresh skipped (not dirty, not stale)", {
        ageSeconds: Math.round(age),
        ttlSeconds: this.#cacheTTL,
      });
      return;
    }

    omnilogicLog.debug("refresh starting", {
      refetch,
      dirty,
      stale: isStale,
      ageSeconds: Math.round(age),
    });
    const started = Date.now();
    const seq = ++this.#refreshStarted;
    const writes = this.#writes;
    const telemetry = await this.fetchTelemetry();
    if (!force) {
      this.#refuseUnsupportedFirmware(telemetry);
    }
    const newChecksum = telemetry.backyard.configChksum;
    omnilogicLog.trace("telemetry fetched", {
      ms: Date.now() - started,
      checksum: newChecksum,
    });

    if (
      refetch ||
      this.#mspConfig === null ||
      newChecksum !== this.#configChecksum
    ) {
      omnilogicLog.debug("fetching config", {
        reason: refetch
          ? "refetching"
          : this.#mspConfig === null
            ? "none cached"
            : "checksum changed",
        checksum: newChecksum,
        previous: this.#configChecksum,
      });
      const configStarted = Date.now();
      const config = await this.fetchConfig();
      this.#configChecksum = newChecksum;
      omnilogicLog.trace("config fetched", { ms: Date.now() - configStarted });
      this.#adopt(config);
    } else {
      omnilogicLog.trace("config checksum unchanged, skipping fetch", {
        checksum: newChecksum,
      });
    }
    if (this.#telemetryCachedFrom > seq) {
      omnilogicLog.trace("telemetry superseded by a later refresh", {
        ms: Date.now() - started,
      });
      return;
    }
    this.#telemetry = telemetry;
    this.#telemetryCachedFrom = seq;
    this.#telemetryLastUpdated = now;
    this.#telemetryDirty = this.#writes !== writes;
  }
}
