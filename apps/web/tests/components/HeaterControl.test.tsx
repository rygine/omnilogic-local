import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HeaterControl } from "@/components/controls/HeaterControl/HeaterControl";
import type { HeaterDetail } from "@/server/serializers";

const heater: HeaterDetail = {
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
  extend: false,
  lowSpeed: {
    allow: true,
    minSpeed: 60,
    speedRange: { min: 58, max: 100 },
    presets: { low: 58, medium: 80, high: 100 },
    rpmRange: { min: 2000, max: 3450 },
  },
};

const setTemp = vi.fn<() => void>();
vi.mock("@/client/mutations", () => ({
  useSetHeaterEnable: () => ({ mutate: vi.fn<() => void>(), isPending: false }),
  useSetHeaterTemperature: () => ({ mutate: setTemp, isPending: false }),
}));

const r = (ui: ReactNode) => {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <MantineProvider>{ui}</MantineProvider>
    </QueryClientProvider>,
  );
};

describe("HeaterControl", () => {
  beforeEach(() => {
    setTemp.mockClear();
  });

  it("shows a power button", () => {
    r(<HeaterControl bowId={1} heater={heater} />);
    expect(
      screen.getByRole("button", { name: /turn on/i }),
    ).toBeInTheDocument();
  });

  it("shows the set point as a slider bounded by the settable range", () => {
    r(<HeaterControl bowId={1} heater={heater} />);
    const slider = screen.getByRole("slider", { name: /set point/i });
    expect(slider).toHaveAttribute("aria-valuemin", "55");
    expect(slider).toHaveAttribute("aria-valuemax", "94");
    expect(slider).toHaveAttribute("aria-valuenow", "94");
    expect(screen.getByText("94°F")).toBeInTheDocument();
  });

  it("apply is disabled until the slider moves, then sends the new value", async () => {
    r(<HeaterControl bowId={1} heater={heater} />);
    expect(screen.getByRole("button", { name: /apply/i })).toBeDisabled();
    const slider = screen.getByRole("slider", { name: /set point/i });
    act(() => slider.focus());
    await userEvent.keyboard("{ArrowLeft}");
    expect(slider).toHaveAttribute("aria-valuenow", "93");
    await userEvent.click(screen.getByRole("button", { name: /apply/i }));
    expect(setTemp).toHaveBeenCalledWith({ equipmentId: 4, temperature: 93 });
  });
});
