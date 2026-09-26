import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type * as Router from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import type * as Queries from "@/client/queries";
import type * as Settings from "@/client/settings";
import type * as Themes from "@/client/themes";
import { ThemeModal } from "@/components/ThemeModal/ThemeModal";
import type { ThemeSummary } from "@/server/serializers";

const themes: { isPending: boolean; data: ThemeSummary[] | undefined } = {
  isPending: false,
  data: [
    {
      id: 26,
      name: "Testing",
      active: false,
      equipment: [
        {
          body: "Pool",
          kind: "light",
          name: "Pool Light",
          state: "Cloud White",
        },
      ],
    },
  ],
};
const activate = vi.fn<(vars: unknown, options?: unknown) => void>();
const remove = vi.fn<(vars: unknown, options?: unknown) => void>();

vi.mock("@/client/themes", async (importOriginal) => ({
  ...(await importOriginal<typeof Themes>()),
  useThemes: () => themes,
  useActivateTheme: () => ({ mutate: activate, isPending: false }),
  useRenameTheme: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteTheme: () => ({ mutate: remove, isPending: false }),
  useThemeCountdown: () => null,
}));
vi.mock("@/client/settings", async (importOriginal) => ({
  ...(await importOriginal<typeof Settings>()),
  useSettings: () => ({ host: "h", port: 10444, refreshSeconds: 30 }),
}));
// the title's schedule links as plain anchors outside a router
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof Router>()),
  Link: ({
    to,
    params,
    children,
    ...rest
  }: {
    to: string;
    params?: Record<string, string>;
    children?: ReactNode;
  }) => (
    <a
      href={Object.entries(params ?? {}).reduce(
        (path, [key, value]) => path.replace(`$${key}`, value),
        to,
      )}
      {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/client/queries", async (importOriginal) => ({
  ...(await importOriginal<typeof Queries>()),
  useSchedules: () => ({
    data: [
      {
        id: 36,
        equipmentId: 26,
        bodyId: -1,
        bodyName: "Themes",
        equipmentName: "Testing",
        kind: "theme",
        type: "theme",
        data: 1,
        value: "Run",
        startHour: 20,
        startMinute: 0,
        endHour: 21,
        endMinute: 0,
        daysActive: 127,
        enabled: true,
        recurring: true,
      },
    ],
  }),
}));
vi.mock("@/components/FavoriteStar/FavoriteStar", () => ({
  FavoriteStar: () => null,
}));

const r = (ui: ReactNode) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>{ui}</MantineProvider>
    </QueryClientProvider>,
  );

describe("ThemeModal", () => {
  it("runs the theme under a countdown from the duration fields", async () => {
    activate.mockClear();
    r(<ThemeModal themeId={26} onExited={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Start" }));
    expect(activate).toHaveBeenCalledWith({
      theme: themes.data?.[0],
      on: true,
      minutes: 60,
    });
  });

  it("the power button runs the theme with no countdown", async () => {
    activate.mockClear();
    r(<ThemeModal themeId={26} onExited={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Activate" }));
    expect(activate).toHaveBeenCalledWith({
      theme: themes.data?.[0],
      on: true,
    });
  });

  it("deletes only after the in-place confirm", async () => {
    remove.mockClear();
    r(<ThemeModal themeId={26} onExited={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(remove).not.toHaveBeenCalled();
    await userEvent.click(
      screen.getByRole("button", { name: "Confirm delete" }),
    );
    expect(remove).toHaveBeenCalledWith(themes.data?.[0], expect.anything());
  });

  it("lists the equipment the theme sets, under its body", () => {
    r(<ThemeModal themeId={26} onExited={vi.fn()} />);
    expect(screen.getByText("Pool")).toBeInTheDocument();
    expect(screen.getByText("Pool Light")).toBeInTheDocument();
    expect(screen.getByText("Cloud White")).toBeInTheDocument();
  });

  it("links to each schedule that runs the theme", () => {
    r(<ThemeModal themeId={26} onExited={vi.fn()} />);
    expect(screen.getByRole("link", { name: /Open schedule/ })).toHaveAttribute(
      "href",
      "/schedules/36",
    );
  });

  it("says so when the theme is gone", () => {
    r(<ThemeModal themeId={99} onExited={vi.fn()} />);
    expect(screen.getByText(/no longer available/i)).toBeInTheDocument();
  });
});
