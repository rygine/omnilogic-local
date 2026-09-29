import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makeFilter } from "@tests/bow";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PumpSettingsSection } from "@/components/FilterSettings/PumpSettingsSection";

const agreeingBodies = [
  { bowId: 1, bodyName: "Pool", filter: makeFilter({ id: 3 }) },
  { bowId: 2, bodyName: "Spa", filter: makeFilter({ id: 10 }) },
];

const mutateAsync =
  vi.fn<
    (v: {
      bowId: number;
      filterId: number;
      setting: string;
      value: boolean | number;
    }) => Promise<void>
  >();
vi.mock("@/client/mutations", () => ({
  useSetFilterSettingOn: () => ({ mutateAsync, isPending: false }),
}));

const r = (ui: ReactNode) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>{ui}</MantineProvider>
    </QueryClientProvider>,
  );

// the Pool column of the two-column speed range
const pool = () => within(screen.getByLabelText("Pool speed range"));

describe("PumpSettingsSection", () => {
  beforeEach(() => mutateAsync.mockReset().mockResolvedValue(undefined));

  it("renders from the pool's copy; Apply disabled when copies agree and nothing edited", () => {
    r(<PumpSettingsSection bodies={agreeingBodies} />);
    expect(screen.getByLabelText("Filter pump settings")).toBeInTheDocument();
    // priming is edited in minutes, 120 s is 2 min
    expect(screen.getByLabelText("Priming duration")).toHaveValue("2m");
    expect(
      screen.getByRole("switch", { name: /turn off during valve change/i }),
    ).not.toBeChecked();
    expect(screen.getByRole("switch", { name: /flow monitor/i })).toBeChecked();
    expect(screen.getByRole("button", { name: /apply/i })).toBeDisabled();
    expect(mutateAsync).not.toHaveBeenCalled();
    expect(screen.queryByText(/copy differs/i)).toBeNull();
    expect(screen.getByText("Speed range")).toBeInTheDocument();
    // one column per body, pool left and spa right
    expect(screen.getByLabelText("Pool speed range")).toBeInTheDocument();
    expect(screen.getByLabelText("Spa speed range")).toBeInTheDocument();
    const min = pool().getByRole("slider", { name: /^minimum$/i });
    expect(min).toHaveAttribute("aria-valuenow", "58");
    const max = pool().getByRole("slider", { name: /^maximum$/i });
    expect(max).toHaveAttribute("aria-valuenow", "100");
  });

  it("reads Minimum and Maximum in RPM when the pump's RPM range is known", () => {
    r(<PumpSettingsSection bodies={agreeingBodies} />);
    expect(pool().getByText("2000 RPM")).toBeInTheDocument();
    expect(pool().getByText("3450 RPM")).toBeInTheDocument();
  });

  it("reads Minimum and Maximum in percent without an RPM range", () => {
    r(
      <PumpSettingsSection
        bodies={[
          {
            bowId: 1,
            bodyName: "Pool",
            filter: { ...makeFilter({ id: 3 }), rpmRange: null },
          },
        ]}
      />,
    );
    expect(screen.getByText("58%")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("priming edit writes to every body, pool then spa", async () => {
    r(<PumpSettingsSection bodies={agreeingBodies} />);
    const priming = screen.getByLabelText("Priming duration");
    await userEvent.clear(priming);
    await userEvent.type(priming, "3"); // 2 min -> 3 min = 180 s
    expect(screen.getByRole("button", { name: /apply/i })).toBeEnabled();
    await userEvent.click(screen.getByRole("button", { name: /apply/i }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(2));
    expect(mutateAsync.mock.calls[0]![0]).toEqual({
      bowId: 1,
      filterId: 3,
      setting: "primingDuration",
      value: 180,
    });
    expect(mutateAsync.mock.calls[1]![0]).toEqual({
      bowId: 2,
      filterId: 10,
      setting: "primingDuration",
      value: 180,
    });
  });

  it("an out-of-bounds priming edit shows why and disables Apply", async () => {
    r(<PumpSettingsSection bodies={agreeingBodies} />);
    const priming = screen.getByLabelText("Priming duration");
    await userEvent.clear(priming);
    await userEvent.type(priming, "11"); // above the 10 min ceiling
    expect(screen.getByText("Between 1 and 10 minutes")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /apply/i })).toBeDisabled();
    await userEvent.clear(priming);
    expect(screen.getByText("Enter a number")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /apply/i })).toBeDisabled();
  });

  it("a diverged copy shows an alert naming the body and field; Apply is enabled with no edits and writes every body", async () => {
    const bodies = [
      { bowId: 1, bodyName: "Pool", filter: makeFilter({ id: 3 }) },
      {
        bowId: 2,
        bodyName: "Spa",
        filter: makeFilter({ id: 10 }, { flowMonitor: false }),
      },
    ];
    r(<PumpSettingsSection bodies={bodies} />);
    expect(
      screen.getByText(
        "The Spa copy differs (Flow monitor: off); Apply writes every copy.",
      ),
    ).toBeInTheDocument();
    const apply = screen.getByRole("button", { name: /apply/i });
    expect(apply).toBeEnabled();

    await userEvent.click(apply);
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(2));
    // the pool gets its own current value written too
    expect(mutateAsync.mock.calls[0]![0]).toEqual({
      bowId: 1,
      filterId: 3,
      setting: "flowMonitor",
      value: true,
    });
    expect(mutateAsync.mock.calls[1]![0]).toEqual({
      bowId: 2,
      filterId: 10,
      setting: "flowMonitor",
      value: true,
    });
  });

  it("Minimum above Maximum in the Pool column shows the red note and disables Apply", async () => {
    r(<PumpSettingsSection bodies={agreeingBodies} />);
    const min = pool().getByRole("slider", { name: /^minimum$/i });
    await act(async () => {
      min.focus();
    });
    await userEvent.keyboard("{End}"); // Minimum -> 100, equal to Maximum
    expect(screen.queryByText("Minimum must not exceed Maximum")).toBeNull();
    expect(screen.getByRole("button", { name: /apply/i })).toBeEnabled();

    const max = pool().getByRole("slider", { name: /^maximum$/i });
    await act(async () => {
      max.focus();
    });
    await userEvent.keyboard("{ArrowLeft}"); // Maximum -> 99, now below Minimum
    expect(
      screen.getByText("Minimum must not exceed Maximum"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /apply/i })).toBeDisabled();
  });

  it("a Minimum edit in the Spa column writes to bowId 2 only", async () => {
    r(<PumpSettingsSection bodies={agreeingBodies} />);
    const spa = within(screen.getByLabelText("Spa speed range"));
    const min = spa.getByRole("slider", { name: /^minimum$/i });
    await act(async () => {
      min.focus();
    });
    await userEvent.keyboard("{ArrowRight}"); // 58 -> 59
    expect(screen.getByRole("button", { name: /apply/i })).toBeEnabled();
    await userEvent.click(screen.getByRole("button", { name: /apply/i }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(mutateAsync.mock.calls[0]![0]).toEqual({
      bowId: 2,
      filterId: 10,
      setting: "pumpMinSpeed",
      value: 59,
    });
  });

  // both bounds moved at once, each write leaves Minimum at or below Maximum
  it("raising both bounds writes Maximum before Minimum", async () => {
    const narrow = [
      {
        bowId: 1,
        bodyName: "Pool",
        filter: makeFilter({ id: 3 }, { pumpMinSpeed: 20, pumpMaxSpeed: 40 }),
      },
    ];
    r(<PumpSettingsSection bodies={narrow} />);
    const max = screen.getByRole("slider", { name: /^maximum$/i });
    await act(async () => {
      max.focus();
    });
    await userEvent.keyboard("{End}"); // 40 -> 100
    const min = screen.getByRole("slider", { name: /^minimum$/i });
    await act(async () => {
      min.focus();
    });
    await userEvent.keyboard("{End}"); // 20 -> 100
    await userEvent.click(screen.getByRole("button", { name: /apply/i }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(2));
    expect(mutateAsync.mock.calls[0]![0]).toMatchObject({
      setting: "pumpMaxSpeed",
      value: 100,
    });
    expect(mutateAsync.mock.calls[1]![0]).toMatchObject({
      setting: "pumpMinSpeed",
      value: 100,
    });
  });

  it("lowering both bounds writes Minimum before Maximum", async () => {
    const wide = [
      {
        bowId: 1,
        bodyName: "Pool",
        filter: makeFilter({ id: 3 }, { pumpMinSpeed: 20, pumpMaxSpeed: 40 }),
      },
    ];
    r(<PumpSettingsSection bodies={wide} />);
    const min = screen.getByRole("slider", { name: /^minimum$/i });
    await act(async () => {
      min.focus();
    });
    await userEvent.keyboard("{Home}"); // 20 -> 0
    const max = screen.getByRole("slider", { name: /^maximum$/i });
    await act(async () => {
      max.focus();
    });
    await userEvent.keyboard("{Home}"); // 40 -> 0
    await userEvent.click(screen.getByRole("button", { name: /apply/i }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(2));
    expect(mutateAsync.mock.calls[0]![0]).toMatchObject({
      setting: "pumpMinSpeed",
      value: 0,
    });
    expect(mutateAsync.mock.calls[1]![0]).toMatchObject({
      setting: "pumpMaxSpeed",
      value: 0,
    });
  });

  it("a speed-range edit reverted back to the controller's value re-disables Apply", async () => {
    r(<PumpSettingsSection bodies={agreeingBodies} />);
    const min = pool().getByRole("slider", { name: /^minimum$/i });
    await act(async () => {
      min.focus();
    });
    await userEvent.keyboard("{ArrowRight}"); // 58 -> 59
    expect(screen.getByRole("button", { name: /apply/i })).toBeEnabled();
    await userEvent.keyboard("{ArrowLeft}"); // back to 58
    expect(screen.getByRole("button", { name: /apply/i })).toBeDisabled();
    expect(mutateAsync).not.toHaveBeenCalled();
  });
});
