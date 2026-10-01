import {
  defer,
  deviceOf,
  failed,
  guard,
  label,
  sent,
  type Attach,
  type Handle,
} from "@/accessories/attach";
import { clampToRange, type Range } from "@/helpers";

const OUTPUT: Range = { min: 1, max: 100 };

export const attachChlorinator = (
  a: Attach,
  opts: { bodyId: number; asSwitch: boolean; onPercent?: number },
): Handle => {
  const { Characteristic } = a.hap;
  const on = a.service.getCharacteristic(Characteristic.On);
  const output = opts.asSwitch
    ? undefined
    : a.service.getCharacteristic(Characteristic.RotationSpeed);
  output?.setProps({ minValue: OUTPUT.min, maxValue: OUTPUT.max, minStep: 1 });
  // the alert and error text the cell last reported
  let lastAlert = "None";
  let lastError = "None";
  const onPercent =
    opts.onPercent === undefined
      ? undefined
      : clampToRange(opts.onPercent, OUTPUT);

  on.onSet(
    guard(a, async (value) => {
      const c = deviceOf(a, opts.bodyId, "chlorinator");
      const turningOn = value === true;
      await a.session.write(async () => {
        if (
          turningOn &&
          onPercent !== undefined &&
          c.state.timedPercent !== onPercent
        ) {
          await c.setTimedPercent(onPercent);
        }
        await c.setEnabled(turningOn);
      });
      on.updateValue(turningOn);
      sent(
        a,
        turningOn
          ? `on${onPercent === undefined ? "" : ` at ${onPercent}%`}`
          : "off",
      );
    }),
  );
  output?.onSet(
    guard(a, async (value) => {
      const percent = Number(value);
      await a.session
        .write(() =>
          deviceOf(a, opts.bodyId, "chlorinator").setTimedPercent(percent),
        )
        .catch((e: unknown) => failed(a, e, "output"));
      defer(output, percent);
      sent(a, `output ${percent}%`);
    }),
  );

  return {
    update: () => {
      const c = deviceOf(a, opts.bodyId, "chlorinator");
      output?.updateValue(clampToRange(c.state.timedPercent, OUTPUT));
      on.updateValue(c.enabled);
      const alert = c.alert;
      if (alert !== lastAlert) {
        lastAlert = alert;
        a.log.warn(`${label(a)}: alert ${alert}`);
      }
      const error = c.error;
      if (error !== lastError) {
        lastError = error;
        a.log.warn(`${label(a)}: error ${error}`);
      }
    },
  };
};
