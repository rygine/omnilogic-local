import { Text } from "@mantine/core";

import type { ScheduleTarget } from "@/client/schedule-targets";
import { FilterSpeedInput } from "@/components/EquipmentValue/FilterSpeedInput";
import { LightShowPicker } from "@/components/EquipmentValue/LightShowPicker";
import { PercentInput } from "@/components/EquipmentValue/PercentInput";
import { PercentSlider } from "@/components/EquipmentValue/PercentSlider";
import { TemperatureSlider } from "@/components/EquipmentValue/TemperatureSlider";

// the action editor for a target's kind, a relay just runs on for the window
export const ScheduleAction = ({
  target,
  value,
  onChange,
}: {
  target: ScheduleTarget;
  value: number;
  onChange: (data: number) => void;
}) => {
  switch (target.kind) {
    case "filter":
    case "spillover":
      return target.device.presets ? (
        <FilterSpeedInput
          presets={target.device.presets}
          rpmRange={target.device.rpmRange}
          speedRange={target.device.speedRange}
          value={value}
          onChange={onChange}
        />
      ) : (
        <PercentInput label="Speed" value={value} onChange={onChange} />
      );
    case "pump":
      return <PercentInput label="Speed" value={value} onChange={onChange} />;
    case "chlorinator":
      return (
        <PercentSlider
          label="Chlorinator set point"
          value={value}
          onChange={onChange}
        />
      );
    case "heater":
      return (
        <TemperatureSlider
          label="Set point"
          value={value}
          min={target.device.setPointRange.min}
          max={target.device.setPointRange.max}
          onChange={onChange}
        />
      );
    case "light":
      return (
        <LightShowPicker
          shows={target.device.shows}
          value={value}
          onChange={onChange}
        />
      );
    case "relay":
      return (
        <Text ta="center" fz="1.75rem" fw={700} lh={1}>
          On
        </Text>
      );
    case "theme":
      // the schedule runs the theme, and the editor's title opens it
      return null;
    default:
      return null;
  }
};
