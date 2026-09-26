import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import matter from "gray-matter";

import { commandFrontmatter, type CommandFrontmatter } from "./schema.js";

export const COMMANDS_DIR = join(import.meta.dirname, "..", "..", "commands");

// the area's own pages, which carry no command frontmatter
const NOT_COMMANDS = new Set(["index.md", "status.md"]);

type CommandPage = { name: string; frontmatter: CommandFrontmatter };

export const readCommandPages = (): CommandPage[] =>
  readdirSync(COMMANDS_DIR)
    .filter((f) => f.endsWith(".md") && !NOT_COMMANDS.has(f))
    .toSorted()
    .map((f) => {
      const { data } = matter(readFileSync(join(COMMANDS_DIR, f), "utf8"));
      const parsed = commandFrontmatter.safeParse(data);
      if (!parsed.success) {
        throw new Error(
          `${f}: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`,
        );
      }
      return { name: f.slice(0, -3), frontmatter: parsed.data };
    });
