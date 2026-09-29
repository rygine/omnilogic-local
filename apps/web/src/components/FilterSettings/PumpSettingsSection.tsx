import {
  Button,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  Title,
} from "@mantine/core";
import { useState } from "react";

import {
  useSystemWideSettings,
  type FilterBody,
} from "@/client/filter-settings";
import { FilterSpeedInput } from "@/components/EquipmentValue/FilterSpeedInput";
import type { FilterSetting } from "@/server/fns/bow";
import type { FilterSettings } from "@/server/serializers";
import type { Range } from "@/shared/speed";

import { CopyDiffAlerts, DurationRow } from "./system-wide";

// the system-wide fields, in the order the section and Apply present them
const PUMP_FIELDS = [
  "primingDuration",
  "filterOffDuringValveChange",
  "flowMonitor",
] satisfies FilterSetting[];
type PumpField = (typeof PUMP_FIELDS)[number];

const FIELD_LABEL: Record<PumpField, string> = {
  primingDuration: "Priming duration",
  filterOffDuringValveChange: "Turn off during valve change",
  flowMonitor: "Flow monitor",
};

// how each raw value reads in the copy-differs alert
const FIELD_FORMAT: Record<PumpField, (value: boolean | number) => string> = {
  primingDuration: (v) => `${v}s`,
  filterOffDuringValveChange: (v) => (v ? "on" : "off"),
  flowMonitor: (v) => (v ? "on" : "off"),
};

// the pump's operating range, the one filter setting the panel keeps per body
type SpeedField = "pumpMinSpeed" | "pumpMaxSpeed";
type SpeedDraft = Pick<FilterSettings, SpeedField>;
// edits over each body's current speed settings, by body
type SpeedEdits = Record<number, Partial<SpeedDraft>>;

const speedDraftFor = (body: FilterBody, edits: SpeedEdits): SpeedDraft => ({
  pumpMinSpeed: body.filter.settings.pumpMinSpeed,
  pumpMaxSpeed: body.filter.settings.pumpMaxSpeed,
  ...edits[body.bowId],
});

// this body's pending Minimum and Maximum changes, a raised Maximum first
const speedChangesFor = (
  body: FilterBody,
  edits: SpeedEdits,
): { setting: SpeedField; value: number }[] => {
  const draft = speedDraftFor(body, edits);
  const current = body.filter.settings;
  const min = { setting: "pumpMinSpeed" as const, value: draft.pumpMinSpeed };
  const max = { setting: "pumpMaxSpeed" as const, value: draft.pumpMaxSpeed };
  const ordered =
    draft.pumpMaxSpeed > current.pumpMaxSpeed ? [max, min] : [min, max];
  return ordered.filter((c) => c.value !== current[c.setting]);
};

// one body's Minimum and Maximum sliders, plus the min > max note
const SpeedRangeBody = ({
  draft,
  rpmRange,
  onChange,
}: {
  draft: SpeedDraft;
  rpmRange: Range | null;
  onChange: (field: SpeedField, value: number) => void;
}) => (
  <Stack gap="sm">
    <Stack gap="md">
      <FilterSpeedInput
        label="Minimum"
        rpmRange={rpmRange}
        speedRange={{ min: 0, max: 100 }}
        value={draft.pumpMinSpeed}
        onChange={(p) => onChange("pumpMinSpeed", p)}
      />
      <FilterSpeedInput
        label="Maximum"
        rpmRange={rpmRange}
        speedRange={{ min: 0, max: 100 }}
        value={draft.pumpMaxSpeed}
        onChange={(p) => onChange("pumpMaxSpeed", p)}
      />
    </Stack>
    {draft.pumpMinSpeed > draft.pumpMaxSpeed && (
      <Text size="xs" c="red">
        Minimum must not exceed Maximum
      </Text>
    )}
  </Stack>
);

// the filter pump settings: system-wide fields for every body, and each body's speed range
export const PumpSettingsSection = ({
  bodies,
}: {
  // every body with a filter, in world order
  bodies: FilterBody[];
}) => {
  const s = useSystemWideSettings(bodies, PUMP_FIELDS, ["primingDuration"]);
  const [speedEdits, setSpeedEdits] = useState<SpeedEdits>({});

  const speedChangesByBody = bodies.map((body) => ({
    body,
    changes: speedChangesFor(body, speedEdits),
  }));
  const totalSpeedChanges = speedChangesByBody.reduce(
    (n, b) => n + b.changes.length,
    0,
  );
  const anySpeedInvalid = bodies.some((body) => {
    const d = speedDraftFor(body, speedEdits);
    return d.pumpMinSpeed > d.pumpMaxSpeed;
  });

  const setSpeed = (bowId: number, field: SpeedField, value: number) =>
    setSpeedEdits((e) => ({
      ...e,
      [bowId]: { ...e[bowId], [field]: value },
    }));

  // the system-wide fields to every body, then each body's speed range
  const apply = () =>
    s.apply(undefined, async () => {
      for (const { body, changes } of speedChangesByBody) {
        for (const change of changes) {
          await s.mut.mutateAsync({
            bowId: body.bowId,
            filterId: body.filter.id,
            setting: change.setting,
            value: change.value,
          });
        }
      }
      setSpeedEdits({});
    });

  return (
    <Stack gap="sm" aria-label="Filter pump settings">
      <CopyDiffAlerts
        copyDiffs={s.copyDiffs}
        fieldLabel={FIELD_LABEL}
        fieldFormat={FIELD_FORMAT}
      />
      <DurationRow
        setting="primingDuration"
        label="Priming duration"
        description="How long the pump runs at the High preset when it starts"
        value={s.draft.primingDuration}
        current={s.current.primingDuration}
        onChange={(v) => s.set("primingDuration", v)}
      />
      <Switch
        label="Turn off during valve change"
        description="Stop the pump while a valve moves"
        checked={s.draft.filterOffDuringValveChange}
        onChange={(e) =>
          s.set("filterOffDuringValveChange", e.currentTarget.checked)
        }
      />
      <Switch
        label="Flow monitor"
        description="Shut the pump down after sustained no-flow at the flow switch"
        checked={s.draft.flowMonitor}
        onChange={(e) => s.set("flowMonitor", e.currentTarget.checked)}
      />
      <div>
        <Title order={5}>Speed range</Title>
        <Text size="xs" c="dimmed">
          The pump's operating range; every speed the app or a schedule sets
          sits inside it
        </Text>
      </div>
      {bodies.length === 1 ? (
        <SpeedRangeBody
          draft={speedDraftFor(bodies[0]!, speedEdits)}
          rpmRange={bodies[0]!.filter.rpmRange}
          onChange={(field, value) => setSpeed(bodies[0]!.bowId, field, value)}
        />
      ) : (
        // one column per body, stacking when narrow
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
          {bodies.map((b) => (
            <Paper
              key={b.bowId}
              withBorder
              radius="md"
              p="md"
              bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-6))"
              aria-label={`${b.bodyName} speed range`}>
              <Stack gap="sm">
                <Title order={6}>{b.bodyName}</Title>
                <SpeedRangeBody
                  draft={speedDraftFor(b, speedEdits)}
                  rpmRange={b.filter.rpmRange}
                  onChange={(field, value) => setSpeed(b.bowId, field, value)}
                />
              </Stack>
            </Paper>
          ))}
        </SimpleGrid>
      )}
      <Group justify="flex-end" mt="md">
        <Button
          onClick={() => void apply()}
          loading={s.mut.isPending}
          disabled={
            (s.pendingFields.length === 0 && totalSpeedChanges === 0) ||
            anySpeedInvalid ||
            s.durationInvalid
          }>
          Apply
        </Button>
      </Group>
    </Stack>
  );
};
