import {
  Button,
  Group,
  NumberInput,
  Select,
  Skeleton,
  Stack,
  Switch,
} from "@mantine/core";

import {
  useRefreshPanelSettings,
  useSetPanelSetting,
} from "@/client/mutations";
import { inputNumber } from "@/client/number-input";
import { usePanelSettings } from "@/client/queries";
import { useDraft } from "@/client/use-draft";
import { LoadError } from "@/components/LoadError/LoadError";
import { SectionHeader } from "@/components/SectionHeader/SectionHeader";
import { SettingRow } from "@/components/SettingRow/SettingRow";
import { StoredMeta } from "@/components/StoredMeta/StoredMeta";
import { PANEL_SETTINGS, type PanelSettings } from "@/server/fns/panel";

// the panel's own settings, a draft over the stored value
export const PanelSettingsSection = () => {
  const q = usePanelSettings();
  const refresh = useRefreshPanelSettings();
  return (
    <>
      <SectionHeader
        title="Panel"
        aside={
          q.data && (
            <StoredMeta
              readAt={q.data.readAt}
              refreshing={refresh.isPending}
              onRefresh={() => refresh.mutate()}
            />
          )
        }
      />
      {q.isPending ? (
        <PanelSkeleton />
      ) : q.isError || !q.data ? (
        <LoadError onRetry={() => void q.refetch()} retrying={q.isFetching} />
      ) : (
        <PanelForm current={q.data.value} />
      )}
    </>
  );
};

const PanelForm = ({ current }: { current: PanelSettings }) => {
  const mut = useSetPanelSetting();
  const { draft, set, reset, dirty } = useDraft(current);
  const brightnessOk =
    Number.isInteger(draft.backLightBrightness) &&
    draft.backLightBrightness >= 1 &&
    draft.backLightBrightness <= 100;
  const timeoutOk =
    Number.isInteger(draft.backLightTimeout) &&
    draft.backLightTimeout >= 1 &&
    draft.backLightTimeout <= 3600;

  const apply = async () => {
    try {
      for (const field of PANEL_SETTINGS) {
        if (draft[field] !== current[field]) {
          await mut.mutateAsync({ setting: field, value: draft[field] });
        }
      }
      reset();
    } catch {
      // the error is already shown and the draft stays editable
    }
  };

  return (
    <Stack gap="lg" aria-label="Panel settings">
      <SettingRow
        label="Beeper"
        description="Key clicks and alarm tones at the panel"
        control={
          <Switch
            aria-label="Beeper"
            checked={draft.beeper}
            onChange={(e) => set("beeper", e.currentTarget.checked)}
          />
        }
      />
      <SettingRow
        label="Backlight"
        description="The panel's screen light"
        control={
          <Switch
            aria-label="Backlight"
            checked={draft.backLight}
            onChange={(e) => set("backLight", e.currentTarget.checked)}
          />
        }
      />
      <SettingRow
        label="Backlight brightness"
        description="Percent; the panel has reported 50 and 100"
        control={
          <NumberInput
            aria-label="Backlight brightness"
            suffix="%"
            clampBehavior="none"
            allowDecimal={false}
            value={
              Number.isNaN(draft.backLightBrightness)
                ? ""
                : draft.backLightBrightness
            }
            onChange={(v) => set("backLightBrightness", inputNumber(v))}
            error={!brightnessOk}
            w={130}
          />
        }
      />
      <SettingRow
        label="Backlight timeout"
        description="How long the screen stays lit after the last touch"
        control={
          <NumberInput
            aria-label="Backlight timeout"
            suffix="s"
            clampBehavior="none"
            allowDecimal={false}
            value={
              Number.isNaN(draft.backLightTimeout) ? "" : draft.backLightTimeout
            }
            onChange={(v) => set("backLightTimeout", inputNumber(v))}
            error={!timeoutOk}
            w={130}
          />
        }
      />
      <SettingRow
        label="Pump speed display"
        description="How the panel and its apps show pump speeds — a display choice; the wire values do not change"
        control={
          <Select
            aria-label="Pump speed display"
            data={[
              { value: "rpm", label: "RPM" },
              { value: "percent", label: "Percent" },
            ]}
            value={draft.vspSpeedFormat ? "rpm" : "percent"}
            onChange={(v) => {
              if (v !== null) {
                set("vspSpeedFormat", v === "rpm");
              }
            }}
            allowDeselect={false}
            checkIconPosition="right"
            w={130}
          />
        }
      />
      <SettingRow
        label="Chlorinator label"
        description="Whether the panel calls the cell's reading salt or minerals — a label only"
        control={
          <Select
            aria-label="Chlorinator label"
            data={[
              { value: "salt", label: "Salt" },
              { value: "minerals", label: "Minerals" },
            ]}
            value={draft.chlorinatorDisplay ? "salt" : "minerals"}
            onChange={(v) => {
              if (v !== null) {
                set("chlorinatorDisplay", v === "salt");
              }
            }}
            allowDeselect={false}
            checkIconPosition="right"
            w={130}
          />
        }
      />
      <Group justify="flex-end">
        <Button
          onClick={() => void apply()}
          loading={mut.isPending}
          disabled={!dirty || !brightnessOk || !timeoutOk}>
          Apply
        </Button>
      </Group>
    </Stack>
  );
};

const PanelSkeleton = () => (
  <Stack gap="lg">
    {Array.from({ length: 6 }, (_, i) => (
      <Group key={i} justify="space-between" wrap="nowrap">
        <div>
          <Skeleton height={12} width={140} mb={8} radius="sm" />
          <Skeleton height={10} width={220} radius="sm" />
        </div>
        <Skeleton height={32} width={130} radius="sm" />
      </Group>
    ))}
  </Stack>
);
