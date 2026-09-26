import { HEATER_MODE as SDK_HEATER_MODE } from "@rygine/omnilogic-local-sdk";
import { expect, it } from "vitest";

import { HEATER_MODE } from "@/shared/heater-mode";

it("the client's heater mode vocabulary is the SDK's", () => {
  expect(HEATER_MODE).toEqual(SDK_HEATER_MODE);
});
