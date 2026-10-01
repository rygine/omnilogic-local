import type { pumpSpeedType } from "@rygine/omnilogic-local-sdk";

export const numberOf = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;

export const stringOf = (v: unknown): string | undefined =>
  typeof v === "string" && v !== "" ? v : undefined;

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export type Presets = { low: number; medium?: number; high: number };

export type SpeedType = ReturnType<typeof pumpSpeedType>;

const DUAL_SPEEDS: Presets = { low: 50, high: 100 };

// the presets a pump's slider and switch offer: its own, or a dual-speed pump's two speeds
export const presetsFor = (
  speedType: SpeedType,
  configured: Presets | undefined,
): Presets | undefined =>
  speedType === "dual"
    ? DUAL_SPEEDS
    : speedType === "variable"
      ? configured
      : undefined;

// the speed a pump starts at when it has no last speed
export const defaultSpeedFor = (
  speedType: SpeedType,
  presets: Presets | undefined,
  max: number,
): number => (speedType === "variable" ? presets?.low : presets?.high) ?? max;
export type Range = { min: number; max: number };

// the nearest preset
export const snapToPreset = (percent: number, presets: Presets): number =>
  [presets.low, presets.medium, presets.high]
    .filter((p) => p !== undefined)
    .reduce((best, p) =>
      Math.abs(p - percent) < Math.abs(best - percent) ? p : best,
    );

export const clampToRange = (percent: number, range: Range): number =>
  Math.min(Math.max(percent, range.min), range.max);

// the speed a switch starts a pump at, or undefined to use the pump's last speed
export const startSpeed = (
  onSpeed: string | undefined,
  onPercent: number | undefined,
  p: Presets | undefined,
): number | undefined =>
  onSpeed === "custom"
    ? onPercent
    : onSpeed === "low" || onSpeed === "medium" || onSpeed === "high"
      ? p?.[onSpeed]
      : undefined;

// the controller reports °F whatever its units setting, HomeKit carries Celsius
export const toCelsius = (fahrenheit: number): number =>
  ((fahrenheit - 32) * 5) / 9;

// the controller takes whole degrees
export const fromCelsius = (celsius: number): number =>
  Math.round((celsius * 9) / 5 + 32);
