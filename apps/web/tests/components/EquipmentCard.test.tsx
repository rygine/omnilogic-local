import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { DeviceRow } from "@/client/equipment-rows";
import { EquipmentCard } from "@/components/EquipmentCard/EquipmentCard";

import styles from "@/components/EquipmentCard/EquipmentCard.module.css";

const device: DeviceRow = {
  kind: "filter",
  label: "Filter",
  id: 3,
  name: "Filter Pump",
  on: true,
  value: "2000 RPM",
  detail: "Medium",
  state: "On · 2000 RPM (Medium)",
};

const renderCard = (props?: Partial<DeviceRow>, width?: number) => {
  const onSelect = vi.fn();
  const r = render(
    <MantineProvider>
      <div style={width === undefined ? undefined : { width }}>
        <EquipmentCard device={{ ...device, ...props }} onSelect={onSelect} />
      </div>
    </MantineProvider>,
  );
  return { ...r, onSelect };
};

describe("EquipmentCard", () => {
  it("shows name, type, reading + detail, a green well when on, and opens on click", () => {
    const { onSelect } = renderCard();
    // the name carries .name
    expect(screen.getByText("Filter Pump")).toHaveClass(styles.name!);
    expect(screen.getByText("Filter")).toBeInTheDocument();
    expect(screen.getByText("2000 RPM")).toBeInTheDocument();
    expect(screen.getByText("Medium")).toBeInTheDocument();
    // the state is the card itself, with the word in the button's accessible name
    const card = screen.getByRole("button", { name: /^Filter Pump On / });
    expect(card).toHaveAttribute("data-on");
    expect(getComputedStyle(card).backgroundColor).toBe("rgb(211, 249, 216)");
    expect(getComputedStyle(card).borderColor).toBe("rgb(64, 192, 87)");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    card.click();
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("marks a favorite and a scheduled device with icons, not controls", () => {
    render(
      <MantineProvider>
        <EquipmentCard
          device={device}
          onSelect={vi.fn()}
          markers={{ favorite: true, schedules: 2 }}
        />
      </MantineProvider>,
    );
    expect(screen.getByRole("img", { name: "Favorite" })).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "On 2 schedules" }),
    ).toBeInTheDocument();
    // the icons are not buttons, only the card is
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("keeps the plain gray well when the device is off", () => {
    renderCard({ on: false, value: null, detail: null });
    const card = screen.getByRole("button", { name: /^Filter Pump Off / });
    expect(card).not.toHaveAttribute("data-on");
    expect(getComputedStyle(card).backgroundColor).toBe("rgb(248, 249, 250)");
  });

  it("shows a valueLabel caption and the status word for a heater row", () => {
    renderCard({
      kind: "heater",
      label: "Heater",
      valueLabel: "Set point",
      value: "94°F",
      detail: null,
      statusLabel: "Heating",
      on: true,
    });
    expect(screen.getByText("Set point")).toBeInTheDocument();
    expect(screen.getByText("94°F")).toBeInTheDocument();
    // green when the heater is enabled, the burner state under the reading
    expect(screen.getByRole("button")).toHaveAttribute("data-on");
    expect(screen.getByText("Heating")).toBeInTheDocument();
  });

  it("lays out as a row in a wide column and stacks in a narrow one", () => {
    const wide = renderCard(undefined, 800);
    expect(
      getComputedStyle(wide.container.querySelector<HTMLElement>("button")!)
        .flexDirection,
    ).toBe("row");

    const narrow = renderCard(undefined, 320);
    expect(
      getComputedStyle(narrow.container.querySelector<HTMLElement>("button")!)
        .flexDirection,
    ).toBe("column");
  });
});
