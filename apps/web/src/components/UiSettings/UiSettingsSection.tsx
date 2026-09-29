import { Select, Stack } from "@mantine/core";

import {
  NOTIFICATION_POSITIONS,
  setSettings,
  useSettings,
  type NotificationPosition,
} from "@/client/settings";
import { SettingRow } from "@/components/SettingRow/SettingRow";

// the refresh cadences offered, in seconds
const REFRESH_CHOICES = [
  { value: "10", label: "10s" },
  { value: "15", label: "15s" },
  { value: "30", label: "30s" },
  { value: "60", label: "1m" },
  { value: "120", label: "2m" },
  { value: "300", label: "5m" },
];

const POSITION_LABEL: Record<NotificationPosition, string> = {
  "top-left": "Top left",
  "top-center": "Top center",
  "top-right": "Top right",
  "bottom-left": "Bottom left",
  "bottom-center": "Bottom center",
  "bottom-right": "Bottom right",
};

// the app's own settings, each change saved at once
export const UiSettingsSection = () => {
  const settings = useSettings();
  return (
    <Stack gap="lg" aria-label="UI settings">
      <SettingRow
        label="Equipment refresh"
        description="How often the app re-reads the controller for the state of every piece of equipment. Changes made at the panel or elsewhere show up within this time; changes made here show at once."
        control={
          <Select
            aria-label="Equipment refresh"
            data={REFRESH_CHOICES}
            value={String(settings.refreshSeconds)}
            onChange={(v) => {
              if (v !== null) {
                setSettings({ ...settings, refreshSeconds: Number(v) });
              }
            }}
            allowDeselect={false}
            checkIconPosition="right"
            w={140}
            style={{ flexShrink: 0 }}
          />
        }
      />
      <SettingRow
        label="Notification position"
        description="Where the app's notifications appear — the outcome of a command, a saved setting, a failed connection test."
        control={
          <Select
            aria-label="Notification position"
            data={NOTIFICATION_POSITIONS.map((p) => ({
              value: p,
              label: POSITION_LABEL[p],
            }))}
            value={settings.notificationPosition}
            onChange={(v) => {
              const pos = NOTIFICATION_POSITIONS.find((p) => p === v);
              if (pos) {
                setSettings({ ...settings, notificationPosition: pos });
              }
            }}
            allowDeselect={false}
            checkIconPosition="right"
            w={140}
            style={{ flexShrink: 0 }}
          />
        }
      />
    </Stack>
  );
};
