export type Range = { min: number; max: number };

// a pump's low, medium, and high preset speeds, in percent
export type SpeedPresets = { low: number; medium: number; high: number };

// a percent in RPM: its share of the pump's maximum, to the nearest 10
export const percentToRpm = (percent: number, rpmRange: Range): number =>
  Math.round((percent * rpmRange.max) / 1000) * 10;

// rpm when the pump's range is known, else the raw percent
export const formatSpeed = (percent: number, rpmRange: Range | null): string =>
  rpmRange ? `${percentToRpm(percent, rpmRange)} RPM` : `${percent}%`;

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
