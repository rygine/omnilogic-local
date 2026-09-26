import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { useModalClose, useModalDirty } from "@/components/Modal/modal-state";
import { ResponsiveModal } from "@/components/Modal/ResponsiveModal";

// a nested part that never has an edit, like a control's countdown timer
const AlwaysClean = () => {
  useModalDirty(false);
  return null;
};

// an editable body reporting dirty once changed, with a clean reporter after it
const Editable = () => {
  const [value, setValue] = useState(0);
  useModalDirty(value !== 0);
  return (
    <>
      <button type="button" onClick={() => setValue(1)}>
        Edit
      </button>
      <AlwaysClean />
    </>
  );
};

const Body = () => {
  const close = useModalClose();
  return (
    <button type="button" onClick={close}>
      Done
    </button>
  );
};

describe("ResponsiveModal", () => {
  it("renders the title and children", () => {
    render(
      <MantineProvider>
        <ResponsiveModal title="New schedule" onExited={vi.fn()}>
          <Body />
        </ResponsiveModal>
      </MantineProvider>,
    );
    expect(screen.getByText("New schedule")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument();
  });

  it("fires onExited after a child triggers close (exit animation)", async () => {
    const onExited = vi.fn();
    render(
      <MantineProvider>
        <ResponsiveModal title="New schedule" onExited={onExited}>
          <Body />
        </ResponsiveModal>
      </MantineProvider>,
    );
    screen.getByRole("button", { name: "Done" }).click();
    await waitFor(() => expect(onExited).toHaveBeenCalledOnce());
  });

  it("closes on Escape while nothing is edited", async () => {
    const onExited = vi.fn();
    render(
      <MantineProvider>
        <ResponsiveModal title="Filter" onExited={onExited}>
          <Editable />
        </ResponsiveModal>
      </MantineProvider>,
    );
    await screen.findByRole("button", { name: "Edit" });
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(onExited).toHaveBeenCalledOnce());
  });

  it("holds against Escape once a value is edited", async () => {
    const onExited = vi.fn();
    render(
      <MantineProvider>
        <ResponsiveModal title="Filter" onExited={onExited}>
          <Editable />
        </ResponsiveModal>
      </MantineProvider>,
    );
    await userEvent.click(await screen.findByRole("button", { name: "Edit" }));
    await userEvent.keyboard("{Escape}");
    // give a wrongly permitted close time to animate out
    await new Promise((r) => setTimeout(r, 400));
    expect(onExited).not.toHaveBeenCalled();
    expect(screen.getByText("Filter")).toBeInTheDocument();
  });
});
