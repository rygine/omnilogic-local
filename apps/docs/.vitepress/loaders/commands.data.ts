import { type CommandFacts, factsFor } from "../commands/facts.js";
import { readCommandPages } from "../commands/pages.js";
import type { CommandFrontmatter } from "../commands/schema.js";

type CommandRow = { name: string; url: string } & CommandFrontmatter &
  CommandFacts;

declare const data: CommandRow[];
export { data };

export default {
  watch: ["../../commands/*.md"],
  load: (): CommandRow[] =>
    readCommandPages()
      .map(({ name, frontmatter }) => ({
        name,
        url: `/commands/${name}`,
        ...frontmatter,
        ...factsFor(name, frontmatter.status),
      }))
      .toSorted((a, b) => a.name.localeCompare(b.name)),
};
