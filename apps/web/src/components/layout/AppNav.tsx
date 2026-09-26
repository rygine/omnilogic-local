import { NavLink } from "@mantine/core";
import { Link, useMatchRoute } from "@tanstack/react-router";

import { NAV } from "@/nav";

import { useLayout } from "./LayoutContext";

export const AppNav = () => {
  const matchRoute = useMatchRoute();
  const { closeNav } = useLayout();

  return (
    <>
      {NAV.map((item) => {
        const Icon = item.icon;
        // a section stays lit on its nested routes
        const active = Boolean(matchRoute({ to: item.to, fuzzy: true }));
        return (
          <NavLink
            key={item.to}
            renderRoot={(props) => <Link {...props} to={item.to} />}
            label={item.label}
            leftSection={<Icon size={18} />}
            active={active}
            onClick={closeNav}
          />
        );
      })}
    </>
  );
};
