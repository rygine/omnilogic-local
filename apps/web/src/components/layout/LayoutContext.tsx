import { createContext, useContext } from "react";

// shell state shared with the nav: the drawer's open state
type LayoutContextValue = {
  navOpen: boolean;
  openNav: () => void;
  closeNav: () => void;
};

export const LayoutContext = createContext<LayoutContextValue | null>(null);

export const useLayout = (): LayoutContextValue => {
  const ctx = useContext(LayoutContext);
  if (ctx === null) {
    throw new Error("useLayout must be used within <MainLayout>");
  }
  return ctx;
};
