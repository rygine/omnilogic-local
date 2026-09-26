import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, it, expect, vi } from "vitest";

import { SettingsForm } from "@/components/SettingsForm/SettingsForm";

type Props = ComponentProps<typeof SettingsForm>;

const setup = (overrides: Partial<Pick<Props, "onSave" | "onTest">> = {}) => {
  const onSave = vi.fn<Props["onSave"]>();
  const onTest = vi.fn<Props["onTest"]>().mockResolvedValue({ ok: true });
  render(
    <MantineProvider>
      <SettingsForm
        initial={{ host: "", port: 10444 }}
        onSave={overrides.onSave ?? onSave}
        onTest={overrides.onTest ?? onTest}
      />
    </MantineProvider>,
  );
  return { onSave, onTest };
};

describe("SettingsForm", () => {
  it("disables both buttons until the host is a valid address", async () => {
    setup();
    const user = userEvent.setup();
    expect(screen.getByRole("button", { name: /test/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();
    await user.type(screen.getByRole("textbox", { name: "IP" }), "192.168.1");
    expect(
      screen.getByText("Enter an IP address or a hostname"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /test/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();
    await user.type(screen.getByRole("textbox", { name: "IP" }), ".228");
    expect(screen.getByRole("button", { name: /test/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /save/i })).toBeEnabled();
  });

  it("keeps Save disabled while the address matches what is stored", async () => {
    const onSave = vi.fn<Props["onSave"]>();
    const onTest = vi.fn<Props["onTest"]>().mockResolvedValue({ ok: true });
    render(
      <MantineProvider>
        <SettingsForm
          initial={{ host: "192.168.1.100", port: 10444 }}
          onSave={onSave}
          onTest={onTest}
        />
      </MantineProvider>,
    );
    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /test/i })).toBeEnabled();
    const user = userEvent.setup();
    await user.clear(screen.getByRole("textbox", { name: "IP" }));
    await user.type(
      screen.getByRole("textbox", { name: "IP" }),
      "192.168.1.101",
    );
    expect(screen.getByRole("button", { name: /save/i })).toBeEnabled();
  });

  it("calls onSave with current host/port", async () => {
    const { onSave } = setup();
    const user = userEvent.setup();
    await user.type(
      screen.getByRole("textbox", { name: "IP" }),
      "192.168.1.100",
    );
    await user.click(screen.getByRole("button", { name: /save/i }));
    expect(onSave).toHaveBeenCalledWith({ host: "192.168.1.100", port: 10444 });
  });

  it("runs the test against the current address and reports through a notification", async () => {
    const { onTest } = setup();
    const user = userEvent.setup();
    await user.type(screen.getByRole("textbox", { name: "IP" }), "1.1.1.1");
    await user.click(screen.getByRole("button", { name: /test/i }));
    expect(onTest).toHaveBeenCalledWith({ host: "1.1.1.1", port: 10444 });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
