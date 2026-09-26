import type { OmniLogic } from "@rygine/omnilogic-local-sdk";

import { readController } from "@/server/controller-cache";
import { prisma } from "@/server/db/prisma";

// a controller setting kept in the database, with the iso 8601 time it was read or written
export type Stored<T> = { value: T; readAt: string };

type Target = { host: string; port: number };

const where = ({ host, port }: Target, key: string) => ({
  host_port_key: { host, port, key },
});

export const findStored = async <T>(
  target: Target,
  key: string,
): Promise<Stored<T> | null> => {
  const row = await prisma.storedSetting.findUnique({
    where: where(target, key),
  });
  if (row === null) {
    return null;
  }
  // our own write, from a value of T
  const value: T = JSON.parse(row.json);
  return { value, readAt: row.readAt };
};

export const storeSetting = async <T>(
  target: Target,
  key: string,
  value: T,
): Promise<Stored<T>> => {
  const readAt = new Date().toISOString();
  const data = { json: JSON.stringify(value), readAt };
  await prisma.storedSetting.upsert({
    where: where(target, key),
    create: { host: target.host, port: target.port, key, ...data },
    update: data,
  });
  return { value, readAt };
};

// merges a write's fields into the stored setting, if one is stored
export const patchStored = async <T extends object>(
  target: Target,
  key: string,
  patch: Partial<T>,
): Promise<void> => {
  const current = await findStored<T>(target, key);
  if (current === null) {
    return;
  }
  await storeSetting(target, key, { ...current.value, ...patch });
};

// the stored setting, else the controller's value, stored
export const readStoredSetting = async <T>(
  target: Target,
  key: string,
  // asks the controller even when a setting is stored
  refresh: boolean,
  op: string,
  read: (omni: OmniLogic) => Promise<T>,
): Promise<Stored<T>> => {
  const stored = refresh ? null : await findStored<T>(target, key);
  if (stored !== null) {
    return stored;
  }
  return readController(
    target.host,
    target.port,
    async (omni) => storeSetting(target, key, await read(omni)),
    op,
    // a refresh also refetches the configuration and telemetry
    refresh,
  );
};
