// app-side bounds for the four durations, priming in whole minutes
type DurationBounds = {
  // inclusive, in seconds
  min: number;
  max: number;
  // the value must be a multiple of this many seconds
  step: number;
};

const DAY = 24 * 60 * 60;

export const DURATION_BOUNDS = {
  primingDuration: { min: 60, max: 10 * 60, step: 60 },
  cooldownDuration: { min: 1, max: DAY, step: 1 },
  sharedFilterTimeout: { min: 1, max: DAY, step: 1 },
  freezeProtectOverrideInterval: { min: 1, max: DAY, step: 1 },
} as const satisfies Record<string, DurationBounds>;

export type BoundedDuration = keyof typeof DURATION_BOUNDS;

export const withinBounds = (
  setting: BoundedDuration,
  seconds: number,
): boolean => {
  const { min, max, step } = DURATION_BOUNDS[setting];
  return (
    Number.isInteger(seconds) &&
    seconds >= min &&
    seconds <= max &&
    seconds % step === 0
  );
};

// why seconds is refused, in the unit the control shows, undefined when accepted
export const durationProblem = (
  setting: BoundedDuration,
  seconds: number,
): string | undefined => {
  if (withinBounds(setting, seconds)) {
    return undefined;
  }
  const { min, max, step } = DURATION_BOUNDS[setting];
  if (!Number.isFinite(seconds)) {
    return "Enter a number";
  }
  if (step === 60) {
    if (!Number.isInteger(seconds / 60)) {
      return "Whole minutes";
    }
    return `Between ${min / 60} and ${max / 60} minutes`;
  }
  if (!Number.isInteger(seconds)) {
    return "Whole seconds";
  }
  return `Between ${min} and ${max} seconds`;
};
