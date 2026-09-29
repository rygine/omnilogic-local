import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makeFilter } from "@tests/bow";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HeaterSettingsSection } from "@/components/HeaterSettings/HeaterSettingsSection";
import type { HeaterDetail } from "@/server/serializers";

const gas: HeaterDetail = {
  id: 4,
  name: "",
  type: "HTR_GAS",
  enabled: false,
  setPoint: 94,
  setPointRange: { min: 55, max: 94 },
  state: "off",
  mode: 0,
  silentMode: false,
  cooldown: false,
  extend: true,
  lowSpeed: {
    allow: true,
    minSpeed: 60,
    speedRange: { min: 58, max: 100 },
    presets: { low: 58, medium: 80, high: 100 },
    rpmRange: { min: 2000, max: 3450 },
  },
};

const filter = makeFilter();

const mutateAsync =
  vi.fn<(v: { setting: string; value: boolean | number }) => Promise<void>>();
const filterMutateAsync =
  vi.fn<
    (v: {
      bowId: number;
      filterId: number;
      setting: string;
      value: boolean | number;
    }) => Promise<void>
  >();
vi.mock("@/client/mutations", () => ({
  useSetHeaterSetting: () => ({ mutateAsync, isPending: false }),
  useSetFilterSettingOn: () => ({
    mutateAsync: filterMutateAsync,
    isPending: false,
  }),
}));
vi.mock("@/client/queries", () => ({
  useHeaterAutoDifferential: () => ({
    data: { value: 2, readAt: "2026-09-08T00:00:00.000Z" },
    isPending: false,
    isError: false,
  }),
}));

const r = (ui: ReactNode) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>{ui}</MantineProvider>
    </QueryClientProvider>,
  );

describe("HeaterSettingsSection", () => {
  beforeEach(() => {
    mutateAsync.mockReset().mockResolvedValue(undefined);
    filterMutateAsync.mockReset().mockResolvedValue(undefined);
  });

  it("renders the rows from the heater, hides mode on gas, and starts with Apply disabled", () => {
    r(<HeaterSettingsSection bowId={1} bodyName="Pool" heater={gas} />);
    expect(screen.getByRole("switch", { name: /cooldown/i })).not.toBeChecked();
    expect(screen.getByRole("switch", { name: /extend/i })).toBeChecked();
    expect(screen.getByText("Auto differential")).toBeInTheDocument();
    expect(screen.getByText("2°F")).toBeInTheDocument();
    const differential = screen.getByRole("slider", {
      name: /auto differential/i,
    });
    expect(differential).toHaveAttribute("aria-valuenow", "2");
    expect(differential).toHaveAttribute("aria-valuemin", "2");
    expect(differential).toHaveAttribute("aria-valuemax", "10");
    // the speed slider works in percent and reads in RPM
    const slider = screen.getByRole("slider", { name: /minimum speed/i });
    expect(slider).toHaveAttribute("aria-valuenow", "60");
    expect(screen.getByText("2070 RPM")).toBeInTheDocument();
    expect(screen.getByText("Low")).toBeInTheDocument();
    expect(screen.getByText("Med")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.queryByText("Mode")).toBeNull();
    expect(screen.getByRole("button", { name: /apply/i })).toBeDisabled();
    expect(mutateAsync).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Pool heater settings")).toBeInTheDocument();
  });

  it("does not write on toggle; Apply sends only the changed settings, in order", async () => {
    r(<HeaterSettingsSection bowId={1} bodyName="Pool" heater={gas} />);
    await userEvent.click(screen.getByRole("switch", { name: /cooldown/i }));
    expect(mutateAsync).not.toHaveBeenCalled();
    const slider = screen.getByRole("slider", { name: /minimum speed/i });
    await act(async () => {
      slider.focus();
    });
    await userEvent.keyboard("{ArrowRight}");
    await userEvent.click(screen.getByRole("button", { name: /apply/i }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(2));
    expect(mutateAsync.mock.calls[0]![0]).toEqual({
      setting: "heaterCooldown",
      value: true,
    });
    const speedCall = mutateAsync.mock.calls[1]![0];
    expect(speedCall.setting).toBe("heaterLowSpeed");
    expect(speedCall.value).toBeGreaterThan(60); // a percent, not an RPM
    expect(speedCall.value).toBeLessThanOrEqual(100);
  });

  it("clicking the High preset then Apply writes the high preset's percent", async () => {
    r(<HeaterSettingsSection bowId={1} bodyName="Pool" heater={gas} />);
    screen.getByText("High").click();
    await userEvent.click(screen.getByRole("button", { name: /apply/i }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(mutateAsync.mock.calls[0]![0]).toEqual({
      setting: "heaterLowSpeed",
      value: 100,
    });
  });

  it("dragging the slider to its minimum writes the pump's range floor", async () => {
    // the slider spans the pump's own range, which dips below the Low preset
    const wideRange: HeaterDetail = {
      ...gas,
      lowSpeed: {
        allow: true,
        minSpeed: 60,
        speedRange: { min: 40, max: 100 },
        presets: { low: 58, medium: 80, high: 100 },
        rpmRange: { min: 2000, max: 3450 },
      },
    };
    r(<HeaterSettingsSection bowId={1} bodyName="Pool" heater={wideRange} />);
    const slider = screen.getByRole("slider", { name: /minimum speed/i });
    await act(async () => {
      slider.focus();
    });
    await userEvent.keyboard("{Home}");
    await userEvent.click(screen.getByRole("button", { name: /apply/i }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(mutateAsync.mock.calls[0]![0]).toEqual({
      setting: "heaterLowSpeed",
      value: 40,
    });
  });

  it("Apply re-disables when every value is back at the controller's", async () => {
    r(<HeaterSettingsSection bowId={1} bodyName="Pool" heater={gas} />);
    const apply = screen.getByRole("button", { name: /apply/i });
    // a switch, there and back
    await userEvent.click(screen.getByRole("switch", { name: /cooldown/i }));
    expect(apply).toBeEnabled();
    await userEvent.click(screen.getByRole("switch", { name: /cooldown/i }));
    expect(apply).toBeDisabled();
    // the auto-differential slider, there and back
    const differential = screen.getByRole("slider", {
      name: /auto differential/i,
    });
    await act(async () => {
      differential.focus();
    });
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByText("3°F")).toBeInTheDocument();
    expect(apply).toBeEnabled();
    await userEvent.keyboard("{ArrowLeft}");
    expect(apply).toBeDisabled();
    // the speed slider, there and back, at 60%, a reachable percent
    const speed = screen.getByRole("slider", { name: /minimum speed/i });
    await act(async () => {
      speed.focus();
    });
    await userEvent.keyboard("{ArrowRight}");
    expect(speed).toHaveAttribute("aria-valuenow", "61");
    expect(apply).toBeEnabled();
    await userEvent.keyboard("{ArrowLeft}");
    expect(speed).toHaveAttribute("aria-valuenow", "60");
    expect(apply).toBeDisabled();
  });

  it("the minimum speed grays out while Allow low speed is off", async () => {
    r(<HeaterSettingsSection bowId={1} bodyName="Pool" heater={gas} />);
    const allow = screen.getByRole("switch", { name: /allow low speed/i });
    const speed = screen.getByRole("slider", { name: /minimum speed/i });
    expect(speed.closest("[data-disabled]")).toBeNull();
    await userEvent.click(allow);
    expect(speed.closest("[data-disabled]")).not.toBeNull();
    await userEvent.click(allow);
    expect(speed.closest("[data-disabled]")).toBeNull();
  });

  it("a stored floor below the pump's Low preset is not a pending change; a move is", async () => {
    // the spa's panel-set floor (50%) sits under its pump's Low preset (60%)
    r(
      <HeaterSettingsSection
        bowId={2}
        bodyName="Spa"
        heater={{
          ...gas,
          lowSpeed: {
            ...gas.lowSpeed!,
            minSpeed: 50,
            speedRange: { min: 40, max: 100 },
          },
        }}
      />,
    );
    const apply = screen.getByRole("button", { name: /apply/i });
    expect(apply).toBeDisabled();
    const speed = screen.getByRole("slider", { name: /minimum speed/i });
    await act(async () => {
      speed.focus();
    });
    await userEvent.keyboard("{ArrowRight}");
    expect(apply).toBeEnabled();
    await userEvent.keyboard("{ArrowLeft}");
    expect(apply).toBeDisabled();
    await userEvent.keyboard("{ArrowRight}");
    await userEvent.click(apply);
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(mutateAsync.mock.calls[0]![0]).toEqual({
      setting: "heaterLowSpeed",
      value: 51,
    });
  });

  it("shows mode and silent mode for a heat pump and hides low-speed rows without an appliance", () => {
    r(
      <HeaterSettingsSection
        bowId={1}
        bodyName="Spa"
        heater={{ ...gas, type: "HTR_HEAT_PUMP", lowSpeed: undefined }}
      />,
    );
    expect(screen.getByText("Mode")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: /silent/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("switch", { name: /allow low speed/i }),
    ).toBeNull();
  });

  it("after a successful Apply, Apply is disabled again and the drafts show the applied values", async () => {
    const { rerender } = r(
      <HeaterSettingsSection bowId={1} bodyName="Pool" heater={gas} />,
    );
    await userEvent.click(screen.getByRole("switch", { name: /cooldown/i }));
    await userEvent.click(screen.getByRole("button", { name: /apply/i }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    // simulate the controller update a refetch would deliver
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <MantineProvider>
          <HeaterSettingsSection
            bowId={1}
            bodyName="Pool"
            heater={{ ...gas, cooldown: true }}
          />
        </MantineProvider>
      </QueryClientProvider>,
    );
    expect(screen.getByRole("button", { name: /apply/i })).toBeDisabled();
    expect(screen.getByRole("switch", { name: /cooldown/i })).toBeChecked();
  });

  it("a rejected write leaves the remaining draft editable and does not throw unhandled", async () => {
    mutateAsync
      .mockReset()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("nope"));
    r(<HeaterSettingsSection bowId={1} bodyName="Pool" heater={gas} />);
    await userEvent.click(screen.getByRole("switch", { name: /cooldown/i }));
    const slider = screen.getByRole("slider", { name: /minimum speed/i });
    await act(async () => {
      slider.focus();
    });
    await userEvent.keyboard("{ArrowRight}");
    await userEvent.click(screen.getByRole("button", { name: /apply/i }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("button", { name: /apply/i })).toBeEnabled();
  });

  it("cooldown duration grays out while Cooldown is off and writes through the filter mutation", async () => {
    r(
      <HeaterSettingsSection
        bowId={1}
        bodyName="Pool"
        heater={gas}
        filter={filter}
      />,
    );
    const input = screen.getByLabelText("Cooldown duration");
    expect(input).toBeDisabled();
    await userEvent.click(screen.getByRole("switch", { name: /cooldown/i }));
    expect(input).toBeEnabled();
    await userEvent.clear(input);
    await userEvent.type(input, "240");
    await userEvent.click(screen.getByRole("button", { name: /apply/i }));
    await waitFor(() => expect(filterMutateAsync).toHaveBeenCalledTimes(1));
    expect(filterMutateAsync.mock.calls[0]![0]).toEqual({
      bowId: 1,
      filterId: 3,
      setting: "cooldownDuration",
      value: 240,
    });
    // heaterCooldown precedes cooldownDuration in the write order
    expect(mutateAsync.mock.calls[0]![0]).toEqual({
      setting: "heaterCooldown",
      value: true,
    });
  });

  it("hides the cooldown duration row without a filter", () => {
    r(<HeaterSettingsSection bowId={1} bodyName="Pool" heater={gas} />);
    expect(screen.queryByText("Cooldown duration")).toBeNull();
  });
});
