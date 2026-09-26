import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  getSettings,
  hasSettings,
  setSettings,
  useSettings,
} from "@/client/settings";

const full = {
  host: "192.168.1.100",
  port: 10444,
  refreshSeconds: 60,
  notificationPosition: "top-right" as const,
};

describe("settings", () => {
  it("persists and reads back", () => {
    setSettings(full);
    expect(getSettings()).toEqual(full);
  });

  it("reads a stored value back through the app's rules", () => {
    setSettings({ ...full, refreshSeconds: 2 });
    expect(getSettings().refreshSeconds).toBe(30);
  });

  it("hasSettings is true only when host non-empty", () => {
    expect(hasSettings({ ...full, host: "" })).toBe(false);
    expect(hasSettings({ ...full, host: "  " })).toBe(false);
    expect(hasSettings({ ...full, host: "x" })).toBe(true);
  });
});

describe("useSettings hook", () => {
  it("returns the current settings and re-renders when they change", () => {
    setSettings({ ...full, host: "192.168.1.101" });
    const { result } = renderHook(() => useSettings());
    expect(result.current.host).toBe("192.168.1.101");
    act(() => {
      setSettings({ ...full, host: "192.168.1.102" });
    });
    expect(result.current).toEqual({ ...full, host: "192.168.1.102" });
  });
});
