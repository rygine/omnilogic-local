import { waterTemp, type Attach, type Handle } from "@/accessories/attach";
import { toCelsius } from "@/helpers";

const attachTemperatureSensor = (
  a: Attach,
  key: string,
  read: () => number | undefined,
): Handle => {
  const { Characteristic } = a.hap;
  const temp = a.service.getCharacteristic(Characteristic.CurrentTemperature);
  // allow readings below 0°C
  temp.setProps({ minValue: -40 });
  const active = a.service.getCharacteristic(Characteristic.StatusActive);
  return {
    update: () => {
      const live = read();
      // no reading while the pump is off
      active.updateValue(live !== undefined);
      const shown = a.readings.keep(key, live);
      if (shown !== undefined) {
        temp.updateValue(toCelsius(shown));
      }
    },
  };
};

export const attachWaterSensor = (
  a: Attach,
  opts: { bodyId: number },
): Handle =>
  attachTemperatureSensor(a, `water:${String(opts.bodyId)}`, () =>
    waterTemp(a, opts.bodyId),
  );

export const attachAirSensor = (a: Attach): Handle =>
  attachTemperatureSensor(a, "air", () => a.session.omni.backyard.airTemp);
