import { COMMANDS } from "@rygine/omnilogic-local-sdk";

import { NAME_MAX_BYTES, THEME_NAME_MAX } from "@/shared/names";

// the SDK's spec holds each command's name limit, the browser copies it
const nameLimit = (command: keyof typeof COMMANDS): number | undefined =>
  COMMANDS[command].request.flatMap((p) =>
    p.name === "name" && "maxLength" in p ? [p.maxLength] : [],
  )[0];

it("matches the name limits the SDK's spec declares", () => {
  expect(NAME_MAX_BYTES).toBe(nameLimit("UiEditConfigObjectName"));
  expect(THEME_NAME_MAX).toBe(nameLimit("SaveNewGroupCmd"));
  expect(THEME_NAME_MAX).toBe(nameLimit("SetGroupCmd"));
});
