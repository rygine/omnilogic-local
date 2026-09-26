import { z } from "zod";

import { isValidHost } from "@/shared/host";

export const hostPort = z.object({
  host: z
    .string()
    .min(1)
    .refine(isValidHost, { message: "not an IP address or hostname" }),
  port: z.number().int().positive().max(65535),
});

// a stored read that asks the controller again even when a row is stored
export const withRefresh = hostPort.extend({
  refresh: z.boolean().optional(),
});

export const withBowId = hostPort.extend({
  bowId: z.number().int().nonnegative(),
});

export const withEquipmentId = withBowId.extend({
  equipmentId: z.number().int().nonnegative(),
});
