import { callServerFn } from "@tests/server/support";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchSysInfo, fetchConfig, built } = vi.hoisted(() => ({
  fetchSysInfo: vi.fn(() => Promise.resolve({})),
  fetchConfig: vi.fn(() => Promise.resolve({})),
  built: vi.fn(),
}));
vi.mock("@rygine/omnilogic-local-sdk", () => ({
  OmniLogic: class {
    constructor(options: unknown) {
      built(options);
    }
    fetchSysInfo = fetchSysInfo;
    fetchConfig = fetchConfig;
  },
}));

import { ping } from "./ping";

beforeEach(() => {
  fetchSysInfo.mockClear();
  fetchConfig.mockClear();
});

describe("ping", () => {
  // reachability only needs an answer, and the system info is the small one
  it("asks for the system info, not the whole config", async () => {
    await callServerFn(ping, { host: "192.168.1.100", port: 10444 });
    expect(fetchSysInfo).toHaveBeenCalled();
    expect(fetchConfig).not.toHaveBeenCalled();
  });

  // a wrong address must not hold the send queue for the SDK's full patience
  it("waits a second per attempt, not the SDK's five", async () => {
    await callServerFn(ping, { host: "192.168.1.100", port: 10444 });
    expect(built).toHaveBeenCalledWith(
      expect.objectContaining({ timings: { ackTimeoutMs: 1000 } }),
    );
  });
});
