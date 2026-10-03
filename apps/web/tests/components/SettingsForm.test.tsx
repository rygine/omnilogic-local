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
  it("disables Test until the host is a valid address, and Save until a test passes", async () => {
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
    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();
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
    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /test/i }));
    expect(screen.getByRole("button", { name: /save/i })).toBeEnabled();
  });

  it("calls onSave with current host/port", async () => {
    const { onSave } = setup();
    const user = userEvent.setup();
    await user.type(
      screen.getByRole("textbox", { name: "IP" }),
      "192.168.1.100",
    );
    await user.click(screen.getByRole("button", { name: /test/i }));
    await user.click(screen.getByRole("button", { name: /save/i }));
    expect(onSave).toHaveBeenCalledWith({ host: "192.168.1.100", port: 10444 });
  });

  it("shows the test's result under the fields until the address changes", async () => {
    const firmware =
      "Firmware R0501000 is not supported: R0502000 or newer required.";
    const onTest = vi
      .fn<Props["onTest"]>()
      .mockResolvedValueOnce({ ok: false, message: firmware })
      .mockResolvedValueOnce({
        ok: true,
        message: "Connection successful. Save to continue.",
      });
    setup({ onTest });
    const user = userEvent.setup();
    const ip = screen.getByRole("textbox", { name: "IP" });
    await user.type(ip, "1.1.1.1");
    await user.click(screen.getByRole("button", { name: /test/i }));
    expect(onTest).toHaveBeenCalledWith({ host: "1.1.1.1", port: 10444 });
    expect(screen.getByRole("alert")).toHaveTextContent(firmware);

    await user.type(ip, "1");
    expect(screen.queryByText(firmware)).toBeNull();
    expect(
      screen.getByText("Test the connection before saving."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /test/i }));
    expect(
      screen.getByText("Connection successful. Save to continue."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("enables Save only after a passing test of the address entered", async () => {
    const onTest = vi
      .fn<Props["onTest"]>()
      .mockResolvedValueOnce({
        ok: false,
        message:
          "Firmware R0501000 is not supported: R0502000 or newer required.",
      })
      .mockResolvedValue({ ok: true });
    setup({ onTest });
    const user = userEvent.setup();
    const ip = screen.getByRole("textbox", { name: "IP" });
    const save = () => screen.getByRole("button", { name: /save/i });
    await user.type(ip, "192.168.1.100");
    await user.click(screen.getByRole("button", { name: /test/i }));
    expect(save()).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /test/i }));
    expect(save()).toBeEnabled();
    await user.type(ip, "1");
    expect(save()).toBeDisabled();
  });

  it("clears a verified address when a later test request fails", async () => {
    const onTest = vi
      .fn<Props["onTest"]>()
      .mockResolvedValueOnce({ ok: true })
      .mockRejectedValueOnce(new Error("network"));
    setup({ onTest });
    const user = userEvent.setup();
    await user.type(
      screen.getByRole("textbox", { name: "IP" }),
      "192.168.1.100",
    );
    await user.click(screen.getByRole("button", { name: /test/i }));
    expect(screen.getByRole("button", { name: /save/i })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: /test/i }));
    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();
  });

  it("asks for a test while Save waits on one", async () => {
    setup();
    const user = userEvent.setup();
    const hint = "Test the connection before saving.";
    expect(screen.queryByText(hint)).toBeNull();
    await user.type(
      screen.getByRole("textbox", { name: "IP" }),
      "192.168.1.100",
    );
    expect(screen.getByText(hint)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /test/i }));
    expect(screen.queryByText(hint)).toBeNull();
  });
});
