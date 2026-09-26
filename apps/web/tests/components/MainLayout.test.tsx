import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { setLayoutWidth } from "@/client/layout-width";
import { MainLayout } from "@/components/layout/MainLayout";

const renderShell = () => {
  return render(
    <MantineProvider>
      <MainLayout brand={<span>BrandSlot</span>} nav={<span>NavSlot</span>}>
        <p>Page body</p>
      </MainLayout>
    </MantineProvider>,
  );
};

describe("MainLayout", () => {
  it("renders the brand slot, nav slot, and page content", () => {
    renderShell();
    expect(screen.getByText("BrandSlot")).toBeInTheDocument();
    expect(screen.getByText("NavSlot")).toBeInTheDocument();
    expect(screen.getByText("Page body")).toBeInTheDocument();
  });

  it("reflects the persisted width mode on the root element", () => {
    setLayoutWidth("wide");
    const wide = renderShell();
    expect(wide.container.querySelector("[data-layout-width]")).toHaveAttribute(
      "data-layout-width",
      "wide",
    );
    wide.unmount();
    setLayoutWidth("normal");
    const normal = renderShell();
    expect(
      normal.container.querySelector("[data-layout-width]"),
    ).toHaveAttribute("data-layout-width", "normal");
  });
});
