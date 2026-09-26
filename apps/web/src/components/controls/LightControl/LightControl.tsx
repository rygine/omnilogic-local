import { Button, Group, Slider, Stack, Text } from "@mantine/core";
import { useState } from "react";

import { lightSwatch } from "@/client/lightShowSwatch";
import { useSetEquipmentOn, useSetLightShow } from "@/client/mutations";
import { CountdownTimer } from "@/components/controls/CountdownTimer/CountdownTimer";
import { PowerButton } from "@/components/controls/PowerButton/PowerButton";
import { LightShowPicker } from "@/components/EquipmentValue/LightShowPicker";
import { useModalClose, useModalDirty } from "@/components/Modal/modal-state";
import type { LightDetail } from "@/server/serializers";

// a caption above a slider
const LabeledSlider = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <Stack gap={4}>
    <Text size="xs" c="dimmed" fw={600} tt="uppercase">
      {label}
    </Text>
    {/* room for the end marks' labels */}
    <div style={{ padding: "0 1rem" }}>{children}</div>
  </Stack>
);

export const LightControl = ({
  bowId,
  light,
}: {
  bowId: number;
  light: LightDetail;
}) => {
  const onMut = useSetEquipmentOn(bowId);
  const showMut = useSetLightShow(bowId);
  const close = useModalClose();

  // Apply commits the show
  const current =
    light.shows.find((s) => s.name === light.show)?.value ??
    light.shows[0]?.value ??
    0;
  const currentSpeed = Math.max(0, light.speeds.indexOf(light.speed ?? "1x"));
  const currentBrightness = light.brightness ?? 100;
  const [show, setShow] = useState(current);
  const [speed, setSpeed] = useState(currentSpeed);
  const [brightness, setBrightness] = useState(currentBrightness);
  const changed =
    show !== current ||
    (light.omniDirect &&
      (speed !== currentSpeed || brightness !== currentBrightness));
  useModalDirty(changed);
  // the controller drops a command while the light is between off and on
  const busy = light.busy !== null;
  // a solid color has nothing to run faster or slower
  const selectedName = light.shows.find((s) => s.value === show)?.name;
  const isShow = selectedName !== undefined && !lightSwatch(selectedName).fixed;

  return (
    <Stack gap="md">
      <LightShowPicker shows={light.shows} value={show} onChange={setShow} />
      {light.omniDirect && (
        <>
          <LabeledSlider label="Brightness">
            <Slider
              min={light.brightnesses[0]}
              max={light.brightnesses.at(-1)}
              step={light.brightnesses[1]! - light.brightnesses[0]!}
              marks={light.brightnesses.map((value) => ({
                value,
                label: `${value}%`,
              }))}
              value={brightness}
              onChange={setBrightness}
              label={(v) => `${v}%`}
              disabled={busy}
              mb="lg"
            />
          </LabeledSlider>
          <LabeledSlider label="Speed">
            <Slider
              min={0}
              max={light.speeds.length - 1}
              step={1}
              marks={light.speeds.map((label, value) => ({ value, label }))}
              value={speed}
              onChange={setSpeed}
              label={(v) => light.speeds[v]}
              disabled={busy || !isShow}
              mb="lg"
            />
          </LabeledSlider>
        </>
      )}
      {light.busy !== null && (
        <Text size="sm" c="dimmed">
          {light.name} is {light.busy}. Controls return once it settles.
        </Text>
      )}
      {/* the countdown keeps the current show */}
      <CountdownTimer
        bowId={bowId}
        equipmentId={light.id}
        target="equipment"
        value={1}
        on={light.on}
        active={undefined}
        onCancel={() => onMut.mutateAsync({ equipmentId: light.id, on: false })}
        cancelPending={onMut.isPending}
        disabled={busy}
      />

      <Group justify="space-between">
        <PowerButton
          on={light.on}
          pending={onMut.isPending}
          disabled={busy}
          onToggle={(on) => onMut.mutate({ equipmentId: light.id, on })}
        />
        <Button
          onClick={() => {
            // a slider left alone keeps the light's own value
            showMut.mutate({
              equipmentId: light.id,
              show,
              ...(light.omniDirect && speed !== currentSpeed
                ? { speed: light.speeds[speed] }
                : {}),
              ...(light.omniDirect && brightness !== currentBrightness
                ? { brightness }
                : {}),
            });
            close();
          }}
          loading={showMut.isPending}
          disabled={busy || !changed}>
          Apply
        </Button>
      </Group>
    </Stack>
  );
};
