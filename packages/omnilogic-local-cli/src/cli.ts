import { createRequire } from "node:module";
import { parseArgs } from "node:util";

import {
  COMMANDS,
  type CommandName,
  DEFAULT_PORT,
  type MSPConfig,
  OmniLogic,
  type OmniLogicProtocol,
  OmniValidationError,
  parseConfig,
  parseSysInfo,
  parseTelemetry,
} from "@rygine/omnilogic-local-sdk";

import { sendCommand } from "@/command";
import { RefusedError, UsageError } from "@/errors";
import { Store } from "@/store";
import {
  closestCommands,
  describeCommand,
  isCommandName,
  listCommands,
  usageOf,
} from "@/utils";

export type Io = {
  stdin: NodeJS.ReadableStream & { isTTY?: boolean };
  stdout: NodeJS.WritableStream;
  stderr: NodeJS.WritableStream;
  configDir: string;
  // for testing purposes only
  protocol?: OmniLogicProtocol;
};

const pkg: { version: string } = createRequire(import.meta.url)(
  "../package.json",
);

export const HELP = `Usage: omnilogic-local <command> [options]

Local control of a Hayward OmniLogic controller

Commands:
  config            Get the configuration
  telemetry         Get the current equipment status
  sysinfo           Get the hardware and firmware versions
  command <Name>    Send a command
  info [<Name>]     Describe a command, or list all

Options:
  --host <ip>          Controller address (env: OMNILOGIC_LOCAL_HOST)
  --port <n>           Controller port (env: OMNILOGIC_LOCAL_PORT, default: 10444)
  --format <xml|json>  Output format (default: xml)
  --cache-ttl <sec>    Seconds to reuse a fetched configuration (default: 300)
  -y, --yes            Send a write without asking
  --force              Send even where the checks would refuse
  -q, --quiet          Print only the result
  -v, --verbose        Show the XML sent and the ids resolved
  --debug              Show the SDK log
  -h, --help           Show help
  --version            Show version

Run 'omnilogic-local command <Name> --help' for more on a command.
`;

const GLOBAL_OPTIONS = {
  host: { type: "string" },
  port: { type: "string" },
  format: { type: "string", default: "xml" },
  "cache-ttl": { type: "string", default: "300" },
  yes: { type: "boolean", short: "y", default: false },
  force: { type: "boolean", default: false },
  quiet: { type: "boolean", short: "q", default: false },
  verbose: { type: "boolean", short: "v", default: false },
  debug: { type: "boolean", default: false },
  help: { type: "boolean", short: "h", default: false },
  version: { type: "boolean", default: false },
} as const;

// every command's flags, so one placed before the command name keeps its value
const ALL_FLAGS = Object.fromEntries(
  Object.values(COMMANDS).flatMap((spec) =>
    spec.request.map((p) => [p.name, { type: "string" as const }]),
  ),
);

// the commands
const CAP = {
  config: 1,
  telemetry: 1,
  sysinfo: 1,
  info: 2,
  command: 2,
} as const;

// the three fetches
const FETCHES = {
  config: async (o: OmniLogic, store: Store) => {
    const xml = await o.fetchConfig({ raw: true });
    const parsed = parseConfig(xml);
    store.cacheConfig(parsed);
    return { xml, parsed };
  },
  telemetry: async (o: OmniLogic) => {
    const xml = await o.fetchTelemetry({ raw: true });
    return { xml, parsed: parseTelemetry(xml) };
  },
  sysinfo: async (o: OmniLogic) => {
    const xml = await o.fetchSysInfo({ raw: true });
    return { xml, parsed: parseSysInfo(xml) };
  },
};

const isCommand = (command: string): command is keyof typeof CAP =>
  Object.hasOwn(CAP, command);

const str = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

const unknownCommand = (name: string): UsageError => {
  const close = closestCommands(name);
  return new UsageError(
    close.length === 0
      ? `unknown command "${name}"; see 'omnilogic-local info'`
      : `unknown command "${name}"; did you mean ${close.join(", ")}?`,
  );
};

const namedCommand = (name: string | undefined): CommandName => {
  if (name === undefined) {
    throw new UsageError("command needs a name; see 'omnilogic-local info'");
  }
  if (!isCommandName(name)) {
    throw unknownCommand(name);
  }
  return name;
};

const wholeNumber = (text: string | undefined): number =>
  text !== undefined && /^\d+$/.test(text) ? Number(text) : Number.NaN;

const isParseError = (error: unknown): error is Error =>
  error instanceof Error &&
  "code" in error &&
  typeof error.code === "string" &&
  error.code.startsWith("ERR_PARSE_ARGS");

const dispatch = async (argv: string[], io: Io): Promise<number> => {
  const { values, positionals } = parseArgs({
    args: argv,
    options: { ...ALL_FLAGS, ...GLOBAL_OPTIONS },
    allowPositionals: true,
    strict: false,
  });
  const [command, name] = positionals;
  const out = (text: string): void => {
    io.stdout.write(text.endsWith("\n") ? text : `${text}\n`);
  };
  const say = (line: string): void => {
    if (!values.quiet) {
      io.stderr.write(`${line}\n`);
    }
  };

  if (values.version) {
    out(pkg.version);
    return 0;
  }
  if (
    command === undefined ||
    (values.help && !(command === "command" && name !== undefined))
  ) {
    out(HELP);
    return 0;
  }

  if (!isCommand(command)) {
    throw new UsageError(`unknown command "${command}"; see --help`);
  }
  const job =
    command === "command"
      ? { command, name: namedCommand(name) }
      : { command, name: undefined };

  const flags =
    job.name === undefined
      ? {}
      : Object.fromEntries(
          COMMANDS[job.name].request.map((p) => [
            p.name,
            { type: "string" as const },
          ]),
        );
  const strict = parseArgs({
    args: argv,
    options: { ...GLOBAL_OPTIONS, ...flags },
    allowPositionals: true,
    strict: true,
  });
  const strictValues: Record<string, string | boolean | undefined> =
    strict.values;
  const cap = CAP[command];
  if (strict.positionals.length > cap) {
    const extra = strict.positionals[cap];
    throw new UsageError(
      command === "command"
        ? `unexpected argument "${extra}"; parameters are flags, see 'omnilogic-local command ${name} --help'`
        : `unexpected argument "${extra}"`,
    );
  }

  const format = values.format;
  if (typeof format !== "string" || (format !== "xml" && format !== "json")) {
    throw new UsageError(
      `--format must be xml or json, got "${String(format)}"`,
    );
  }
  if (values.debug) {
    process.env.LOG_LEVEL ??= "debug";
  }

  if (job.command === "info") {
    if (name === undefined) {
      out(
        format === "json" ? JSON.stringify(COMMANDS, null, 2) : listCommands(),
      );
      return 0;
    }
    if (!isCommandName(name)) {
      throw unknownCommand(name);
    }
    out(
      format === "json"
        ? JSON.stringify(COMMANDS[name], null, 2)
        : describeCommand(name),
    );
    return 0;
  }
  if (job.name !== undefined && values.help) {
    out(`${usageOf(job.name)}\n\n${describeCommand(job.name)}`);
    return 0;
  }

  const host = str(values.host) ?? process.env.OMNILOGIC_LOCAL_HOST;
  if (host === undefined || host === "") {
    throw new UsageError("--host or OMNILOGIC_LOCAL_HOST is required");
  }
  const portText =
    str(values.port) ?? (process.env.OMNILOGIC_LOCAL_PORT || undefined);
  const port = portText === undefined ? DEFAULT_PORT : wholeNumber(portText);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new UsageError(
      `--port must be a whole number from 1 to 65535, got "${portText}"`,
    );
  }
  const cacheTtlText = str(values["cache-ttl"]);
  const cacheTtl = wholeNumber(cacheTtlText);
  if (!Number.isInteger(cacheTtl) || cacheTtl < 0) {
    throw new UsageError(
      `--cache-ttl must be a whole number of seconds, got "${cacheTtlText}"`,
    );
  }
  const store = new Store(io.configDir, say);
  const session = (config?: MSPConfig): OmniLogic =>
    new OmniLogic({ host, port, config, protocol: io.protocol });

  if (job.command === "command") {
    const params: Record<string, string> = {};
    for (const p of COMMANDS[job.name].request) {
      const value = str(strictValues[p.name]);
      if (value !== undefined) {
        params[p.name] = value;
      }
    }
    return sendCommand({
      name: job.name,
      params,
      format,
      cacheTtl,
      yes: values.yes === true,
      force: values.force === true,
      verbose: values.verbose === true,
      stdin: io.stdin,
      stderr: io.stderr,
      store,
      session,
      say,
      out,
    });
  }

  say(`${job.command}: fetching from ${host}:${port}`);
  const { xml, parsed } = await FETCHES[job.command](session(), store);
  out(format === "json" ? JSON.stringify(parsed, null, 2) : xml);
  return 0;
};

// return codes: 0 done, 1 failed, 2 mistyped, 3 not confirmed
export const run = async (argv: string[], io: Io): Promise<number> => {
  try {
    return await dispatch(argv, io);
  } catch (error) {
    const debug = argv.includes("--debug");
    if (
      error instanceof UsageError ||
      error instanceof OmniValidationError ||
      isParseError(error)
    ) {
      io.stderr.write(`${error.message}\n`);
      return 2;
    }
    if (error instanceof RefusedError) {
      io.stderr.write(`${error.message}\n`);
      return 3;
    }
    const text =
      error instanceof Error
        ? debug && error.stack
          ? error.stack
          : error.message
        : String(error);
    io.stderr.write(`${text}\n`);
    return 1;
  }
};
