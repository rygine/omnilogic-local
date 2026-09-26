import { describe, it, expect } from "vitest";

import { WebAppError, toWebAppError } from "@/server/errors";

describe("WebAppError", () => {
  it("carries a code and message", () => {
    const err = new WebAppError("BUSY", "the pump is priming");
    expect(err.code).toBe("BUSY");
    expect(err.message).toBe("the pump is priming");
    expect(err.name).toBe("WebAppError");
  });

  it("serializes via toJSON", () => {
    const err = new WebAppError("BUSY", "the pump is priming");
    expect(JSON.parse(JSON.stringify(err))).toEqual({
      name: "WebAppError",
      code: "BUSY",
      message: "the pump is priming",
    });
  });

  it("wraps anything else under the fallback code", () => {
    expect(toWebAppError(new Error("boom"))).toMatchObject({
      code: "ERROR",
      message: "boom",
    });
  });
});
