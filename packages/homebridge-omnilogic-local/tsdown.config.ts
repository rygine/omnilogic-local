import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: { index: "src/index.ts", "ui/server": "src/ui/server.ts" },
    format: "esm",
    fixedExtension: false,
    copy: [{ from: "src/ui/public", to: "dist/ui" }],
    sourcemap: true,
  },
  // the settings page, bundled for the browser
  {
    entry: { "ui/public/page": "src/ui/page.ts" },
    format: "esm",
    fixedExtension: false,
    platform: "browser",
    target: "esnext",
    sourcemap: true,
  },
]);
