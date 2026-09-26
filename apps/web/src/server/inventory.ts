import type { OmniLogic, SysInfo } from "@rygine/omnilogic-local-sdk";

import { prisma } from "@/server/db/prisma";

// the system info and when it was read
export type SystemInventory = {
  info: SysInfo;
  // iso 8601
  readAt: string;
};

// the stored system info, read again on refresh, when nothing is stored, or after a firmware change
export const readInventory = async (
  omni: OmniLogic,
  {
    host,
    port,
    refresh = false,
  }: { host: string; port: number; refresh?: boolean },
): Promise<SystemInventory> => {
  const version = omni.mspVersion ?? null;
  const where = { host_port: { host, port } };
  const row = refresh
    ? null
    : await prisma.systemInventory.findUnique({ where });
  if (row !== null && (version === null || row.firmwareVersion === version)) {
    // our own write, from a SysInfo
    const info: SysInfo = JSON.parse(row.json);
    return { info, readAt: row.readAt };
  }
  const info = await omni.fetchSysInfo();
  const readAt = new Date().toISOString();
  const data = { firmwareVersion: version, json: JSON.stringify(info), readAt };
  await prisma.systemInventory.upsert({
    where,
    create: { host, port, ...data },
    update: data,
  });
  return { info, readAt };
};
