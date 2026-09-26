import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

// two projects: the plugin under node, the settings page in chromium
export default defineConfig({
  test: {
    projects: [
      {
        resolve: { tsconfigPaths: true },
        test: { name: "node", globals: true, include: ["test/*.test.ts"] },
      },
      {
        resolve: { tsconfigPaths: true },
        test: {
          name: "browser",
          globals: true,
          include: ["test/browser/*.test.ts"],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
