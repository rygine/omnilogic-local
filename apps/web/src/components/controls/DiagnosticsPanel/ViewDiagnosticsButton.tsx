import { Button, Popover } from "@mantine/core";
import { useState } from "react";

import { DiagnosticsPanel } from "./DiagnosticsPanel";
import { useDiagnosticsTarget } from "./DiagnosticsTargetContext";

// opens the diagnostics panel in a popover, nothing without a target
export const ViewDiagnosticsButton = () => {
  const target = useDiagnosticsTarget();
  const [opened, setOpened] = useState(false);

  if (target === undefined) {
    return null;
  }

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      position="top"
      withArrow
      shadow="md"
      width={380}
      trapFocus
      withinPortal>
      <Popover.Target>
        <Button
          variant="outline"
          radius="xl"
          size="sm"
          onClick={() => setOpened((o) => !o)}>
          View diagnostics
        </Button>
      </Popover.Target>
      <Popover.Dropdown>
        <DiagnosticsPanel target={target} />
      </Popover.Dropdown>
    </Popover>
  );
};
