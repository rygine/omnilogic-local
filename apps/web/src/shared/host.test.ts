import { describe, expect, it } from "vitest";

import { isValidHost } from "@/shared/host";

describe("isValidHost", () => {
  it("accepts a well-formed IPv4 address", () => {
    expect(isValidHost("192.168.1.100")).toBe(true);
    expect(isValidHost(" 192.168.1.100 ")).toBe(true);
  });

  it("refuses a malformed one", () => {
    expect(isValidHost("192.168.1")).toBe(false);
    expect(isValidHost("192.168.1.256")).toBe(false);
    expect(isValidHost("192.168.1.100.1")).toBe(false);
    expect(isValidHost("")).toBe(false);
    expect(isValidHost("   ")).toBe(false);
  });

  it("accepts a hostname and refuses a malformed one", () => {
    expect(isValidHost("omnilogic")).toBe(true);
    expect(isValidHost("omnilogic.local")).toBe(true);
    expect(isValidHost("pool-controller.home.arpa")).toBe(true);
    expect(isValidHost("-omnilogic")).toBe(false);
    expect(isValidHost("omni logic")).toBe(false);
    expect(isValidHost("omni_logic")).toBe(false);
    expect(isValidHost("omnilogic.")).toBe(false);
  });
});
