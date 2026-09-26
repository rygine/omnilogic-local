import type { LightShowInfo } from "@rygine/omnilogic-local-sdk";

export type HsColor = { hue: number; saturation: number };

// one color per solid show, none for an animated one
const SHOW_COLORS: Record<string, HsColor> = {
  DEEP_BLUE_SEA: { hue: 240, saturation: 100 },
  ROYAL_BLUE: { hue: 225, saturation: 100 },
  AFTERNOON_SKY: { hue: 200, saturation: 60 },
  AQUA_GREEN: { hue: 160, saturation: 100 },
  EMERALD: { hue: 140, saturation: 100 },
  CLOUD_WHITE: { hue: 0, saturation: 0 },
  WARM_RED: { hue: 0, saturation: 100 },
  FLAMINGO: { hue: 340, saturation: 60 },
  VIVID_VIOLET: { hue: 280, saturation: 100 },
  SANGRIA: { hue: 350, saturation: 80 },
  YELLOW: { hue: 60, saturation: 100 },
  ORANGE: { hue: 30, saturation: 100 },
  GOLD: { hue: 45, saturation: 90 },
  MINT: { hue: 150, saturation: 40 },
  TEAL: { hue: 180, saturation: 100 },
  BURNT_ORANGE: { hue: 20, saturation: 100 },
  PURE_WHITE: { hue: 0, saturation: 8 },
  CRISP_WHITE: { hue: 210, saturation: 5 },
  WARM_WHITE: { hue: 40, saturation: 15 },
  BRIGHT_YELLOW: { hue: 55, saturation: 100 },
  // Pentair Color LED (P-COLOR) solids
  ROYAL: { hue: 225, saturation: 100 },
  BLUE: { hue: 240, saturation: 100 },
  GREEN: { hue: 120, saturation: 100 },
  RED: { hue: 0, saturation: 100 },
  WHITE: { hue: 0, saturation: 0 },
  MAGENTA: { hue: 300, saturation: 100 },
  // Jandy Color LED (Z-Color) solids
  ALPINE_WHITE: { hue: 0, saturation: 0 },
  SKY_BLUE: { hue: 200, saturation: 60 },
  COBALT_BLUE: { hue: 230, saturation: 100 },
  CARIBBEAN_BLUE: { hue: 190, saturation: 80 },
  SPRING_GREEN: { hue: 110, saturation: 70 },
  EMERALD_GREEN: { hue: 140, saturation: 100 },
  EMERALD_ROSE: { hue: 330, saturation: 50 },
  VIOLET: { hue: 270, saturation: 100 },
};

const hueDistance = (a: number, b: number): number => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

// a saturation under 20 counts as white
const distance = (a: HsColor, b: HsColor): number =>
  a.saturation < 20 || b.saturation < 20
    ? Math.abs(a.saturation - b.saturation) * 2
    : hueDistance(a.hue, b.hue) + Math.abs(a.saturation - b.saturation) / 4;

export const showForColor = (
  color: HsColor,
  shows: LightShowInfo[],
): number | undefined => {
  let best: { value: number; d: number } | undefined;
  for (const show of shows) {
    const c = SHOW_COLORS[show.name];
    if (c === undefined) {
      continue;
    }
    const d = distance(color, c);
    if (best === undefined || d < best.d) {
      best = { value: show.value, d };
    }
  }
  return best?.value;
};

export const colorForShow = (name: string): HsColor | undefined =>
  SHOW_COLORS[name];
