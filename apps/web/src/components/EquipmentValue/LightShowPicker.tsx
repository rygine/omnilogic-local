import {
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import type { LightShowInfo } from "@rygine/omnilogic-local-sdk";
import { useState } from "react";

import { lightSwatch } from "@/client/lightShowSwatch";
import { sentenceCase } from "@/shared/sentence-case";

import styles from "./LightShowPicker.module.css";

// the selected color, a Fixed/Shows toggle, and a grid of circles, valued by show number
export const LightShowPicker = ({
  shows,
  value,
  onChange,
}: {
  shows: LightShowInfo[];
  value: number;
  onChange: (show: number) => void;
}) => {
  const fixed = shows.filter((s) => lightSwatch(s.name).fixed);
  const dynamic = shows.filter((s) => !lightSwatch(s.name).fixed);
  const selected = shows.find((s) => s.value === value);

  // start on the tab holding the current selection
  const [tab, setTab] = useState(
    selected && !lightSwatch(selected.name).fixed ? "shows" : "fixed",
  );

  const showTabs = fixed.length > 0 && dynamic.length > 0;
  const active = !showTabs && dynamic.length > 0 ? "shows" : tab;
  const grid = active === "shows" ? dynamic : fixed;

  return (
    <Stack gap="sm">
      <div className={styles.selected}>
        <Text fz="1.75rem" fw={700} lh={1}>
          {selected ? sentenceCase(selected.name) : "—"}
        </Text>
        {selected && (
          <span
            className={styles.selectedSwatch}
            style={{ background: lightSwatch(selected.name).css }}
          />
        )}
      </div>

      {showTabs && (
        <SegmentedControl
          value={active}
          onChange={setTab}
          color="blue"
          data={[
            { value: "fixed", label: "Fixed" },
            { value: "shows", label: "Shows" },
          ]}
        />
      )}

      <SimpleGrid cols={4} spacing="xs" verticalSpacing="sm">
        {grid.map((s) => {
          const sw = lightSwatch(s.name);
          const isSelected = s.value === value;
          return (
            <UnstyledButton
              key={s.value}
              className={styles.cell}
              data-selected={isSelected || undefined}
              onClick={() => onChange(s.value)}
              aria-pressed={isSelected}
              aria-label={sentenceCase(s.name)}>
              <span className={styles.swatch} style={{ background: sw.css }} />
              <Text size="xs" ta="center" lineClamp={2}>
                {sentenceCase(s.name)}
              </Text>
            </UnstyledButton>
          );
        })}
      </SimpleGrid>
    </Stack>
  );
};
