import { countdownParams, timerParams } from "@rygine/omnilogic-local-sdk";

import {
  coalesce,
  defer,
  deviceOf,
  failed,
  forMinutes,
  pumpOf,
  sent,
  speeds,
  startWindow,
  type Attach,
  type Handle,
} from "@/accessories/attach";
import {
  clampToRange,
  snapToPreset,
  startSpeed,
  type Presets,
  type Range,
} from "@/helpers";

// a slider's percent, snapped to a preset or kept in range
const fitSpeed = (
  mode: "presets" | "percent" | "switch",
  percent: number,
  presets: Presets,
  range: Range,
): number =>
  mode === "presets"
    ? snapToPreset(percent, presets)
    : clampToRange(percent, range);

// the pump's last speed, else its low preset
const lastOrLow = (
  a: Attach,
  bodyId: number,
  low: number,
  fit = (percent: number) => percent,
): number => {
  const last = deviceOf(a, bodyId, "filter").lastSpeed;
  return last > 0 ? fit(last) : low;
};

export const attachFilter = (
  a: Attach,
  opts: {
    bodyId: number;
    speedMode: "presets" | "percent" | "switch";
    onSpeed?: string;
    onPercent?: number;
  },
): Handle => {
  const { Characteristic } = a.hap;
  const { range, presets } = speeds(a, opts.bodyId);
  const on = a.service.getCharacteristic(Characteristic.On);
  const speed =
    opts.speedMode === "switch"
      ? undefined
      : a.service.getCharacteristic(Characteristic.RotationSpeed);
  speed?.setProps({ minValue: range.min, maxValue: range.max, minStep: 1 });

  const wanted = (percent: number) =>
    fitSpeed(opts.speedMode, percent, presets, range);

  const shown = startWindow(a, opts.bodyId);

  const send = async (percent: number) => {
    const filter = deviceOf(a, opts.bodyId, "filter");
    const starting = percent > 0 && !filter.isRunning;
    await a.session
      .write(() => {
        if (a.session.pumpsSettling()) {
          throw new Error("a pump is priming");
        }
        return filter.setSpeed(percent);
      })
      .catch((e: unknown) => failed(a, e, "speed"));
    if (starting) {
      shown.started(true);
      if (shown.primingSeconds > 0) {
        a.session.lockPumps(shown.primingSeconds);
      }
    } else if (percent === 0) {
      shown.stopped();
    }
    on.updateValue(percent > 0);
    if (speed !== undefined && percent > 0) {
      defer(speed, percent);
    }
    sent(a, percent > 0 ? `on at ${percent}%` : "off");
  };

  const chosen =
    opts.speedMode !== "switch"
      ? undefined
      : startSpeed(opts.onSpeed, opts.onPercent, presets);
  const whenOn = chosen === undefined ? undefined : clampToRange(chosen, range);

  const start = async () => {
    const filter = deviceOf(a, opts.bodyId, "filter");
    if (filter.isRunning || filter.isPriming) {
      return;
    }
    await send(whenOn ?? lastOrLow(a, opts.bodyId, presets.low, wanted));
  };

  const queue = coalesce((p) =>
    p.on === false
      ? send(0)
      : p.percent !== undefined
        ? send(p.percent)
        : start(),
  );

  on.onSet((value) => queue({ on: value === true }));
  speed?.onSet((value) => queue({ percent: wanted(Number(value)) }));

  return {
    update: () => {
      const filter = deviceOf(a, opts.bodyId, "filter");
      on.updateValue(shown.isOn(filter.isRunning || filter.isPriming));
      if (speed !== undefined && filter.isRunning) {
        speed.updateValue(clampToRange(filter.speed, range));
      }
    },
  };
};

export const attachPump = (a: Attach, opts: { pumpId: number }): Handle => {
  const on = a.service.getCharacteristic(a.hap.Characteristic.On);
  const pump = () => pumpOf(a, opts.pumpId);
  on.onSet(async (value) => {
    await a.session
      .write(() =>
        pump().setSpeed(value === true ? pump().lastSpeed || 100 : 0),
      )
      .catch((e: unknown) => failed(a, e));
    on.updateValue(value === true);
    sent(a, value === true ? "on" : "off");
  });
  return { update: () => on.updateValue(pump().isRunning) };
};

// the pump's speed while the valves are in spillover, 0 otherwise
const speedOf = (a: Attach, bodyId: number): number => {
  const body = a.session.omni.backyard.body(bodyId);
  return body?.spilloverOn === true ? (body.filter?.speed ?? 0) : 0;
};

// the shared pump in the spillover valve position
const spillover = (a: Attach, bodyId: number) => {
  const shown = startWindow(a, bodyId);
  return {
    // a speed, 0 for off
    send: async (percent: number, offAfter?: number) => {
      const starting = percent > 0 && speedOf(a, bodyId) === 0;
      const priming = percent > 0 && deviceOf(a, bodyId, "filter").speed === 0;
      await a.session
        .write(() => {
          if (a.session.pumpsSettling()) {
            throw new Error("a pump is priming");
          }
          return a.session.omni.command("SetUISpilloverCmd", {
            poolId: bodyId,
            data: percent,
            ...(percent > 0 && offAfter !== undefined
              ? countdownParams(offAfter)
              : timerParams()),
          });
        })
        .catch((e: unknown) => failed(a, e));
      if (starting) {
        shown.started(priming);
      } else if (percent === 0) {
        shown.stopped();
      }
      if (priming && shown.primingSeconds > 0) {
        a.session.lockPumps(shown.primingSeconds);
      }
    },
    isOn: (current: number) => shown.isOn(current > 0),
  };
};

export const attachSpilloverFan = (
  a: Attach,
  opts: { bodyId: number; speedMode: "presets" | "percent"; offAfter?: number },
): Handle => {
  const { Characteristic } = a.hap;
  const { range, presets } = speeds(a, opts.bodyId);
  const pump = spillover(a, opts.bodyId);
  const on = a.service.getCharacteristic(Characteristic.On);
  const speed = a.service.getCharacteristic(Characteristic.RotationSpeed);
  speed.setProps({ minValue: range.min, maxValue: range.max, minStep: 1 });

  const wanted = (percent: number) =>
    fitSpeed(opts.speedMode, percent, presets, range);

  const run = async (percent: number) => {
    await pump.send(percent, opts.offAfter);
    on.updateValue(percent > 0);
    if (percent > 0) {
      defer(speed, percent);
    }
    sent(
      a,
      percent > 0 ? `on at ${percent}%${forMinutes(opts.offAfter)}` : "off",
    );
  };

  const queue = coalesce((p) =>
    run(
      p.on === false
        ? 0
        : (p.percent ??
            (speedOf(a, opts.bodyId) ||
              lastOrLow(a, opts.bodyId, presets.low, wanted))),
    ),
  );
  on.onSet((value) => queue({ on: value === true }));
  speed.onSet((value) => queue({ percent: wanted(Number(value)) }));

  return {
    update: () => {
      const current = speedOf(a, opts.bodyId);
      on.updateValue(pump.isOn(current));
      if (current > 0) {
        speed.updateValue(clampToRange(current, range));
      }
    },
  };
};

export const attachSpilloverSwitch = (
  a: Attach,
  opts: {
    bodyId: number;
    onSpeed?: string;
    onPercent?: number;
    offAfter?: number;
  },
): Handle => {
  const on = a.service.getCharacteristic(a.hap.Characteristic.On);
  const { range, presets } = speeds(a, opts.bodyId);
  const pump = spillover(a, opts.bodyId);
  const chosen = startSpeed(opts.onSpeed, opts.onPercent, presets);

  on.onSet(async (value) => {
    const percent =
      value === true
        ? clampToRange(chosen ?? lastOrLow(a, opts.bodyId, presets.low), range)
        : 0;
    await pump.send(percent, opts.offAfter);
    on.updateValue(percent > 0);
    sent(
      a,
      percent > 0 ? `on at ${percent}%${forMinutes(opts.offAfter)}` : "off",
    );
  });

  return { update: () => on.updateValue(pump.isOn(speedOf(a, opts.bodyId))) };
};
