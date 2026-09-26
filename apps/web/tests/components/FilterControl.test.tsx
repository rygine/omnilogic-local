import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makeFilter } from "@tests/bow";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { FilterControl } from "@/components/controls/FilterControl/FilterControl";

const filter = makeFilter(
  {
    id: 11,
    name: "Filter",
    on: false,
    speed: 50,
    lastSpeed: 80,
    speedRange: { min: 0, max: 100 },
    rpm: null,
    rpmRange: null,
    presets: null,
  },
  { pumpMinSpeed: 0, freezeProtect: false, flowMonitor: false },
);

const onMutate = vi.fn<(vars: unknown) => void>();
const speedMutate = vi.fn<(vars: unknown) => void>();
const countdownMutate = vi.fn<(vars: unknown) => void>();
vi.mock("@/client/mutations", () => ({
  useSetEquipmentOn: () => ({ mutate: onMutate, isPending: false }),
  useSetFilterSpeed: () => ({ mutate: speedMutate, isPending: false }),
  useStartCountdown: () => ({ mutate: countdownMutate, isPending: false }),
}));

const r = (ui: ReactNode) => {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <MantineProvider>{ui}</MantineProvider>
    </QueryClientProvider>,
  );
};

describe("FilterControl", () => {
  it("renders speed and a power button", () => {
    r(<FilterControl bowId={1} filter={filter} />);
    expect(screen.getByText("Speed")).toBeInTheDocument();
    // off → the power button offers to turn it on
    expect(
      screen.getByRole("button", { name: /turn on/i }),
    ).toBeInTheDocument();
  });

  // on resumes the last speed through the speed write, off is the generic on/off write
  it("turn on resumes the last speed; turn off uses the on/off write", async () => {
    onMutate.mockClear();
    speedMutate.mockClear();
    r(<FilterControl bowId={1} filter={filter} />);
    await userEvent.click(screen.getByRole("button", { name: /turn on/i }));
    expect(speedMutate).toHaveBeenCalledWith({ equipmentId: 11, speed: 80 });
    expect(onMutate).not.toHaveBeenCalled();

    r(<FilterControl bowId={1} filter={{ ...filter, on: true }} />);
    await userEvent.click(screen.getByRole("button", { name: /turn off/i }));
    expect(onMutate).toHaveBeenCalledWith({ equipmentId: 11, on: false });
  });

  it("turn on falls back to the Low preset when there is no last speed", async () => {
    speedMutate.mockClear();
    r(
      <FilterControl
        bowId={1}
        filter={{
          ...filter,
          lastSpeed: 0,
          status: "On",
          busyForMs: null,
          presets: { low: 58, medium: 80, high: 100 },
          rpmRange: { min: 2000, max: 3450 },
        }}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /turn on/i }));
    expect(speedMutate).toHaveBeenCalledWith({ equipmentId: 11, speed: 58 });
  });

  // the countdown sends the selected speed with the quick pick's duration
  it("starts a countdown at the selected speed for the picked duration", async () => {
    countdownMutate.mockClear();
    r(<FilterControl bowId={1} filter={{ ...filter, on: true }} />);
    await userEvent.click(screen.getByPlaceholderText("Preset"));
    await userEvent.click(await screen.findByRole("option", { name: "30m" }));
    await userEvent.click(screen.getByRole("button", { name: /^start$/i }));
    // the vars, the first argument
    expect(countdownMutate.mock.calls[0]?.[0]).toEqual({
      equipmentId: 11,
      target: "equipment",
      value: 50,
      hours: 0,
      minutes: 30,
    });
  });

  it("disables every command while the pumps settle and says when they return", () => {
    r(
      <FilterControl
        bowId={1}
        filter={{
          ...filter,
          on: true,
          status: "Priming",
          busyForMs: 95_000,
        }}
      />,
    );
    expect(screen.getByText(/Filter is priming/)).toBeInTheDocument();
    expect(screen.getByText(/Controls return in 1:3/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /turn off/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^start$/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /apply/i })).toBeDisabled();
  });

  it("apply is disabled until speed changes", async () => {
    r(<FilterControl bowId={1} filter={filter} />);
    expect(screen.getByRole("button", { name: /apply/i })).toBeDisabled();
    // name the speed textbox apart from the countdown's
    const input = screen.getByRole("textbox", { name: /speed/i });
    await userEvent.clear(input);
    await userEvent.type(input, "75");
    expect(screen.getByRole("button", { name: /apply/i })).toBeEnabled();
  });
});
