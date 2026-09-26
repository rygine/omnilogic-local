import { Group } from "@mantine/core";

import { useDiagnosticsTarget } from "./DiagnosticsTargetContext";
import { ViewDiagnosticsButton } from "./ViewDiagnosticsButton";

// a centered View diagnostics button, nothing without a target
export const ViewDiagnosticsLink = () =>
  useDiagnosticsTarget() === undefined ? null : (
    <Group justify="center">
      <ViewDiagnosticsButton />
    </Group>
  );
