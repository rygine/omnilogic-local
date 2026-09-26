import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import type { DefaultTheme } from "vitepress";

import { nav } from "../.vitepress/nav";
import { sidebar } from "../.vitepress/sidebar";

const root = join(import.meta.dirname, "..");

// every link in a sidebar, flattened
const sidebarLinks = (
  s: Record<string, DefaultTheme.SidebarItem[]>,
): string[] => {
  const out: string[] = [];
  const walk = (items: DefaultTheme.SidebarItem[]) => {
    for (const i of items) {
      if (i.link) {
        out.push(i.link);
      }
      if (i.items) {
        walk(i.items);
      }
    }
  };
  for (const groups of Object.values(s)) {
    walk(groups);
  }
  return out;
};

// every markdown page under an area, as a clean url, generated api pages aside
const pagesUnder = (dir: string): string[] => {
  const out: string[] = [];
  const walk = (d: string, prefix: string) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) {
        if (f !== "api") {
          walk(p, `${prefix}${f}/`);
        }
      } else if (f.endsWith(".md")) {
        out.push(f === "index.md" ? prefix : `${prefix}${f.slice(0, -3)}`);
      }
    }
  };
  walk(join(root, dir), `/${dir}/`);
  return out;
};

describe("sidebar", () => {
  it("has a sidebar per nav area", () => {
    expect(Object.keys(sidebar).toSorted()).toEqual(
      nav.map((n) => n.link).toSorted(),
    );
  });

  it("lists every page under each area", () => {
    for (const n of nav) {
      const dir = n.link.replaceAll("/", "");
      const links = new Set(sidebarLinks({ [n.link]: sidebar[n.link]! }));
      const missing = pagesUnder(dir).filter((p) => !links.has(p));
      expect({ area: n.link, missing }).toEqual({ area: n.link, missing: [] });
    }
  });

  it("links only to pages that exist", () => {
    const dead = sidebarLinks(sidebar).filter((l) => {
      const file = l.endsWith("/") ? `${l}index.md` : `${l}.md`;
      return !existsSync(join(root, file));
    });
    expect(dead).toEqual([]);
  });
});
