import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { DefaultTheme } from "vitepress";

import { readCommandPages } from "./commands/pages.js";
import { AREAS } from "./commands/schema.js";

type Group = DefaultTheme.SidebarItem;

// typedoc's links carry a .md extension
const stripMd = (items: Group[]): Group[] =>
  items.map((i) => ({
    ...i,
    ...(i.link && { link: i.link.replace(/\.md$/, "") }),
    ...(i.items && { items: stripMd(i.items) }),
  }));

// written by typedoc at build time
const apiSidebar = (): Group[] => {
  const file = join(
    import.meta.dirname,
    "..",
    "reference",
    "api",
    "typedoc-sidebar.json",
  );
  if (!existsSync(file)) {
    return [];
  }
  const items: Group[] = JSON.parse(readFileSync(file, "utf8"));
  return stripMd(items);
};

const AREA_LABELS: Record<(typeof AREAS)[number], string> = {
  equipment: "Equipment",
  heater: "Heater",
  chlorinator: "Chlorinator",
  csad: "Chemistry Sense and Dispense",
  schedules: "Schedules",
  favorites: "Favorites",
  themes: "Themes",
  panel: "Panel",
  system: "System",
  diagnostics: "Diagnostics",
};

const commandGroups = (): Group[] => {
  const pages = readCommandPages();
  return AREAS.map((area) => ({
    text: AREA_LABELS[area],
    collapsed: true,
    items: pages
      .filter((p) => p.frontmatter.area === area)
      .map((p) => ({ text: p.name, link: `/commands/${p.name}` })),
  })).filter((g) => (g.items?.length ?? 0) > 0);
};

export const sidebar: Record<string, Group[]> = {
  "/guide/": [
    {
      text: "Overview",
      items: [
        { text: "Getting started", link: "/guide/" },
        { text: "Supported hardware", link: "/guide/hardware" },
        { text: "The command line", link: "/guide/cli" },
        { text: "Homebridge plugin", link: "/guide/homebridge" },
        { text: "Home Assistant bridge", link: "/guide/home-assistant" },
        { text: "The web app", link: "/guide/web-app" },
      ],
    },
    {
      text: "Using the SDK",
      items: [
        { text: "Quick start", link: "/guide/quick-start" },
        { text: "Controlling equipment", link: "/guide/equipment" },
        { text: "Schedules", link: "/guide/schedules" },
        { text: "Favorites", link: "/guide/favorites" },
        { text: "Themes", link: "/guide/themes" },
        { text: "Sending commands", link: "/guide/commands" },
        { text: "Inventory", link: "/guide/inventory" },
        { text: "Errors", link: "/guide/errors" },
        { text: "Logging", link: "/guide/logging" },
        { text: "Troubleshooting", link: "/guide/troubleshooting" },
      ],
    },
  ],
  "/reference/": [
    { text: "Reference", items: [{ text: "Overview", link: "/reference/" }] },
    { text: "API", items: apiSidebar() },
  ],
  "/commands/": [
    {
      text: "Commands",
      items: [
        { text: "Overview", link: "/commands/" },
        { text: "Status", link: "/commands/status" },
      ],
    },
    ...commandGroups(),
  ],
  "/contribute/": [
    {
      text: "Contribute",
      items: [
        { text: "Overview", link: "/contribute/" },
        { text: "Editing a page", link: "/contribute/editing" },
        { text: "Verifying a command", link: "/contribute/verifying" },
        { text: "Sending logs", link: "/contribute/logs" },
        { text: "Reporting a bug", link: "/contribute/bugs" },
      ],
    },
  ],
};
