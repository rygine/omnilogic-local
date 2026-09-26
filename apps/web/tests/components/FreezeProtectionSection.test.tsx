import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makeFilter } from "@tests/bow";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FreezeProtectionSection } from "@/components/FreezeProtection/FreezeProtectionSection";

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

describe("FreezeProtectionSection", () => {
  beforeEach(() => mutateAsync.mockReset().mockResolvedValue(undefined));

  it("renders from the pool's copy; Apply disabled when copies agree and nothing edited", () => {
    r(<FreezeProtectionSection bodies={agreeingBodies} />);
    expect(
      screen.getByLabelText("Freeze protection settings"),
    ).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: /enabled/i })).toBeChecked();
    expect(screen.getByText("38°F")).toBeInTheDocument();
    const freezeSpeed = screen.getByRole("slider", {
      name: /freeze protect speed/i,
    });
    expect(freezeSpeed).toHaveAttribute("aria-valuenow", "80");
    expect(screen.getByLabelText("Freeze protect override")).toHaveValue(
      "7200s",
    );
    expect(screen.getByLabelText("Shared filter timeout")).toHaveValue("1800s");
    expect(screen.getByRole("button", { name: /apply/i })).toBeDisabled();
    expect(mutateAsync).not.toHaveBeenCalled();
    expect(screen.queryByText(/copy differs/i)).toBeNull();
  });

  it("switch off grays out the four rows; back on re-enables them", async () => {
    r(<FreezeProtectionSection bodies={agreeingBodies} />);
    const toggle = screen.getByRole("switch", { name: /enabled/i });
    const tempSlider = screen.getByRole("slider", {
      name: /freeze protect temperature/i,
    });
    const speedSlider = screen.getByRole("slider", {
      name: /freeze protect speed/i,
    });
    const override = screen.getByLabelText("Freeze protect override");
    const shared = screen.getByLabelText("Shared filter timeout");

    expect(tempSlider.closest("[data-disabled]")).toBeNull();
    await userEvent.click(toggle);
    expect(tempSlider.closest("[data-disabled]")).not.toBeNull();
    expect(speedSlider.closest("[data-disabled]")).not.toBeNull();
    expect(override).toBeDisabled();
    expect(shared).toBeDisabled();

    await userEvent.click(toggle);
    expect(tempSlider.closest("[data-disabled]")).toBeNull();
    expect(speedSlider.closest("[data-disabled]")).toBeNull();
    expect(override).toBeEnabled();
    expect(shared).toBeEnabled();
  });

  it("an edit writes to every body, pool then spa", async () => {
    r(<FreezeProtectionSection bodies={agreeingBodies} />);
    const tempSlider = screen.getByRole("slider", {
      name: /freeze protect temperature/i,
    });
    await act(async () => {
      tempSlider.focus();
    });
    await userEvent.keyboard("{ArrowLeft}"); // 38 -> 37
    expect(screen.getByRole("button", { name: /apply/i })).toBeEnabled();
    await userEvent.click(screen.getByRole("button", { name: /apply/i }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(2));
    expect(mutateAsync.mock.calls[0]![0]).toEqual({
      bowId: 1,
      filterId: 3,
      setting: "freezeProtectTemp",
      value: 37,
    });
    expect(mutateAsync.mock.calls[1]![0]).toEqual({
      bowId: 2,
      filterId: 10,
      setting: "freezeProtectTemp",
      value: 37,
    });
  });

  it("a diverged copy shows an alert naming the body and field; Apply is enabled with no edits and writes every body", async () => {
    const bodies = [
      { bowId: 1, bodyName: "Pool", filter: makeFilter({ id: 3 }) },
      {
        bowId: 2,
        bodyName: "Spa",
        filter: makeFilter({ id: 10 }, { freezeProtectTemp: 36 }),
      },
    ];
    r(<FreezeProtectionSection bodies={bodies} />);
    expect(
      screen.getByText(
        "The Spa copy differs (Freeze protect temperature: 36°F); Apply writes every copy.",
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
      setting: "freezeProtectTemp",
      value: 38,
    });
    expect(mutateAsync.mock.calls[1]![0]).toEqual({
      bowId: 2,
      filterId: 10,
      setting: "freezeProtectTemp",
      value: 38,
    });
  });

  it("freeze speed clamps to the smallest Maximum across bodies on write", async () => {
    const bodies = [
      { bowId: 1, bodyName: "Pool", filter: makeFilter({ id: 3 }) },
      {
        bowId: 2,
        bodyName: "Spa",
        filter: makeFilter({ id: 10 }, { pumpMaxSpeed: 95 }),
      },
    ];
    r(<FreezeProtectionSection bodies={bodies} />);
    const freezeSpeed = screen.getByRole("slider", {
      name: /freeze protect speed/i,
    });
    await act(async () => {
      freezeSpeed.focus();
    });
    await userEvent.keyboard("{End}"); // freeze speed drafted to its max, 100

    await userEvent.click(screen.getByRole("button", { name: /apply/i }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(2));
    expect(mutateAsync.mock.calls[0]![0]).toEqual({
      bowId: 1,
      filterId: 3,
      setting: "freezeProtectSpeed",
      value: 95,
    });
    expect(mutateAsync.mock.calls[1]![0]).toEqual({
      bowId: 2,
      filterId: 10,
      setting: "freezeProtectSpeed",
      value: 95,
    });
  });
});
