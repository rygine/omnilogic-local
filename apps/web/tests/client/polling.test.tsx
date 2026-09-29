import {
  QueryClient,
  QueryClientProvider,
  type UseQueryResult,
} from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useBows } from "@/client/queries";
import { useThemes } from "@/client/themes";
import { getThemes } from "@/server/fns/themes";
import type * as ThemeFns from "@/server/fns/themes";
import { getWorld } from "@/server/fns/world";
import type { WorldData } from "@/server/serializers";

vi.mock("@/server/fns/world", () => ({ getWorld: vi.fn() }));
vi.mock("@/server/fns/themes", async (importOriginal) => ({
  ...(await importOriginal<typeof ThemeFns>()),
  getThemes: vi.fn(),
}));
vi.mock("@/client/settings", () => ({
  useSettings: () => ({ host: "h", port: 10444, refreshSeconds: 30 }),
}));

const world = { bows: [] } as unknown as WorldData;

const render = <T,>(hook: () => T) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return renderHook(hook, { wrapper });
};

const cases = [
  { name: "useBows", hook: useBows, fn: vi.mocked(getWorld), ok: world },
  { name: "useThemes", hook: useThemes, fn: vi.mocked(getThemes), ok: [] },
];

describe.each(cases)("$name polling", ({ hook, fn, ok }) => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fn.mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("stops after a failed read and resumes once Try again succeeds", async () => {
    fn.mockRejectedValue(new Error("unreachable"));
    const { result } = render<UseQueryResult>(hook);
    await waitFor(() => expect(result.current.isError).toBe(true));

    await act(() => vi.advanceTimersByTimeAsync(90_000));
    expect(fn).toHaveBeenCalledTimes(1);

    fn.mockResolvedValue(ok as never);
    await act(() => result.current.refetch());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    await act(() => vi.advanceTimersByTimeAsync(30_000));
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
