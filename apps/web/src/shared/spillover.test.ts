import { THEME_FAVORITE_DATA as SDK_THEME_FAVORITE_DATA } from "@rygine/omnilogic-local-sdk";
import { describe, expect, it } from "vitest";

import {
  SPILLOVER_FAVORITE_DATA,
  THEME_FAVORITE_DATA,
} from "@/shared/spillover";

describe("favorite markers", () => {
  it("the client's theme marker is the SDK's", () => {
    expect(THEME_FAVORITE_DATA).toBe(SDK_THEME_FAVORITE_DATA);
  });
  it("the two markers are the siblings the firmware compares", () => {
    expect(THEME_FAVORITE_DATA).toBe(0x0fffffff);
    expect(SPILLOVER_FAVORITE_DATA).toBe(0x0ffffff1);
  });
});
