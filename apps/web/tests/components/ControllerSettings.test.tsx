import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ControllerSettings } from "@/components/ControllerSettings/ControllerSettings";
import type { ControllerSettings as ControllerSettingsData } from "@/server/config-settings";

const data: ControllerSettingsData = {
  groups: [
    {
      title: "System",
      rows: [{ label: "Temperature units", value: "Fahrenheit" }],
    },
    {
      title: "Pool · Filter",
      rows: [{ label: "Freeze protect temp", value: "38°F" }],
    },
  ],
};

describe("ControllerSettings", () => {
  it("renders each group title and its label/value rows", () => {
    render(
      <MantineProvider>
        <ControllerSettings data={data} />
      </MantineProvider>,
    );
    expect(screen.getByText("System")).toBeInTheDocument();
    expect(screen.getByText("Pool · Filter")).toBeInTheDocument();
    expect(screen.getByText("Temperature units")).toBeInTheDocument();
    expect(screen.getByText("Fahrenheit")).toBeInTheDocument();
    expect(screen.getByText("38°F")).toBeInTheDocument();
  });

  it("shows an empty message when there are no groups", () => {
    render(
      <MantineProvider>
        <ControllerSettings data={{ groups: [] }} />
      </MantineProvider>,
    );
    expect(screen.getByText("No controller settings.")).toBeInTheDocument();
  });
});
