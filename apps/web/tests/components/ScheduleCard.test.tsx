import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { ScheduleCard } from "@/components/ScheduleCard/ScheduleCard";
import type { ScheduleSummary } from "@/server/serializers";

import styles from "@/components/ScheduleCard/ScheduleCard.module.css";

// enabled: false → the switch reads off and the accent is not "running"
const schedule: ScheduleSummary = {
  id: 1,
  equipmentId: 3,
  bodyId: 1,
  bodyName: "Pool",
  equipmentName: "Filter Pump",
  kind: "filter",
  type: "equipment",
  data: 58,
  value: "Low",
  startHour: 10,
  startMinute: 0,
  endHour: 18,
  endMinute: 0,
  daysActive: 127,
  enabled: false,
  recurring: true,
};

const wrap = (ui: ReactNode) => (
  <QueryClientProvider client={new QueryClient()}>
    <MantineProvider>{ui}</MantineProvider>
  </QueryClientProvider>
);

const renderCard = (onSelect = vi.fn(), width?: number) => {
  const r = render(
    wrap(
      <div style={width === undefined ? undefined : { width }}>
        <ScheduleCard schedule={schedule} onSelect={onSelect} />
      </div>,
    ),
  );
  return { ...r, onSelect };
};

const parts = (r: ReturnType<typeof renderCard>) => {
  const q = (cls: string | undefined) =>
    r.container.querySelector<HTMLElement>(`.${cls}`)!;
  return {
    main: q(styles.main),
    value: q(styles.value),
    days: q(styles.days),
  };
};
// two sections share a line when their vertical extents overlap
const sameLine = (a: HTMLElement, b: HTMLElement) => {
  const ra = a.getBoundingClientRect();
  const rb = b.getBoundingClientRect();
  return ra.top < rb.bottom && rb.top < ra.bottom;
};

describe("ScheduleCard", () => {
  it("shows the equipment, window + duration, recurrence, and enable switch", () => {
    renderCard();
    // the name carries .name
    expect(screen.getByText("Filter Pump")).toHaveClass(styles.name!);
    expect(screen.getByText(/ – .* · 8h/)).toBeInTheDocument();
    // enabled: false → switch is off
    expect(screen.getByRole("switch")).not.toBeChecked();
  });

  it("shows the schedule's value as a captioned readout, with the preset name as the value and no separate detail line", () => {
    const { container } = renderCard();
    expect(screen.getByText("Speed")).toBeInTheDocument();
    expect(screen.getAllByText("Low")).toHaveLength(1);
    const valueContainer = container.querySelector<HTMLElement>(
      `.${styles.value!}`,
    )!;
    // only the caption and the large value, no preset line
    expect(within(valueContainer).getAllByText(/./)).toHaveLength(2);
  });

  it("a theme's schedule shows the name, window, and days with no value", () => {
    render(
      wrap(
        <ScheduleCard
          schedule={{
            ...schedule,
            equipmentName: "White Light",
            kind: "theme",
            type: "theme",
            data: 1,
            value: "Run",
            bodyId: -1,
            bodyName: "Themes",
          }}
          onSelect={vi.fn()}
        />,
      ),
    );
    expect(screen.getByText("White Light")).toBeInTheDocument();
    expect(screen.queryByText("Run")).toBeNull();
    expect(screen.queryByText("Action")).toBeNull();
  });

  it("opens the editor when the card (not the switch) is clicked", () => {
    const { onSelect } = renderCard();
    screen.getByRole("button", { name: /edit filter pump schedule/i }).click();
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("lays out as one row in a wide column; narrower, the value and the days share a line under the name until it is too narrow for both", () => {
    // wide: name, value, and days on one line
    const wide = parts(renderCard(vi.fn(), 800));
    expect(sameLine(wide.main, wide.value)).toBe(true);
    expect(sameLine(wide.value, wide.days)).toBe(true);

    // mid: the name on the first line, value left and days right on the next
    const mid = parts(renderCard(vi.fn(), 480));
    expect(sameLine(mid.main, mid.value)).toBe(false);
    expect(sameLine(mid.value, mid.days)).toBe(true);
    expect(mid.value.getBoundingClientRect().left).toBeLessThan(
      mid.days.getBoundingClientRect().left,
    );

    // narrow: the days drop below the value
    const narrow = parts(renderCard(vi.fn(), 220));
    expect(sameLine(narrow.main, narrow.value)).toBe(false);
    expect(sameLine(narrow.value, narrow.days)).toBe(false);
  });
});
