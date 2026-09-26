import {
  ActionIcon,
  Button,
  Divider,
  Group,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { CalendarIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { useSchedules } from "@/client/queries";
import { scheduleWindow } from "@/client/schedule-format";
import {
  useActivateTheme,
  useDeleteTheme,
  useRenameTheme,
  useThemeCountdown,
  useThemes,
} from "@/client/themes";
import { useNow } from "@/client/tick";
import { CountdownRunning } from "@/components/controls/CountdownTimer/CountdownRunning";
import { DurationPicker } from "@/components/controls/CountdownTimer/DurationPicker";
import { PowerButton } from "@/components/controls/PowerButton/PowerButton";
import { EquipmentTable } from "@/components/EquipmentList/EquipmentList";
import { FavoriteStar } from "@/components/FavoriteStar/FavoriteStar";
import { useModalClose, useModalDirty } from "@/components/Modal/modal-state";
import { ResponsiveModal } from "@/components/Modal/ResponsiveModal";
import { SectionsSkeleton } from "@/components/Skeletons/SectionsSkeleton";
import type { ThemeSummary } from "@/server/serializers";
import { THEME_NAME_MAX, utf8Bytes } from "@/shared/names";
import { THEME_FAVORITE_DATA } from "@/shared/spillover";

// the theme's controls as a routed modal on the Themes and Favorites pages
export const ThemeModal = ({
  themeId,
  onExited,
}: {
  themeId: number;
  onExited: () => void;
}) => {
  const themes = useThemes();
  const schedules = useSchedules();
  const theme = themes.data?.find((t) => t.id === themeId);
  // a calendar per schedule that runs this theme, opening its editor
  const scheduled =
    schedules.data?.filter(
      (s) => s.kind === "theme" && s.equipmentId === themeId,
    ) ?? [];
  const title = theme ? (
    <Group gap="xs" wrap="nowrap">
      {theme.name}
      <Group gap={2} wrap="nowrap">
        <FavoriteStar equipmentId={theme.id} data={THEME_FAVORITE_DATA} />
        {scheduled.map((s) => (
          <Tooltip
            key={s.id}
            label={`Scheduled ${scheduleWindow(s)}`}
            withArrow>
            <ActionIcon
              variant="subtle"
              color="gray"
              aria-label={`Open schedule ${scheduleWindow(s)}`}
              renderRoot={(props) => (
                <Link
                  to="/schedules/$scheduleId"
                  params={{ scheduleId: String(s.id) }}
                  {...props}
                />
              )}>
              <CalendarIcon size={18} />
            </ActionIcon>
          </Tooltip>
        ))}
      </Group>
    </Group>
  ) : (
    "Theme"
  );
  return (
    <ResponsiveModal title={title} onExited={onExited} size="md">
      {themes.isPending ? (
        <SectionsSkeleton sections={1} cards={2} cardHeight={40} cols={1} />
      ) : theme === undefined ? (
        <Text c="dimmed">This theme is no longer available.</Text>
      ) : (
        <ThemeControls key={theme.id} theme={theme} />
      )}
    </ResponsiveModal>
  );
};

// the theme takes this long to show active after a run
const SETTLE_MS = 60_000;

const ThemeControls = ({ theme }: { theme: ThemeSummary }) => {
  const close = useModalClose();
  const now = useNow();
  const activateMut = useActivateTheme();
  const renameMut = useRenameTheme();
  const deleteMut = useDeleteTheme();
  const started = useThemeCountdown(theme.id);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [name, setName] = useState(theme.name);
  const busy =
    activateMut.isPending || renameMut.isPending || deleteMut.isPending;
  const trimmed = name.trim();
  const renameValid =
    trimmed.length > 0 &&
    utf8Bytes(trimmed) <= THEME_NAME_MAX &&
    trimmed !== theme.name;
  useModalDirty(trimmed !== theme.name);

  // the countdown is over, or the theme settled inactive
  const ended =
    started !== null &&
    (started.endsAt <= now || (!theme.active && now >= started.at + SETTLE_MS));
  const leftMs = started === null || ended ? 0 : started.endsAt - now;

  return (
    <Stack gap="md">
      <Group align="flex-end" wrap="nowrap">
        <TextInput
          label="Name"
          value={name}
          maxLength={THEME_NAME_MAX}
          onChange={(e) => setName(e.currentTarget.value)}
          style={{ flex: 1 }}
        />
        <Button
          disabled={!renameValid || busy}
          loading={renameMut.isPending}
          onClick={() => renameMut.mutate({ theme, name: trimmed })}>
          Rename
        </Button>
      </Group>
      <Stack gap="xs">
        <Divider />
        <Text size="xs" c="dimmed" fw={600} tt="uppercase">
          Equipment
        </Text>
        <ScrollArea.Autosize mah={360}>
          <EquipmentTable rows={theme.equipment} />
        </ScrollArea.Autosize>
      </Stack>
      <Stack gap="xs">
        <Divider />
        <Text size="xs" c="dimmed" fw={600} tt="uppercase">
          Countdown timer
        </Text>
        {leftMs > 0 ? (
          <CountdownRunning
            leftMs={leftMs}
            onCancel={() => activateMut.mutate({ theme, on: false })}
            pending={activateMut.isPending}
            disabled={busy}
          />
        ) : (
          <DurationPicker
            onStart={(hours, minutes) =>
              activateMut.mutate({
                theme,
                on: true,
                minutes: hours * 60 + minutes,
              })
            }
            pending={activateMut.isPending}
            disabled={busy}
          />
        )}
        <Divider />
      </Stack>
      <Group justify="space-between">
        {confirmDelete ? (
          <Group gap="xs">
            <Button
              variant="filled"
              color="red"
              loading={deleteMut.isPending}
              disabled={busy}
              onClick={() => deleteMut.mutate(theme, { onSuccess: close })}>
              Confirm delete
            </Button>
            <Button variant="default" onClick={() => setConfirmDelete(false)}>
              Keep
            </Button>
          </Group>
        ) : (
          <Button
            variant="filled"
            color="red"
            disabled={busy}
            onClick={() => setConfirmDelete(true)}>
            Delete
          </Button>
        )}
        <PowerButton
          on={theme.active}
          pending={activateMut.isPending}
          disabled={busy}
          onToggle={(on) => activateMut.mutate({ theme, on })}
          onLabel="Activate"
          offLabel="Deactivate"
        />
      </Group>
    </Stack>
  );
};
