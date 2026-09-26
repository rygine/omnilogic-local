import {
  Button,
  Group,
  SimpleGrid,
  Slider,
  Stack,
  Switch,
  Text,
} from "@mantine/core";

import {
  useSystemWideSettings,
  type FilterBody,
} from "@/client/filter-settings";
import { FilterSpeedInput } from "@/components/EquipmentValue/FilterSpeedInput";
import {
  CopyDiffAlerts,
  DurationRow,
} from "@/components/FilterSettings/system-wide";
import type { FilterSetting } from "@/server/fns/bow";

// the firmware caps the freeze protection temperature at 42 °F, the 33 floor is the app's
const FREEZE_TEMP_RANGE = { min: 33, max: 42 };

const FREEZE_PROTECT_DESCRIPTION =
  "Runs the pump at the speed below when the air sensor reaches the temperature below, rotating between pool and spa; one setting for the whole system";

// the fields, in the order the section and Apply present them
const FREEZE_FIELDS = [
  "freezeProtect",
  "freezeProtectTemp",
  "freezeProtectSpeed",
  "freezeProtectOverrideInterval",
  "sharedFilterTimeout",
] satisfies FilterSetting[];
type FreezeField = (typeof FREEZE_FIELDS)[number];

const FIELD_LABEL: Record<FreezeField, string> = {
  freezeProtect: "Freeze protection",
  freezeProtectTemp: "Freeze protect temperature",
  freezeProtectSpeed: "Freeze protect speed",
  freezeProtectOverrideInterval: "Freeze protect override",
  sharedFilterTimeout: "Shared filter timeout",
};

// how each raw value reads in the copy-differs alert
const FIELD_FORMAT: Record<FreezeField, (value: boolean | number) => string> = {
  freezeProtect: (v) => (v ? "on" : "off"),
  freezeProtectTemp: (v) => `${v}°F`,
  freezeProtectSpeed: (v) => `${v}%`,
  freezeProtectOverrideInterval: (v) => `${v}s`,
  sharedFilterTimeout: (v) => `${v}s`,
};

// freeze protection is system-wide, written to every body's copy
export const FreezeProtectionSection = ({
  bodies,
}: {
  // every body with a filter, in world order
  bodies: FilterBody[];
}) => {
  const s = useSystemWideSettings(bodies, FREEZE_FIELDS, [
    "freezeProtectOverrideInterval",
    "sharedFilterTimeout",
  ]);

  // the firmware refuses a freeze protection speed above any filter's Maximum
  const minPumpMaxSpeed = Math.min(
    ...bodies.map((b) => b.filter.settings.pumpMaxSpeed),
  );
  const apply = () =>
    s.apply((field) =>
      field === "freezeProtectSpeed"
        ? Math.min(s.draft.freezeProtectSpeed, minPumpMaxSpeed)
        : s.draft[field],
    );

  return (
    <Stack gap="sm" aria-label="Freeze protection settings">
      <CopyDiffAlerts
        copyDiffs={s.copyDiffs}
        fieldLabel={FIELD_LABEL}
        fieldFormat={FIELD_FORMAT}
      />
      <Switch
        label="Enabled"
        description={FREEZE_PROTECT_DESCRIPTION}
        checked={s.draft.freezeProtect}
        onChange={(e) => s.set("freezeProtect", e.currentTarget.checked)}
      />
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <Stack gap={4} align="center">
          <Text size="xs" c="dimmed" fw={600} tt="uppercase">
            Freeze protect temperature
          </Text>
          <Text fz="1.75rem" fw={700} lh={1}>
            {s.draft.freezeProtectTemp}°F
          </Text>
          <Slider
            w="100%"
            mt="xs"
            min={FREEZE_TEMP_RANGE.min}
            max={FREEZE_TEMP_RANGE.max}
            step={1}
            value={s.draft.freezeProtectTemp}
            label={null}
            thumbLabel="Freeze protect temperature"
            disabled={!s.draft.freezeProtect}
            onChange={(v) => s.set("freezeProtectTemp", v)}
          />
          <Text size="xs" c="dimmed" ta="center" mt={4}>
            Air temperature at or below which the pump runs (°F on every
            controller)
          </Text>
        </Stack>
        <FilterSpeedInput
          label="Freeze protect speed"
          description="The pump speed while freeze protection runs; never above the smallest Maximum across bodies"
          disabled={!s.draft.freezeProtect}
          rpmRange={s.pool.filter.rpmRange}
          speedRange={s.pool.filter.speedRange}
          value={s.draft.freezeProtectSpeed}
          onChange={(p) => s.set("freezeProtectSpeed", p)}
        />
      </SimpleGrid>
      <DurationRow
        setting="freezeProtectOverrideInterval"
        label="Freeze protect override"
        description="How long a manual override of freeze protection lasts"
        value={s.draft.freezeProtectOverrideInterval}
        current={s.current.freezeProtectOverrideInterval}
        onChange={(v) => s.set("freezeProtectOverrideInterval", v)}
        disabled={!s.draft.freezeProtect}
      />
      <DurationRow
        setting="sharedFilterTimeout"
        label="Shared filter timeout"
        description="How long freeze protection runs each body before switching, when pool and spa share the pump"
        value={s.draft.sharedFilterTimeout}
        current={s.current.sharedFilterTimeout}
        onChange={(v) => s.set("sharedFilterTimeout", v)}
        disabled={!s.draft.freezeProtect}
      />
      <Group justify="flex-end" mt="md">
        <Button
          onClick={() => void apply()}
          loading={s.mut.isPending}
          disabled={s.pendingFields.length === 0 || s.durationInvalid}>
          Apply
        </Button>
      </Group>
    </Stack>
  );
};
