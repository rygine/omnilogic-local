import {
  CSAD_MODE,
  type Chlorinator,
  type CSAD,
} from "@rygine/omnilogic-local-sdk";

import {
  numberSetting,
  type DeviceSpec,
  enumOf,
  availableWhile,
  nameInArea,
} from "@/entities/entity";

const ph = { device_class: "ph" };
const mv = { device_class: "voltage", unit_of_measurement: "mV" };

export const csad = (
  c: CSAD,
  area: string,
  chlorinator?: Chlorinator,
): DeviceSpec => ({
  id: String(c.equipmentId),
  name: nameInArea(area, c.name),
  model: c.type,
  area,
  entities: [
    {
      platform: "sensor",
      key: "ph",
      name: "pH",
      config: { ...ph, state_class: "measurement" },
      value: () => c.ph,
    },
    {
      platform: "sensor",
      key: "orp",
      name: "ORP",
      config: { ...mv, state_class: "measurement" },
      value: () => c.orp,
    },
    {
      platform: "sensor",
      key: "mode",
      name: "Mode",
      config: enumOf(CSAD_MODE, "Off"),
      value: () => c.mode,
    },
    {
      platform: "binary_sensor",
      key: "dispensing",
      name: "Dispensing",
      config: { device_class: "running" },
      value: () => c.isDispensing,
    },
    numberSetting(
      "ph_target",
      "pH target",
      { min: 7, max: 8, step: 0.1 },
      () => c.phTarget,
      (v) => c.setPhTarget(v),
    ),
    availableWhile(
      numberSetting(
        "orp_target",
        "ORP target",
        { min: 400, max: 900, step: 5, unit_of_measurement: "mV" },
        () => c.orpTarget,
        (v) => c.setOrpTarget(v),
      ),
      () =>
        chlorinator === undefined || chlorinator.operatingMode === "ORP Auto",
    ),
    ...(
      [
        ["ph_calibration", "pH calibration", ph, () => c.phCalibration],
        ["ph_low_alarm", "pH low alarm", ph, () => c.phLowAlarm],
        ["ph_high_alarm", "pH high alarm", ph, () => c.phHighAlarm],
        ["orp_low_alarm", "ORP low alarm", mv, () => c.orpLowAlarm],
        ["orp_high_alarm", "ORP high alarm", mv, () => c.orpHighAlarm],
      ] as const
    ).map(([key, name, config, value]) => ({
      platform: "sensor" as const,
      key,
      name,
      config: { entity_category: "diagnostic", ...config },
      value,
    })),
  ],
});
