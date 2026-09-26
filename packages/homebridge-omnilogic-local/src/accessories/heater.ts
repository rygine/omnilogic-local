import {
  defer,
  deviceOf,
  failed,
  forMinutes,
  heaterTimer,
  sent,
  waterTemp,
  type Attach,
  type Handle,
} from "@/accessories/attach";
import { clampToRange, fromCelsius, toCelsius } from "@/helpers";
import type { AutoOff } from "@/persist";

export const attachHeaterThermostat = (
  a: Attach,
  opts: { bodyId: number; autoOff?: AutoOff; offAfter?: number },
): Handle => {
  const { Characteristic } = a.hap;
  const omni = a.session.omni;
  const units = () => omni.config.system.units;
  const heater = () => deviceOf(a, opts.bodyId, "heater");
  const timer = heaterTimer(a, opts.autoOff);
  const range = { min: heater().minSetPoint, max: heater().maxSetPoint };

  const target = a.service.getCharacteristic(
    Characteristic.TargetHeatingCoolingState,
  );
  const current = a.service.getCharacteristic(
    Characteristic.CurrentHeatingCoolingState,
  );
  const setPoint = a.service.getCharacteristic(
    Characteristic.TargetTemperature,
  );
  const water = a.service.getCharacteristic(Characteristic.CurrentTemperature);
  const displayUnits = a.service.getCharacteristic(
    Characteristic.TemperatureDisplayUnits,
  );

  // the controller's heater mode for each HomeKit target state
  const modes = [
    {
      label: "Heat",
      mode: 0,
      target: Characteristic.TargetHeatingCoolingState.HEAT,
    },
    {
      label: "Cool",
      mode: 1,
      target: Characteristic.TargetHeatingCoolingState.COOL,
    },
    {
      label: "Auto",
      mode: 2,
      target: Characteristic.TargetHeatingCoolingState.AUTO,
    },
  ];
  const cools = heater().appliances[0]?.supportsCooling === true;
  target.setProps({
    validValues: [
      Characteristic.TargetHeatingCoolingState.OFF,
      ...(cools
        ? modes.map((m) => m.target)
        : [Characteristic.TargetHeatingCoolingState.HEAT]),
    ],
  });
  setPoint.setProps({
    minValue: toCelsius(range.min),
    maxValue: toCelsius(range.max),
    minStep: null,
  });
  // allow readings below 0°C
  water.setProps({ minValue: -40 });

  target.onSet(async (value) => {
    const h = heater();
    const wanted = modes.find((m) => m.target === Number(value));
    const on = wanted !== undefined;
    const arming = on && !h.enabled;
    if (arming) {
      timer.arm();
    }
    await a.session
      .write(async () => {
        if (cools && wanted !== undefined && h.mode !== wanted.label) {
          await h.setMode(wanted.mode);
        }
        await h.setEnabled(on);
      })
      .catch((e: unknown) => failed(a, e, "enable"));
    if (!on && timer.cancel()) {
      sent(a, "timer canceled");
    }
    target.updateValue(value);
    sent(
      a,
      on
        ? `${wanted.label.toLowerCase()}${arming ? forMinutes(opts.offAfter) : ""}`
        : "off",
    );
  });
  setPoint.onSet(async (value) => {
    const h = heater();
    const degrees = clampToRange(fromCelsius(Number(value)), range);
    await a.session
      .write(() => h.setSetPoint(degrees))
      .catch((e: unknown) => failed(a, e, "set point"));
    defer(setPoint, toCelsius(degrees));
    sent(a, `set point ${degrees}°F`);
  });

  return {
    update: () => {
      // with no flow there is no reading
      const temp = a.readings.keep(
        `water:${String(opts.bodyId)}`,
        waterTemp(a, opts.bodyId),
      );
      if (temp !== undefined) {
        water.updateValue(toCelsius(temp));
      }
      displayUnits.updateValue(
        units() === "Standard"
          ? Characteristic.TemperatureDisplayUnits.FAHRENHEIT
          : Characteristic.TemperatureDisplayUnits.CELSIUS,
      );
      const h = heater();
      timer.read(h.enabled);
      const shown = cools ? modes.find((m) => m.label === h.mode) : undefined;
      target.updateValue(
        h.enabled
          ? (shown?.target ?? Characteristic.TargetHeatingCoolingState.HEAT)
          : Characteristic.TargetHeatingCoolingState.OFF,
      );
      const running = h.enabled && h.appliances[0]?.isOn === true;
      const cooling =
        shown?.label === "Cool" ||
        (shown?.label === "Auto" && temp !== undefined && temp > h.setPoint);
      current.updateValue(
        !running
          ? Characteristic.CurrentHeatingCoolingState.OFF
          : cooling
            ? Characteristic.CurrentHeatingCoolingState.COOL
            : Characteristic.CurrentHeatingCoolingState.HEAT,
      );
      setPoint.updateValue(toCelsius(h.setPoint));
    },
  };
};

export const attachHeaterSwitch = (
  a: Attach,
  opts: {
    bodyId: number;
    setPoint?: number;
    autoOff?: AutoOff;
    offAfter?: number;
  },
): Handle => {
  const on = a.service.getCharacteristic(a.hap.Characteristic.On);
  const timer = heaterTimer(a, opts.autoOff);
  const attached = deviceOf(a, opts.bodyId, "heater");
  const setPoint =
    opts.setPoint === undefined
      ? undefined
      : clampToRange(opts.setPoint, {
          min: attached.minSetPoint,
          max: attached.maxSetPoint,
        });

  on.onSet(async (value) => {
    const h = deviceOf(a, opts.bodyId, "heater");
    const turningOn = value === true;
    const arming = turningOn && !h.enabled;
    if (arming) {
      timer.arm();
    }
    await a.session
      .write(async () => {
        if (turningOn && setPoint !== undefined) {
          await h.setSetPoint(setPoint);
        }
        await h.setEnabled(turningOn);
      })
      .catch((e: unknown) => failed(a, e));
    if (!turningOn && timer.cancel()) {
      sent(a, "timer canceled");
    }
    on.updateValue(turningOn);
    sent(
      a,
      turningOn
        ? `on${setPoint === undefined ? "" : ` at ${setPoint}°F`}${arming ? forMinutes(opts.offAfter) : ""}`
        : "off",
    );
  });
  return {
    update: () => {
      const enabled = deviceOf(a, opts.bodyId, "heater").enabled;
      timer.read(enabled);
      on.updateValue(enabled);
    },
  };
};
