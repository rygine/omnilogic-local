import { callServerFn } from "@tests/server/support";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { refresh, built } = vi.hoisted(() => ({
  refresh: vi.fn(() => Promise.resolve()),
  built: vi.fn(),
}));
vi.mock("@rygine/omnilogic-local-sdk", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  OmniLogic: class {
    constructor(options: unknown) {
      built(options);
    }
    refresh = refresh;
    mspVersion = "R0502000";
  },
}));

import { ping } from "./ping";

beforeEach(() => {
  refresh.mockClear();
});

describe("ping", () => {
  // the SDK's own refresh decides whether the firmware is supported
  it("checks the controller through a refresh", async () => {
    await callServerFn(ping, { host: "192.168.1.100", port: 10444 });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  // a wrong address must not hold the send queue for the SDK's full patience
  it("waits a second per attempt, not the SDK's five", async () => {
    await callServerFn(ping, { host: "192.168.1.100", port: 10444 });
    expect(built).toHaveBeenCalledWith(
      expect.objectContaining({ timings: { ackTimeoutMs: 1000 } }),
    );
  });
});
