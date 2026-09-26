import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useActivateTheme } from "@/client/themes";
import type * as ThemeFns from "@/server/fns/themes";
import type { ThemeSummary } from "@/server/serializers";

vi.mock("@/server/fns/themes", async (importOriginal) => ({
  ...(await importOriginal<typeof ThemeFns>()),
  activateTheme: vi.fn(() => Promise.resolve()),
}));
vi.mock("@/client/settings", () => ({
  useSettings: () => ({ host: "h", port: 10444, refreshSeconds: 30 }),
}));
vi.mock("@mantine/notifications", () => ({
  notifications: { show: vi.fn(), update: vi.fn() },
}));

const themes: ThemeSummary[] = [
  { id: 26, name: "Testing", active: true, equipment: [] },
  { id: 28, name: "White Light", active: false, equipment: [] },
];

const setup = () => {
  const qc = new QueryClient();
  qc.setQueryData(["themes", "h", 10444], themes);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { qc, ...renderHook(() => useActivateTheme(), { wrapper }) };
};
const active = (qc: QueryClient) =>
  qc
    .getQueryData<ThemeSummary[]>(["themes", "h", 10444])
    ?.map((t) => [t.id, t.active]);

describe("useActivateTheme", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("marks the theme active on the ack and the others inactive", async () => {
    const { qc, result } = setup();
    await act(() =>
      result.current.mutateAsync({ theme: themes[1]!, on: true }),
    );
    expect(active(qc)).toEqual([
      [26, false],
      [28, true],
    ]);
  });

  it("a countdown remembers its end and marks the theme inactive on the minute", async () => {
    const { qc, result } = setup();
    await act(() =>
      result.current.mutateAsync({ theme: themes[1]!, on: true, minutes: 2 }),
    );
    expect(active(qc)).toEqual([
      [26, false],
      [28, true],
    ]);
    const raw = localStorage.getItem("theme-countdown:h:10444:28");
    expect(raw).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(2 * 60_000);
    });
    expect(active(qc)).toEqual([
      [26, false],
      [28, false],
    ]);
  });

  it("a stop clears the remembered countdown", async () => {
    const { result } = setup();
    await act(() =>
      result.current.mutateAsync({ theme: themes[1]!, on: true, minutes: 2 }),
    );
    await act(() =>
      result.current.mutateAsync({ theme: themes[1]!, on: false }),
    );
    expect(localStorage.getItem("theme-countdown:h:10444:28")).toBe("null");
  });
});
