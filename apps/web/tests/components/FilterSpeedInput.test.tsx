import { MantineProvider } from "@mantine/core";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { FilterSpeedInput } from "@/components/EquipmentValue/FilterSpeedInput";

const renderInput = (value: number, onChange = vi.fn()) => {
  render(
    <MantineProvider>
      <FilterSpeedInput
        presets={{ low: 58, medium: 80, high: 100 }}
        rpmRange={{ min: 2000, max: 3450 }}
        speedRange={{ min: 58, max: 100 }}
        value={value}
        onChange={onChange}
      />
    </MantineProvider>,
  );
  return onChange;
};

describe("FilterSpeedInput", () => {
  it("shows the current RPM and Low/Med/High presets", () => {
    renderInput(58); // low = 58% → 2000 RPM
    expect(screen.getByText("Speed")).toBeInTheDocument();
    expect(screen.getByText("2000 RPM")).toBeInTheDocument();
    expect(screen.getByText("Low")).toBeInTheDocument();
    expect(screen.getByText("Med")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
  });

  it("jumps to a preset's percent when picked", () => {
    const onChange = renderInput(58);
    screen.getByText("High").click();
    expect(onChange).toHaveBeenCalledWith(100);
  });

  it("steps in whole percent (the wire value) while reading in RPM", async () => {
    const onChange = renderInput(60); // 60% ↔ 2070 RPM, not a 50-RPM step
    expect(screen.getByText("2070 RPM")).toBeInTheDocument();
    const slider = screen.getByRole("slider", { name: "Speed" });
    expect(slider).toHaveAttribute("aria-valuenow", "60");
    await act(async () => {
      slider.focus();
    });
    await userEvent.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenCalledWith(61);
  });

  it("renders no preset control when presets is omitted", () => {
    render(
      <MantineProvider>
        <FilterSpeedInput
          rpmRange={{ min: 2000, max: 3450 }}
          speedRange={{ min: 58, max: 100 }}
          value={70}
          onChange={vi.fn()}
        />
      </MantineProvider>,
    );
    expect(screen.queryByText("Low")).toBeNull();
    expect(screen.queryByText("Med")).toBeNull();
    expect(screen.queryByText("High")).toBeNull();
  });

  it("falls back to percent without an RPM range, formatted with no space", () => {
    render(
      <MantineProvider>
        <FilterSpeedInput
          presets={{ low: 58, medium: 80, high: 100 }}
          rpmRange={null}
          speedRange={{ min: 58, max: 100 }}
          value={60}
          onChange={vi.fn()}
        />
      </MantineProvider>,
    );
    expect(screen.getByText("60%")).toBeInTheDocument();
  });
});
