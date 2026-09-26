import { defineConfig } from "prisma/config";

// .env is optional: the container passes its settings in the environment
try {
  process.loadEnvFile();
} catch {}

// imported after .env loads
const { databaseUrl, ensureDataDir } = await import("./src/server/db/database");

ensureDataDir();

export default defineConfig({
  schema: "src",
  migrations: { path: "prisma/migrations" },
  datasource: { url: databaseUrl },
});
