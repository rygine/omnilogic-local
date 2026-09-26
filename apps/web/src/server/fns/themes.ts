import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { THEME_NAME_MAX, utf8Bytes } from "@/shared/names";

import { readController, writeController } from "../controller-cache";
import { serializeThemes, type ThemeSummary } from "../serializers";
import { hostPort } from "./_validators";

const withThemeId = hostPort.extend({
  themeId: z.number().int().nonnegative(),
});

// saved themes and which ones are running
export const getThemes = createServerFn({ method: "POST" })
  .validator(hostPort)
  .handler(({ data }): Promise<ThemeSummary[]> =>
    readController(
      data.host,
      data.port,
      async (omni) => serializeThemes(omni),
      "getThemes",
    ),
  );

// runs or stops a theme, for the given minutes under the controller's countdown
export const activateTheme = createServerFn({ method: "POST" })
  .validator(
    withThemeId.extend({
      on: z.boolean(),
      minutes: z
        .number()
        .int()
        .min(1)
        .max(23 * 60 + 59)
        .optional(),
    }),
  )
  .handler(({ data }): Promise<void> =>
    writeController(
      data.host,
      data.port,
      (omni) =>
        omni.backyard.themes.run(data.themeId, data.on, {
          minutes: data.minutes,
        }),
      "activateTheme",
    ),
  );

const themeName = z
  .string()
  .trim()
  .min(1, "A name is required")
  .refine((s) => utf8Bytes(s) <= THEME_NAME_MAX, {
    message: `Names are at most ${THEME_NAME_MAX} bytes`,
  });

// saves every device's state as a new theme
export const createTheme = createServerFn({ method: "POST" })
  .validator(hostPort.extend({ name: themeName }))
  .handler(({ data }): Promise<ThemeSummary> =>
    writeController(
      data.host,
      data.port,
      async (omni) => {
        const theme = await omni.backyard.themes.create(data.name);
        return {
          id: theme.systemId,
          name: theme.name,
          active: false,
          equipment: [],
        };
      },
      "createTheme",
    ),
  );

const renameThemeInput = withThemeId.extend({ name: themeName });

export const renameTheme = createServerFn({ method: "POST" })
  .validator(renameThemeInput)
  .handler(({ data }): Promise<void> =>
    writeController(
      data.host,
      data.port,
      (omni) => omni.backyard.themes.rename(data.themeId, data.name),
      "renameTheme",
    ),
  );

// deleting an absent theme does nothing
export const deleteTheme = createServerFn({ method: "POST" })
  .validator(withThemeId)
  .handler(({ data }): Promise<void> =>
    writeController(
      data.host,
      data.port,
      (omni) => omni.backyard.themes.remove(data.themeId),
      "deleteTheme",
    ),
  );
