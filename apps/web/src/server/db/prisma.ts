import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { createServerOnlyFn } from "@tanstack/react-start";

import { PrismaClient } from "@/generated/prisma/client";
import { databaseUrl, ensureDataDir } from "@/server/db/database";

const createClient = () => {
  ensureDataDir();
  const adapter = new PrismaBetterSqlite3({ url: databaseUrl });
  return new PrismaClient({ adapter });
};

const getPrisma = createServerOnlyFn(createClient);

export const prisma = getPrisma();
