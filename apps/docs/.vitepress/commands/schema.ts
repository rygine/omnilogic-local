import { z } from "zod";

export const AREAS = [
  "equipment",
  "heater",
  "chlorinator",
  "csad",
  "schedules",
  "favorites",
  "themes",
  "panel",
  "system",
  "diagnostics",
] as const;

const STATUSES = ["verified", "unverified", "unusable"] as const;

export const commandFrontmatter = z.object({
  opcode: z.number().int().nonnegative(),
  area: z.enum(AREAS),
  status: z.enum(STATUSES),
  summary: z
    .string()
    .min(1)
    .max(180)
    .refine((s) => !/[*`]|^>/.test(s), "summary carries markdown"),
  firmware: z.array(z.string().min(1)),
  models: z.array(z.string().min(1)),
});

export type CommandFrontmatter = z.infer<typeof commandFrontmatter>;
