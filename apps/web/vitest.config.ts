import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

// two projects: server tests under node (they import the SDK, whose node:dgram
// import cannot load in a browser environment), component tests in chromium
export default defineConfig({
  test: {
    projects: [
      {
        resolve: { tsconfigPaths: true },
        test: {
          name: "server",
          environment: "node",
          globals: true,
          include: ["src/**/*.test.ts"],
        },
      },
      {
        plugins: [tanstackStart(), react()],
        resolve: { tsconfigPaths: true },
        test: {
          name: "browser",
          globals: true,
          setupFiles: ["./tests/setup.ts"],
          css: { modules: { classNameStrategy: "non-scoped" } },
          include: ["tests/**/*.{test,spec}.{ts,tsx}"],
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
