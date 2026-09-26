import { createContext, useContext } from "react";

import type { DiagnosticsTarget } from "@/client/queries";

// the diagnostics target the equipment modal resolved
export const DiagnosticsTargetContext = createContext<
  DiagnosticsTarget | undefined
>(undefined);

export const useDiagnosticsTarget = (): DiagnosticsTarget | undefined =>
  useContext(DiagnosticsTargetContext);
