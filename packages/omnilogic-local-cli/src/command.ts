import { once } from "node:events";
import { createInterface } from "node:readline/promises";

import {
  buildCommandXml,
  type CommandName,
  COMMANDS,
  isRunning,
  findBySystemId,
  type MSPConfig,
  type OmniLogic,
  SystemStateError,
} from "@rygine/omnilogic-local-sdk";

import { RefusedError, UsageError } from "@/errors";
import type { Store } from "@/store";
import { timerDefault } from "@/utils";

export type CommandRun = {
  name: CommandName;
  // the flags as typed
  params: Record<string, string>;
  format: "xml" | "json";
  cacheTtl: number;
  yes: boolean;
  force: boolean;
  verbose: boolean;
  stdin: NodeJS.ReadableStream & { isTTY?: boolean };
  stderr: NodeJS.WritableStream;
  store: Store;
  session: (config?: MSPConfig) => OmniLogic;
  say: (line: string) => void;
  out: (text: string) => void;
};

// the configuration to check against
const cachedConfig = async (run: CommandRun): Promise<MSPConfig> => {
  const cached = run.store.cachedConfig();
  if (cached !== undefined && cached.ageSeconds < run.cacheTtl) {
    run.say(`config: cached ${cached.ageSeconds}s ago`);
    return cached.config;
  }
  run.say("config: fetching");
  const config = await run.session().fetchConfig();
  run.store.cacheConfig(config);
  return config;
};

const confirm = async (run: CommandRun): Promise<void> => {
  if (run.stdin.isTTY !== true) {
    throw new RefusedError(`refusing to send ${run.name} without --yes`);
  }
  const rl = createInterface({ input: run.stdin, output: run.stderr });
  // closing stdin answers no
  const answer = (
    await Promise.race([
      // ctrl-c answers no
      rl
        .question(`${run.name} writes to the controller. Send it? [y/N/a] `)
        .catch(() => ""),
      once(rl, "close").then(() => ""),
    ])
  )
    .trim()
    .toLowerCase();
  rl.close();
  if (answer === "a") {
    run.store.addSafe(run.name);
    return;
  }
  if (answer !== "y") {
    throw new RefusedError(`${run.name} not sent`);
  }
};

export const sendCommand = async (run: CommandRun): Promise<number> => {
  const spec = COMMANDS[run.name];

  const params: Record<string, number | string> = {};
  for (const p of spec.request) {
    const text = run.params[p.name];
    if (text === undefined) {
      const fallback = timerDefault(spec.request, p.name);
      if (fallback === undefined) {
        throw new UsageError(`${run.name}: --${p.name} is required`);
      }
      params[p.name] = fallback;
      continue;
    }
    if (p.type === "string") {
      params[p.name] = text;
    } else {
      if (!/^-?\d+(\.\d+)?$/.test(text)) {
        throw new UsageError(
          `${run.name}: --${p.name} must be a number, got "${text}"`,
        );
      }
      params[p.name] = Number(text);
    }
  }
  const { xml } = buildCommandXml(run.name, params);
  run.say(
    [
      run.name + ":",
      ...spec.request.map((p) => `${p.name}=${params[p.name]}`),
    ].join(" "),
  );

  if (run.verbose) {
    run.say(`  request: ${xml}`);
  }

  const seed = run.force ? undefined : await cachedConfig(run);
  const omni = run.session(seed);
  if (seed !== undefined) {
    await omni.refresh();
    if (omni.configChecksum !== seed.checksum) {
      run.say("config: changed on the controller; caching the new one");
      run.store.cacheConfig(omni.config);
    }
    const { config } = omni;
    for (const p of spec.request) {
      const id = params[p.name];
      if (!p.name.endsWith("Id") || typeof id !== "number") {
        continue;
      }
      const notFound = (): UsageError =>
        new UsageError(
          `${p.name} ${id}: nothing in the configuration has that id`,
        );
      // a schedule's id lives under scheduleSystemId, not systemId
      if (p.name === "scheduleId") {
        const schedule = config.schedules.find(
          (s) => s.scheduleSystemId === id,
        );
        if (schedule === undefined) {
          throw notFound();
        }
        if (run.verbose) {
          run.say(`  ${p.name} ${id}: "(schedule)"`);
        }
        continue;
      }
      const record = findBySystemId(config, id);
      if (record === undefined) {
        throw notFound();
      }
      if (run.verbose) {
        run.say(
          `  ${p.name} ${id}: ${JSON.stringify(record.name ?? "(unnamed)")}`,
        );
      }
    }
    // denied outside normal operation
    const { state } = omni.telemetry.backyard;
    if (spec.read !== true && !isRunning(state)) {
      throw new SystemStateError({ command: run.name, backyardState: state });
    }
  }

  if (spec.read !== true && !run.yes && !run.store.safe().includes(run.name)) {
    await confirm(run);
  }

  const options = { force: run.force };
  const reply =
    run.format === "xml"
      ? await omni.command(run.name, params, { ...options, raw: true })
      : await omni.command(run.name, params, options);
  run.say(reply === undefined ? "sent; acknowledged" : "sent; reply received");
  if (reply !== undefined) {
    run.out(typeof reply === "string" ? reply : JSON.stringify(reply, null, 2));
  }
  return 0;
};
