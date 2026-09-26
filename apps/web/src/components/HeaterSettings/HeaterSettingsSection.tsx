import {
  Button,
  Group,
  NumberInput,
  Select,
  Slider,
  Stack,
  Switch,
  Text,
} from "@mantine/core";

import { anyDurationInvalid } from "@/client/filter-settings";
import { useSetFilterSettingOn, useSetHeaterSetting } from "@/client/mutations";
import { useHeaterAutoDifferential } from "@/client/queries";
import { useDraft } from "@/client/use-draft";
import { FilterSpeedInput } from "@/components/EquipmentValue/FilterSpeedInput";
import { DurationRow } from "@/components/FilterSettings/system-wide";
import { SettingRow } from "@/components/SettingRow/SettingRow";
import type { HeaterSetting } from "@/server/fns/bow";
import type { FilterDetail, HeaterDetail } from "@/server/serializers";
import { HEATER_MODE } from "@/shared/heater-mode";
import type { Range } from "@/shared/speed";

// the panel offers three, and Off is only ever reported
const MODE_OPTIONS = Object.entries(HEATER_MODE)
  .filter(([value]) => value !== "3")
  .map(([value, label]) => ({ value, label }));

// a minimum speed the firmware accepts, within the pump's operating range
const clampSpeed = (percent: number, bounds: Range) =>
  Math.min(Math.max(percent, bounds.min), bounds.max);

const MIN_SPEED_DESCRIPTION =
  "The lowest the pump may run while the heater is heating, and through its cooldown; an idle or paused heater asks nothing of the pump. A pump already running faster is left alone; a slower one is raised to this. Applies only with Allow low speed on.";

// the firmware clamps the auto-differential to this range on write
const DIFFERENTIAL = { min: 2, max: 10 };

type Draft = {
  heaterCooldown: boolean;
  heaterExtend: boolean;
  heaterAutoDifferential: number;
  heaterAllowLowSpeed: boolean;
  heaterLowSpeed: number;
  heaterMode: number;
  heaterSilentMode: boolean;
  // the filter's cooldown duration, 0 without a filter
  cooldownDuration: number;
};

const fromHeater = (
  h: HeaterDetail,
  differential: number | undefined,
  filter: FilterDetail | undefined,
): Draft => ({
  heaterCooldown: h.cooldown,
  heaterExtend: h.extend,
  // until the read lands the slider shows the floor, disabled
  heaterAutoDifferential: differential ?? DIFFERENTIAL.min,
  heaterAllowLowSpeed: h.lowSpeed?.allow ?? false,
  heaterLowSpeed: h.lowSpeed?.minSpeed ?? 0,
  heaterMode: h.mode,
  heaterSilentMode: h.silentMode,
  cooldownDuration: filter?.settings.cooldownDuration ?? 0,
});

// a pending write, tagged by the mutation that carries it
type PendingChange =
  | { kind: "heater"; setting: HeaterSetting; value: boolean | number }
  | { kind: "filter"; setting: "cooldownDuration"; value: number };

// the settings whose draft differs from the controller's, in a fixed order
const changes = (
  draft: Draft,
  current: Draft,
  lowSpeedBounds: Range | undefined,
  hasFilter: boolean,
): PendingChange[] => {
  const out: PendingChange[] = [];
  const bool = (
    s:
      | "heaterCooldown"
      | "heaterExtend"
      | "heaterAllowLowSpeed"
      | "heaterSilentMode",
  ) => {
    if (draft[s] !== current[s]) {
      out.push({ kind: "heater", setting: s, value: draft[s] });
    }
  };
  bool("heaterCooldown");
  bool("heaterExtend");
  if (hasFilter && draft.cooldownDuration !== current.cooldownDuration) {
    out.push({
      kind: "filter",
      setting: "cooldownDuration",
      value: draft.cooldownDuration,
    });
  }
  if (draft.heaterAutoDifferential !== current.heaterAutoDifferential) {
    out.push({
      kind: "heater",
      setting: "heaterAutoDifferential",
      value: draft.heaterAutoDifferential,
    });
  }
  bool("heaterAllowLowSpeed");
  // the raw draft decides pending, the clamp applies to the write
  if (draft.heaterLowSpeed !== current.heaterLowSpeed) {
    out.push({
      kind: "heater",
      setting: "heaterLowSpeed",
      value: lowSpeedBounds
        ? clampSpeed(draft.heaterLowSpeed, lowSpeedBounds)
        : draft.heaterLowSpeed,
    });
  }
  if (draft.heaterMode !== current.heaterMode) {
    out.push({
      kind: "heater",
      setting: "heaterMode",
      value: draft.heaterMode,
    });
  }
  bool("heaterSilentMode");
  return out;
};

// one body's heater settings, mode and silent mode on a heat pump only
export const HeaterSettingsSection = ({
  bowId,
  bodyName,
  heater,
  filter,
}: {
  bowId: number;
  bodyName: string;
  heater: HeaterDetail;
  // the body's filter, when it has one
  filter?: FilterDetail;
}) => {
  const mut = useSetHeaterSetting(bowId);
  const filterMut = useSetFilterSettingOn();
  const differential = useHeaterAutoDifferential(bowId, true);
  const current = fromHeater(heater, differential.data?.value, filter);
  const { draft, set, reset } = useDraft(current);
  const pending = changes(
    draft,
    current,
    heater.lowSpeed?.speedRange,
    filter !== undefined,
  );
  const isGas = heater.type === "HTR_GAS";

  const apply = async () => {
    try {
      for (const change of pending) {
        if (change.kind === "heater") {
          await mut.mutateAsync({
            setting: change.setting,
            value: change.value,
          });
        }
        // a filter change exists only with a filter
        else {
          await filterMut.mutateAsync({
            bowId,
            filterId: filter!.id,
            setting: change.setting,
            value: change.value,
          });
        }
      }
      reset();
    } catch {
      // the error is already shown and the drafts stay editable
    }
  };

  return (
    <Stack gap="sm" aria-label={`${bodyName} heater settings`}>
      <SettingRow
        label="Auto differential"
        description="How far below the set point before heating resumes"
        labelSize="md"
        control={
          <Stack gap={4} align="center" w={150}>
            <Text fw={700} lh={1}>
              {draft.heaterAutoDifferential}°F
            </Text>
            <Slider
              w="100%"
              min={DIFFERENTIAL.min}
              max={DIFFERENTIAL.max}
              step={1}
              value={draft.heaterAutoDifferential}
              label={null}
              thumbLabel="Auto differential"
              disabled={differential.isPending}
              onChange={(v) => set("heaterAutoDifferential", v)}
            />
          </Stack>
        }
      />
      <Switch
        label="Cooldown"
        description="Keep the pump running after the heater stops"
        checked={draft.heaterCooldown}
        onChange={(e) => set("heaterCooldown", e.currentTarget.checked)}
      />
      {filter && (
        <DurationRow
          setting="cooldownDuration"
          label="Cooldown duration"
          description="How long the pump keeps running after the heater stops"
          value={draft.cooldownDuration}
          current={current.cooldownDuration}
          onChange={(v) => set("cooldownDuration", v)}
          disabled={!draft.heaterCooldown}
        />
      )}
      <Switch
        label="Extend"
        description="Keep the pump running past its schedule until the set point is reached"
        checked={draft.heaterExtend}
        onChange={(e) => set("heaterExtend", e.currentTarget.checked)}
      />
      {heater.lowSpeed && (
        <>
          <Switch
            label="Allow low speed"
            description="While the heater is heating, the pump only has to run at or above the minimum speed below; with this off, the heater pushes the pump to full speed instead"
            checked={draft.heaterAllowLowSpeed}
            onChange={(e) =>
              set("heaterAllowLowSpeed", e.currentTarget.checked)
            }
          />
          {heater.lowSpeed.presets ? (
            <FilterSpeedInput
              label="Minimum speed"
              description={MIN_SPEED_DESCRIPTION}
              disabled={!draft.heaterAllowLowSpeed}
              presets={heater.lowSpeed.presets}
              rpmRange={heater.lowSpeed.rpmRange}
              speedRange={heater.lowSpeed.speedRange}
              value={draft.heaterLowSpeed}
              onChange={(p) => set("heaterLowSpeed", p)}
            />
          ) : (
            <SettingRow
              label="Minimum speed"
              description={MIN_SPEED_DESCRIPTION}
              labelSize="md"
              control={
                <NumberInput
                  aria-label="Minimum speed"
                  value={draft.heaterLowSpeed}
                  onChange={(v) =>
                    typeof v === "number" && set("heaterLowSpeed", v)
                  }
                  min={heater.lowSpeed.speedRange.min}
                  max={heater.lowSpeed.speedRange.max}
                  allowDecimal={false}
                  disabled={!draft.heaterAllowLowSpeed}
                  w={110}
                />
              }
            />
          )}
        </>
      )}
      {!isGas && (
        <>
          <Group justify="space-between" align="center" wrap="nowrap">
            <Text fw={500}>Mode</Text>
            <Select
              aria-label="Mode"
              data={MODE_OPTIONS}
              value={String(draft.heaterMode)}
              onChange={(v) => v !== null && set("heaterMode", Number(v))}
              w={140}
            />
          </Group>
          <Switch
            label="Silent mode"
            description="Quieter fan and compressor at reduced output"
            checked={draft.heaterSilentMode}
            onChange={(e) => set("heaterSilentMode", e.currentTarget.checked)}
          />
        </>
      )}
      <Group justify="flex-end" mt="md">
        <Button
          onClick={() => void apply()}
          loading={mut.isPending || filterMut.isPending}
          disabled={
            pending.length === 0 ||
            anyDurationInvalid(draft, current, ["cooldownDuration"])
          }>
          Apply
        </Button>
      </Group>
    </Stack>
  );
};
