import { readFileSync } from "node:fs";
import { join } from "node:path";

import matter from "gray-matter";

import { COMMANDS_DIR, readCommandPages } from "../.vitepress/commands/pages";

// what a command page is: these sections, in this order, and nothing about how a fact was found
const SECTIONS = [
  "Parameters",
  "Reply",
  "Example",
  "Request XML",
  "Response XML",
];
const BANNED =
  /\bhandler|decompil|offset|ledger|\bprobed\b|reference pool|reference controller|\bowner|consent|verified live|0x[0-9a-f]{3,}|FUN_|\d{4}-\d\d-\d\d|\.ts\b/i;

const pages = readCommandPages().map((p) => `${p.name}.md`);

describe("command page shape", () => {
  it("has the sections in order, or none for an opcode the SDK does not send", () => {
    const wrong: string[] = [];
    for (const f of pages) {
      const { content } = matter(readFileSync(join(COMMANDS_DIR, f), "utf8"));
      // a heading may carry an inline component, such as the reply opcode pill
      const found = [...content.matchAll(/^## (.+)$/gm)].map((m) =>
        m[1]!.replace(/\s*<[^>]+>/g, ""),
      );
      const ok =
        found.join("|") === SECTIONS.join("|") ||
        found.join("|") === SECTIONS.slice(3).join("|");
      if (!ok) {
        wrong.push(`${f}: ${found.join(", ")}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it("says nothing about how a fact was established", () => {
    const hits: string[] = [];
    for (const f of pages) {
      const { data, content } = matter(
        readFileSync(join(COMMANDS_DIR, f), "utf8"),
      );
      const prose = content.replace(/```[\s\S]*?```/g, "");
      for (const text of [String(data.summary), prose]) {
        const m = text.match(BANNED);
        if (m) {
          hits.push(`${f}: ${m[0]}`);
        }
      }
    }
    expect(hits).toEqual([]);
  });
});
