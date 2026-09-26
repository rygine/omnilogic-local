import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { countdownQueryKey } from "@/client/queries";
import { CountdownTimer } from "@/components/controls/CountdownTimer/CountdownTimer";

vi.mock("@/client/mutations", () => ({
  useStartCountdown: () => ({ mutate: vi.fn(), isPending: false }),
}));

// the key the component reads with no host
const key = countdownQueryKey("", 10444, 1, 11);

// a device counting down with ten minutes left, as the controller reports it
const mount = (onCancel: () => Promise<unknown>) => {
  const qc = new QueryClient();
  qc.setQueryData(key, { seconds: 600 });
  render(
    <QueryClientProvider client={qc}>
      <MantineProvider>
        <CountdownTimer
          bowId={1}
          equipmentId={11}
          target="equipment"
          value={50}
          on={true}
          active={true}
          onCancel={onCancel}
        />
      </MantineProvider>
    </QueryClientProvider>,
  );
  return qc;
};

const clickCancel = () =>
  userEvent.click(screen.getByRole("button", { name: /cancel/i }));

describe("CountdownTimer cancel", () => {
  it("clears the countdown once the off succeeds", async () => {
    const qc = mount(() => Promise.resolve());
    expect(screen.getByRole("timer")).toBeInTheDocument();
    await clickCancel();
    expect(qc.getQueryData(key)).toEqual({ seconds: 0 });
    expect(screen.getByRole("button", { name: /^start$/i })).toBeVisible();
  });

  it("leaves the countdown running when the off is refused", async () => {
    const qc = mount(() => Promise.reject(new Error("unreachable")));
    await clickCancel();
    expect(qc.getQueryData(key)).toEqual({ seconds: 600 });
    expect(screen.getByRole("timer")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^start$/i })).toBeNull();
  });
});
