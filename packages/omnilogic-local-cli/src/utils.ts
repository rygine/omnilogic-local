import {
  COMMANDS,
  type CommandName,
  type CommandRequestParam,
  timerParams,
} from "@rygine/omnilogic-local-sdk";

const TIMER_DEFAULTS: Record<string, number> = timerParams();
const TIMER_NAMES = Object.keys(TIMER_DEFAULTS);

// timer defaults when none are given
export const timerDefault = (
  request: CommandRequestParam[],
  name: string,
): number | undefined =>
  TIMER_NAMES.every((t) => request.some((p) => p.name === t))
    ? TIMER_DEFAULTS[name]
    : undefined;

export const isCommandName = (name: string): name is CommandName =>
  Object.hasOwn(COMMANDS, name);

const names = (): CommandName[] =>
  Object.keys(COMMANDS).filter(isCommandName).toSorted();

export const closestCommands = (query: string): string[] => {
  const q = query.toLowerCase();
  return names()
    .filter((n) => n.toLowerCase().includes(q))
    .slice(0, 5);
};

const kind = (name: CommandName): string =>
  COMMANDS[name].read === true ? "read" : "write";

export const listCommands = (): string => {
  const all = names();
  const width = Math.max(...all.map((n) => n.length));
  return all
    .map(
      (n) =>
        `${n.padEnd(width)}  ${String(COMMANDS[n].opcode).padStart(4)}  ${kind(n)}`,
    )
    .join("\n");
};

const describeParam = (p: CommandRequestParam): string => {
  if (p.type === "string") {
    return p.values
      ? p.values.join(" | ")
      : `string, at most ${p.maxLength} bytes`;
  }
  if (p.type === "float") {
    return "float";
  }
  return p.type === "byte" ? "byte 0..255" : "int -2147483648..2147483647";
};

export const usageOf = (name: CommandName): string => {
  const request = COMMANDS[name].request;
  const usage = [
    `Usage: omnilogic-local command ${name}`,
    ...request.map((p) =>
      timerDefault(request, p.name) === undefined
        ? `--${p.name} <${p.type}>`
        : `[--${p.name} <${p.type}>]`,
    ),
  ].join(" ");
  return request.some((p) => p.type !== "string")
    ? `${usage}\n\nA negative value is written --flag=-5.`
    : usage;
};

export const describeCommand = (name: CommandName): string => {
  const spec = COMMANDS[name];
  const lines = [`${name}  opcode ${spec.opcode}  ${kind(name)}`];
  const width = Math.max(0, ...spec.request.map((p) => p.name.length));
  for (const p of spec.request) {
    const fallback = timerDefault(spec.request, p.name);
    lines.push(
      `  --${p.name.padEnd(width)}  ${describeParam(p)}${fallback === undefined ? "" : ` (default: ${fallback})`}`,
    );
  }
  if (spec.request.length === 0) {
    lines.push("  (no parameters)");
  }
  if (spec.response === undefined) {
    lines.push("reply: acknowledged only");
  } else {
    const fields = spec.response.parameters
      .map(
        (p) =>
          `${p.name} ${p.dataType}${p.unit === undefined ? "" : ` ${p.unit}`}`,
      )
      .join(", ");
    lines.push(
      `reply: ${spec.response.name} (opcode ${spec.response.opcode}): ${fields}`,
    );
  }
  const flags: string[] = [];
  if (spec.read) {
    flags.push("read");
  }
  if (spec.settle) {
    flags.push("settle");
  }
  if (flags.length > 0) {
    lines.push(`flags: ${flags.join(", ")}`);
  }
  if (spec.requires !== undefined && spec.requires.length > 0) {
    lines.push(`requires: ${spec.requires.join(", ")}`);
  }
  if (spec.target !== undefined) {
    lines.push(`target: ${spec.target}`);
  }
  if (spec.caveat !== undefined) {
    const { effect, alternative } = spec.caveat;
    lines.push(
      `caveat: ${effect}${alternative === undefined ? "" : ` (use ${alternative})`}`,
    );
  }
  return lines.join("\n");
};
