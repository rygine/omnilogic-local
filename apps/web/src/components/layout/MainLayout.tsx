import { Box, FocusTrap, Group, Stack } from "@mantine/core";
import { useState, type ReactNode } from "react";

import { useLayoutWidth } from "@/client/layout-width";

import { LayoutContext } from "./LayoutContext";

import classes from "./MainLayout.module.css";

type MainLayoutProps = {
  brand: ReactNode;
  nav: ReactNode;
  children: ReactNode;
};

// the app shell: a navbar beside the content, a drawer below sm
export const MainLayout = ({ brand, nav, children }: MainLayoutProps) => {
  const [navOpen, setNavOpen] = useState(false);
  const openNav = () => setNavOpen(true);
  const closeNav = () => setNavOpen(false);
  const width = useLayoutWidth();

  return (
    <LayoutContext.Provider value={{ navOpen, openNav, closeNav }}>
      <div
        className={classes.root}
        data-layout-width={width}
        data-nav-open={navOpen}>
        {navOpen && (
          <Box className={classes.scrim} hiddenFrom="sm" onClick={closeNav} />
        )}
        <FocusTrap active={navOpen}>
          <Stack
            component="nav"
            className={classes.nav}
            gap={0}
            aria-label="Main"
            onKeyDown={(event) => {
              // Esc closes the open drawer
              if (event.key === "Escape") {
                closeNav();
              }
            }}>
            <Group className={classes.brand} px="md" flex="0 0 auto">
              {brand}
            </Group>
            <Box className={classes.navBody} p="xs" flex={1}>
              {nav}
            </Box>
          </Stack>
        </FocusTrap>
        <div className={classes.main}>{children}</div>
      </div>
    </LayoutContext.Provider>
  );
};
