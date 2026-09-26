import path from "node:path";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  // nitro turns the build into a listening Node server at
  // .output/server/index.mjs, which the image runs; dev is unaffected
  plugins: [tanstackStart(), nitro(), react()],
});
