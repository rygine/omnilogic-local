import {
  type Filter,
  FILTER_VALVE_POSITION,
} from "@rygine/omnilogic-local-sdk";

import {
  numberSetting,
  type DeviceSpec,
  diagnostic,
  enumOf,
  nameInArea,
  percent,
  fieldTemplate,
  seconds,
  switchSetting,
} from "@/entities/entity";
import { pumpEntities, pumpSchedule } from "@/entities/pump";

export const filter = (f: Filter, area: string, rpm: boolean): DeviceSpec => ({
  id: String(f.equipmentId),
  name: nameInArea(area, f.name),
  model: f.type,
  area,
  entities: [
    ...pumpEntities(f, rpm),
    {
      platform: "sensor",
      key: "power",
      name: "Power",
      config: {
        device_class: "power",
        unit_of_measurement: "W",
        state_class: "measurement",
      },
      value: () => f.power,
    },
    {
      platform: "sensor",
      key: "valve_position",
      name: "Valve position",
      config: enumOf(FILTER_VALVE_POSITION),
      value: () => f.valvePosition,
    },
    {
      platform: "binary_sensor",
      key: "priming",
      name: "Priming",
      config: { device_class: "running" },
      value: () => f.isPriming,
    },
    numberSetting(
      "min_speed",
      "Minimum speed",
      percent,
      () => f.minSpeed,
      (v) => f.setMinSpeed(v),
    ),
    numberSetting(
      "max_speed",
      "Maximum speed",
      percent,
      () => f.maxSpeed,
      (v) => f.setMaxSpeed(v),
    ),
    numberSetting(
      "priming_duration",
      "Priming duration",
      seconds(3600),
      () => f.primingDuration,
      (v) => f.setPrimingDuration(v),
    ),
    numberSetting(
      "cooldown_duration",
      "Cooldown duration",
      seconds(3600),
      () => f.cooldownDuration,
      (v) => f.setCooldownDuration(v),
    ),
    numberSetting(
      "shared_filter_timeout",
      "Shared filter timeout",
      seconds(86400),
      () => f.sharedFilterTimeout,
      (v) => f.setSharedFilterTimeout(v),
    ),
    numberSetting(
      "freeze_protect_override_interval",
      "Freeze protect override interval",
      seconds(86400),
      () => f.freezeProtectOverrideInterval,
      (v) => f.setFreezeProtectOverrideInterval(v),
    ),
    switchSetting(
      "freeze_protect",
      "Freeze protect",
      () => f.freezeProtect,
      (on) => f.setFreezeProtect(on),
    ),
    numberSetting(
      "freeze_protect_temperature",
      "Freeze protect temperature",
      {
        min: 33,
        max: 42,
        step: 1,
        unit_of_measurement: "°F",
        device_class: "temperature",
      },
      () => f.freezeProtectTemp,
      (v) => f.setFreezeProtectTemp(Math.round(v)),
    ),
    numberSetting(
      "freeze_protect_speed",
      "Freeze protect speed",
      percent,
      () => f.freezeProtectSpeed,
      (v) => f.setFreezeProtectSpeed(v),
    ),
    switchSetting(
      "flow_monitor",
      "Flow monitor",
      () => f.flowMonitor,
      (on) => f.setFlowMonitor(on),
    ),
    switchSetting(
      "off_during_valve_change",
      "Off during valve change",
      () => f.offDuringValveChange,
      (on) => f.setOffDuringValveChange(on),
    ),
    {
      platform: "sensor",
      key: "drive_diagnostics",
      name: "Drive error status",
      commandRead: true,
      config: diagnostic,
      topics: (t) => ({
        value_template: fieldTemplate("drive_diagnostics", "errorStatus"),
        json_attributes_topic: t.state,
        json_attributes_template:
          "{{ (value_json.drive_diagnostics or {}) | tojson }}",
      }),
      value: () => f.diagnostics(),
    },
  ],
  schedule: pumpSchedule(f.speedType),
});
