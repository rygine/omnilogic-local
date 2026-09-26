import {
  CalendarBlankIcon,
  CpuIcon,
  GearSixIcon,
  ListBulletsIcon,
  PaletteIcon,
  SquaresFourIcon,
  StarIcon,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";

// the real route paths, so <Link to> stays type-checked against the route tree
type NavTo =
  | "/equipment"
  | "/favorites"
  | "/schedules"
  | "/themes"
  | "/system"
  | "/settings"
  | "/logs";

type NavItem = {
  to: NavTo;
  label: string;
  icon: Icon;
};

export const NAV: NavItem[] = [
  { to: "/equipment", label: "Equipment", icon: SquaresFourIcon },
  { to: "/favorites", label: "Favorites", icon: StarIcon },
  { to: "/schedules", label: "Schedules", icon: CalendarBlankIcon },
  { to: "/themes", label: "Themes", icon: PaletteIcon },
  { to: "/system", label: "System", icon: CpuIcon },
  { to: "/settings", label: "Settings", icon: GearSixIcon },
  { to: "/logs", label: "Logs", icon: ListBulletsIcon },
];
