export type Range = { min: number; max: number };

// a pump's low, medium, and high preset speeds, in percent
export type SpeedPresets = { low: number; medium: number; high: number };

// linear interpolation across the aligned percent and rpm operating ranges
export const percentToRpm = (
  percent: number,
  rpmRange: Range,
  speedRange: Range,
): number => {
  const span = speedRange.max - speedRange.min;
  if (span <= 0) {
    return rpmRange.min;
  }
  const clamped = Math.min(Math.max(percent, speedRange.min), speedRange.max);
  const frac = (clamped - speedRange.min) / span;
  return Math.round(rpmRange.min + frac * (rpmRange.max - rpmRange.min));
};

// rpm when the pump's range is known, else the raw percent
export const formatSpeed = (
  percent: number,
  rpmRange: Range | null,
  speedRange: Range,
): string =>
  rpmRange
    ? `${percentToRpm(percent, rpmRange, speedRange)} RPM`
    : `${percent}%`;

// the vsp preset names, in preset order, mirrors the SDK's SPEED_PRESET
export const SPEED_PRESET_LABELS = ["Low", "Medium", "High"] as const;

// the preset a speed equals exactly, or null
export const presetOf = (
  percent: number,
  presets: SpeedPresets | null,
): string | null =>
  presets === null
    ? null
    : (SPEED_PRESET_LABELS[
        [presets.low, presets.medium, presets.high].indexOf(percent)
      ] ?? null);
