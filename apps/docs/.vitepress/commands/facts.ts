import { COMMANDS, type SWITCH_OPCODE } from "@rygine/omnilogic-local-sdk";

export type CommandFacts = { type?: string; note?: string };

const specs: Record<string, (typeof COMMANDS)[keyof typeof COMMANDS]> =
  COMMANDS;

// the method that sends each opcode the network switch answers
const FETCH: Record<string, string> = {
  RequestConfiguration: "fetchConfig()",
  GetTelemetry: "fetchTelemetry()",
  GetSysInfo: "fetchSysInfo()",
} satisfies Record<keyof typeof SWITCH_OPCODE, string>;

// what the spec says about a command beyond its page's frontmatter
export const factsFor = (name: string, status: string): CommandFacts => {
  const spec = specs[name];
  if (spec === undefined) {
    const fetch = FETCH[name];
    return {
      note: fetch
        ? `The SDK sends this command through \`${fetch}\`. \`command()\` cannot send it.`
        : "This command is not in the SDK's spec, so `command()` cannot send it.",
    };
  }
  const caveat = spec.caveat;
  const notes = [
    caveat &&
      `This command ${caveat.effect}.${caveat.alternative ? ` Use ${caveat.alternative} instead.` : ""}`,
    // a read the spec declares no reply for, unless the controller was seen to discard it
    spec.read === true &&
      !spec.response &&
      status !== "unusable" &&
      "The SDK has no reply format for this command, so `command()` returns nothing. The controller can still send a reply, for example when certain equipment is installed.",
  ].filter(Boolean);
  return {
    type: spec.read === true ? "Read" : "Write",
    note: notes.length > 0 ? notes.join(" ") : undefined,
  };
};
