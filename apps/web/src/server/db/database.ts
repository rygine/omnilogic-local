import { accessSync, constants, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const dataDir = process.env.DATA_DIR ?? "./data";
const databasePath = join(dataDir, "app.db");
export const databaseUrl = `file:${databasePath}`;

export const ensureDataDir = () => {
  try {
    mkdirSync(dataDir, { recursive: true });
  } catch (cause) {
    throw new Error(`${resolve(dataDir)} could not be created`, { cause });
  }
  try {
    accessSync(dataDir, constants.R_OK | constants.W_OK);
  } catch (cause) {
    throw new Error(`${resolve(dataDir)} must be readable and writable`, {
      cause,
    });
  }
};
