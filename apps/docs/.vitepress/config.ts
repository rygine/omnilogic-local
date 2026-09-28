import { defineConfig } from "vitepress";

import { nav } from "./nav.js";
import { sidebar } from "./sidebar.js";

export default defineConfig({
  title: "OmniLogicLocal",
  description: "TypeScript SDK for the Hayward OmniLogic local API via UDP.",
  cleanUrls: true,
  lastUpdated: true,
  // the logo files are shared with the web app and the README
  vite: { publicDir: "../../brand" },
  // head links are not prefixed with the base the Pages build passes
  transformHead: ({ siteData: { base } }) => [
    [
      "link",
      { rel: "icon", type: "image/svg+xml", href: `${base}favicon.svg` },
    ],
  ],
  themeConfig: {
    logo: { light: "/logo.svg", dark: "/logo-dark.svg", alt: "" },
    nav: [...nav],
    sidebar,
    search: { provider: "local" },
    editLink: {
      pattern:
        "https://github.com/rygine/omnilogic-local/edit/main/apps/docs/:path",
      text: "Suggest changes to this page",
    },
    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/rygine/omnilogic-local",
      },
    ],
    footer: {
      message:
        "This software is not produced, endorsed, or supported by Hayward Industries, Inc. " +
        "\u201cHayward\u201d and \u201cOmniLogic\u201d are trademarks of their respective owners.",
      copyright: "MIT Licensed | Copyright \u00a9 2026 Ry Racherbaumer",
    },
  },
});
