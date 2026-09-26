import {
  type CommandName,
  countdownParams,
  timerParams,
} from "@rygine/omnilogic-local-sdk";

import {
  coalesce,
  defer,
  forMinutes,
  label,
  lightOf,
  lightSender,
  sent,
  type Attach,
  type Handle,
  type OnAndLevel,
} from "@/accessories/attach";
import { colorForShow, showForColor, type HsColor } from "@/colors";

// the wait after the last change from HomeKit before sending all changes as one command
const DEBOUNCE_MS = 200;

export const attachLight = (
  a: Attach,
  opts: { lightId: number; offAfter?: number },
): Handle => {
  const { Characteristic } = a.hap;
  const omni = a.session.omni;
  const light = () => lightOf(a, opts.lightId);
  const shows = () => light().shows;

  const on = a.service.getCharacteristic(Characteristic.On);
  // an OmniDirect light dims in the controller's five steps
  const brightness = light().omniDirect
    ? a.service.getCharacteristic(Characteristic.Brightness)
    : undefined;
  brightness?.setProps({ minValue: 20, maxValue: 100, minStep: 20 });
  const hue = a.service.getCharacteristic(Characteristic.Hue);
  const saturation = a.service.getCharacteristic(Characteristic.Saturation);
  let lastColor: HsColor = { hue: 0, saturation: 0 };
  // values waiting for the next write
  let pending: Partial<HsColor> & { brightness?: number; on?: true } = {};
  let timer: ReturnType<typeof setTimeout> | null = null;
  // callers waiting on the next write
  let waiting: { resolve: () => void; reject: (e: unknown) => void }[] = [];

  const sender = lightSender(a, opts.lightId);
  // resolves once the controller acknowledges, with no re-read
  const send = (
    name: CommandName,
    params: Record<string, number>,
    what: string,
  ) =>
    sender.send(
      () =>
        omni.command(name, {
          poolId: light().poolId,
          equipmentId: opts.lightId,
          ...timerParams(),
          ...params,
        }),
      what,
    );
  // the controller's countdown when this write turns the light on
  const offTimer = (turningOn: boolean) =>
    turningOn && opts.offAfter !== undefined
      ? countdownParams(opts.offAfter)
      : {};

  const apply = async () => {
    const p = pending;
    pending = {};
    const wasOff = !light().isOn;
    const colored = p.hue !== undefined || p.saturation !== undefined;
    const color = {
      hue: p.hue ?? lastColor.hue,
      saturation: p.saturation ?? lastColor.saturation,
    };
    const snapped = colored ? showForColor(color, shows()) : undefined;
    if (snapped !== undefined || p.brightness !== undefined) {
      const show = snapped ?? light().state?.currentShow ?? 0;
      await send(
        "SetStandAloneLightShow",
        {
          ...light().showParams(show, { brightness: p.brightness }),
          ...offTimer(wasOff),
        },
        p.brightness === undefined ? "show" : "brightness",
      );
      const name = shows().find((x) => x.value === show)?.name ?? "";
      if (snapped !== undefined) {
        lastColor = colorForShow(name) ?? color;
        defer(hue, lastColor.hue);
        defer(saturation, lastColor.saturation);
      }
      if (p.brightness !== undefined && brightness !== undefined) {
        defer(brightness, p.brightness);
      }
      on.updateValue(true);
      sent(
        a,
        p.brightness === undefined
          ? `show ${name}`
          : `show ${name} at ${p.brightness}%`,
      );
      return;
    }
    if (p.on) {
      await send("SetUIEquipmentCmd", { isOn: 1, ...offTimer(true) }, "power");
      on.updateValue(true);
      sent(a, `on${forMinutes(opts.offAfter)}`);
    }
  };

  // each change resolves once the command carrying it is sent
  const queue = (part: typeof pending): Promise<void> =>
    new Promise((resolve, reject) => {
      pending = { ...pending, ...part };
      waiting.push({ resolve, reject });
      if (timer !== null) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => {
        timer = null;
        const settling = waiting;
        waiting = [];
        apply().then(
          () => settling.forEach((w) => w.resolve()),
          (e: unknown) => settling.forEach((w) => w.reject(e)),
        );
      }, DEBOUNCE_MS);
    });

  on.onSet(async (value) => {
    if (value === true) {
      return queue({ on: true });
    }
    // an off goes out at once, never gathered with other values
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    pending = {};
    const dropped = waiting;
    waiting = [];
    dropped.forEach((w) => w.resolve());
    await send("SetUIEquipmentCmd", { isOn: 0 }, "power");
    on.updateValue(false);
    sent(a, "off");
  });
  brightness?.onSet((value) =>
    queue({ brightness: Math.round(Number(value) / 20) * 20 }),
  );
  hue.onSet((value) => queue({ hue: Number(value) }));
  saturation.onSet((value) => queue({ saturation: Number(value) }));

  return {
    update: () => {
      sender.read();
      const l = light();
      on.updateValue(l.isOn);
      const color = colorForShow(l.show);
      if (color !== undefined) {
        lastColor = color;
      }
      hue.updateValue(lastColor.hue);
      saturation.updateValue(lastColor.saturation);
      // a code outside the light's five steps has no brightness
      const level = l.brightness;
      if (level !== undefined) {
        brightness?.updateValue(level);
      }
    },
  };
};

export const attachLightSwitch = (
  a: Attach,
  opts: {
    lightId: number;
    show: number;
    speed?: string;
    brightness?: number;
    offAfter?: number;
  },
): Handle => {
  const on = a.service.getCharacteristic(a.hap.Characteristic.On);
  const light = () => lightOf(a, opts.lightId);
  const showOptions = () => {
    const chosen = opts.speed !== undefined || opts.brightness !== undefined;
    if (light().omniDirect || !chosen) {
      return { speed: opts.speed, brightness: opts.brightness };
    }
    a.log.warn(
      `${label(a)}: a speed or brightness is set, but the light is not in OmniDirect mode, so the switch sends its show without them`,
    );
    return {};
  };
  const showName = () =>
    light().shows.find((s) => s.value === opts.show)?.name ??
    `show ${opts.show}`;
  const sender = lightSender(a, opts.lightId);
  on.onSet(async (value) => {
    const ids = () => ({ poolId: light().poolId, equipmentId: opts.lightId });
    await sender.send(
      () =>
        value === true
          ? a.session.omni.command("SetStandAloneLightShow", {
              ...ids(),
              ...timerParams(),
              ...light().showParams(opts.show, showOptions()),
              ...(opts.offAfter === undefined
                ? {}
                : countdownParams(opts.offAfter)),
            })
          : a.session.omni.command("SetUIEquipmentCmd", {
              ...ids(),
              isOn: 0,
              ...timerParams(),
            }),
      "power",
    );
    on.updateValue(value === true);
    sent(
      a,
      value === true
        ? `on with ${showName()}${forMinutes(opts.offAfter)}`
        : "off",
    );
  });
  return {
    update: () => {
      sender.read();
      on.updateValue(light().isOn);
    },
  };
};

// the light as a Lightbulb held to one show, with a brightness slider
export const attachLightDimmer = (
  a: Attach,
  opts: { lightId: number; show: number; speed?: string; offAfter?: number },
): Handle => {
  const { Characteristic } = a.hap;
  const light = () => lightOf(a, opts.lightId);
  const on = a.service.getCharacteristic(Characteristic.On);
  const brightness = a.service.getCharacteristic(Characteristic.Brightness);
  brightness.setProps({ minValue: 20, maxValue: 100, minStep: 20 });
  const showName = () =>
    light().shows.find((s) => s.value === opts.show)?.name ??
    `show ${opts.show}`;

  const sender = lightSender(a, opts.lightId);
  const ids = () => ({ poolId: light().poolId, equipmentId: opts.lightId });

  const apply = async (part: OnAndLevel) => {
    if (part.on === false) {
      await sender.send(
        () =>
          a.session.omni.command("SetUIEquipmentCmd", {
            ...ids(),
            isOn: 0,
            ...timerParams(),
          }),
        "power",
      );
      on.updateValue(false);
      sent(a, "off");
      return;
    }
    const level = part.percent ?? light().brightness ?? 100;
    const wasOff = !light().isOn;
    await sender.send(
      () =>
        a.session.omni.command("SetStandAloneLightShow", {
          ...ids(),
          ...timerParams(),
          ...light().showParams(opts.show, {
            speed: opts.speed,
            brightness: level,
          }),
          ...(wasOff && opts.offAfter !== undefined
            ? countdownParams(opts.offAfter)
            : {}),
        }),
      part.percent === undefined ? "power" : "brightness",
    );
    on.updateValue(true);
    defer(brightness, level);
    sent(
      a,
      `${showName()} at ${level}%${wasOff ? forMinutes(opts.offAfter) : ""}`,
    );
  };
  const queue = coalesce(apply);
  on.onSet((value) => queue({ on: value === true }));
  brightness.onSet((value) =>
    queue({ percent: Math.round(Number(value) / 20) * 20 }),
  );

  return {
    update: () => {
      sender.read();
      const l = light();
      on.updateValue(l.isOn);
      const level = l.brightness;
      if (level !== undefined) {
        brightness.updateValue(level);
      }
    },
  };
};
