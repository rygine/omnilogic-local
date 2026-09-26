import { vi } from "vitest";

import { createLogger } from "@/utils/logger";

beforeEach(() => {
  vi.stubEnv("LOG_LEVEL", undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("createLogger", () => {
  it("reads LOG_LEVEL per record: warn by default, off silences, junk is ignored", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const log = createLogger("api");

    log.info("suppressed");
    log.warn("shown");
    expect(error).toHaveBeenCalledTimes(1);

    vi.stubEnv("LOG_LEVEL", "debug");
    log.trace("below the floor");
    log.debug("now shown");
    expect(error).toHaveBeenCalledTimes(2);

    vi.stubEnv("LOG_LEVEL", "off");
    log.error("even errors are off");
    expect(error).toHaveBeenCalledTimes(2);

    vi.stubEnv("LOG_LEVEL", "chatty");
    log.error("still reaches the default");
    expect(error).toHaveBeenCalledTimes(3);
  });

  it("writes one line per record to stderr, an Error passed separately", () => {
    vi.stubEnv("LOG_LEVEL", "trace");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const others = ["debug", "info", "warn"].map((m) =>
      vi.spyOn(console, m as "debug").mockImplementation(() => {}),
    );
    const log = createLogger("api");
    const boom = new Error("ECONNRESET");

    log.trace("t");
    log.debug("command", { name: "SetUIHeaterCmd", opcode: 11 });
    log.info("i");
    log.warn("w");
    log.error("socket error", { err: boom });

    expect(error).toHaveBeenCalledTimes(5);
    expect(error).toHaveBeenNthCalledWith(
      2,
      "debug [api] command name=SetUIHeaterCmd opcode=11",
    );
    expect(error).toHaveBeenLastCalledWith(expect.any(String), boom);
    for (const spy of others) {
      expect(spy).not.toHaveBeenCalled();
    }
  });
});
