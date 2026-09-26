import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type * as Router from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import type * as Queries from "@/client/queries";
import { EquipmentControlModal } from "@/components/controls/EquipmentControl/EquipmentControlModal";
import type { BowDetail } from "@/server/serializers";

// what the modal reads off the world query
const bows: { isPending: boolean; data: BowDetail[] | undefined } = {
  isPending: true,
  data: undefined,
};

vi.mock("@/client/queries", async (importOriginal) => ({
  ...(await importOriginal<typeof Queries>()),
  useBows: () => bows,
}));
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof Router>()),
  useNavigate: () => vi.fn(),
}));

const r = (ui: ReactNode) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>{ui}</MantineProvider>
    </QueryClientProvider>,
  );

const missing = () => screen.queryByText(/no longer available/i);

describe("EquipmentControlModal", () => {
  it("shows a skeleton while the world is pending, not the missing notice", () => {
    bows.isPending = true;
    bows.data = undefined;
    r(<EquipmentControlModal equipmentId={3} onExited={vi.fn()} />);

    expect(missing()).toBeNull();
    expect(
      document.querySelectorAll(".mantine-Skeleton-root").length,
    ).toBeGreaterThan(0);
  });

  it("shows the missing notice once the world has settled without it", () => {
    bows.isPending = false;
    bows.data = [];
    r(<EquipmentControlModal equipmentId={3} onExited={vi.fn()} />);

    expect(missing()).toBeInTheDocument();
  });
});
