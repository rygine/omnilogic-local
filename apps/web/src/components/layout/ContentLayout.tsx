import { Box, Burger, Group, Title } from "@mantine/core";
import type { ReactNode } from "react";

import { useLayout } from "./LayoutContext";
import { ThemeToggle } from "./ThemeToggle";
import { WidthMenu } from "./WidthMenu";

import classes from "./ContentLayout.module.css";

type ContentLayoutProps = {
  title: ReactNode;
  children: ReactNode;
};

// a page's header (title, burger, and the width and theme controls) and body
export const ContentLayout = ({ title, children }: ContentLayoutProps) => {
  const { navOpen, openNav } = useLayout();
  return (
    <>
      <Group
        component="header"
        className={classes.header}
        px="md"
        gap="sm"
        wrap="nowrap">
        <Burger
          opened={navOpen}
          onClick={openNav}
          hiddenFrom="sm"
          size="sm"
          aria-label="Open navigation"
        />
        <Title order={1} size="h4" className={classes.title} lineClamp={1}>
          {title}
        </Title>
        <Group gap="xs" wrap="nowrap" ml="auto">
          <WidthMenu />
          <ThemeToggle />
        </Group>
      </Group>
      <Box flex={1} p="md" pb={64}>
        {children}
      </Box>
    </>
  );
};
