import {
  forMinutes,
  guard,
  relayOf,
  sent,
  type Attach,
  type Handle,
} from "@/accessories/attach";

export const attachRelaySwitch = (
  a: Attach,
  opts: { relayId: number; offAfter?: number },
): Handle => {
  const { Characteristic } = a.hap;
  const on = a.service.getCharacteristic(Characteristic.On);
  const relay = () => relayOf(a, opts.relayId);
  on.onSet(
    guard(a, async (value) => {
      const r = relay();
      await a.session.write(() => {
        if (value !== true) {
          return r.off();
        }
        return opts.offAfter === undefined
          ? r.on()
          : r.setCountdownTime(opts.offAfter);
      });
      on.updateValue(value === true);
      sent(a, value === true ? `on${forMinutes(opts.offAfter)}` : "off");
    }),
  );
  return { update: () => on.updateValue(relay().isOn) };
};

export const attachThemeSwitch = (
  a: Attach,
  opts: { themeId: number; offAfter?: number },
): Handle => {
  const on = a.service.getCharacteristic(a.hap.Characteristic.On);
  on.onSet(
    guard(a, async (value) => {
      await a.session.write(() => {
        if (a.session.omni.backyard.themes.get(opts.themeId) === undefined) {
          throw new Error("the theme is no longer on the controller");
        }
        return a.session.omni.backyard.themes.run(
          opts.themeId,
          value === true,
          {
            minutes: value === true ? opts.offAfter : undefined,
          },
        );
      });
      on.updateValue(value === true);
      sent(a, value === true ? `run${forMinutes(opts.offAfter)}` : "stop");
    }),
  );
  return {
    update: () =>
      on.updateValue(
        Boolean(
          a.session.omni.telemetry.themes.find(
            (t) => t.systemId === opts.themeId,
          )?.groupState,
        ),
      ),
  };
};
