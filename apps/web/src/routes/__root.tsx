import {
  ColorSchemeScript,
  MantineProvider,
  mantineHtmlProps,
} from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Navigate,
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
  useHydrated,
  useLocation,
} from "@tanstack/react-router";
import { useState, type ReactNode } from "react";

import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import { hasSettings, useSettings } from "@/client/settings";
import { AppBrand } from "@/components/layout/AppBrand";
import { AppNav } from "@/components/layout/AppNav";
import { MainLayout } from "@/components/layout/MainLayout";
import { theme } from "@/theme";

import favicon from "../../../../brand/favicon.svg?url";

const RootComponent = () => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, refetchOnWindowFocus: false },
        },
      }),
  );
  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <HeadContent />
        <ColorSchemeScript defaultColorScheme="auto" />
      </head>
      <body>
        <MantineProvider theme={theme} defaultColorScheme="auto">
          <QueryClientProvider client={queryClient}>
            <NotificationsAt />
            <MainLayout brand={<AppBrand />} nav={<AppNav />}>
              <SettingsGate>
                <Outlet />
              </SettingsGate>
            </MainLayout>
          </QueryClientProvider>
        </MantineProvider>
        <Scripts />
      </body>
    </html>
  );
};

// the notifications host, at the corner the Settings page chooses
const NotificationsAt = () => {
  const { notificationPosition } = useSettings();
  return <Notifications position={notificationPosition} />;
};

// without a host, redirect to Settings once hydrated
const SettingsGate = ({ children }: { children: ReactNode }) => {
  const hydrated = useHydrated();
  const settings = useSettings();
  const { pathname } = useLocation();
  if (hydrated && !hasSettings(settings) && pathname !== "/settings") {
    return <Navigate to="/settings" />;
  }
  return <>{children}</>;
};

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "OmniLogic" },
    ],
    links: [{ rel: "icon", type: "image/svg+xml", href: favicon }],
  }),
  component: RootComponent,
});
