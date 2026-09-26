// the Universal ColorLogic (UCL) show table: base 0–16, V2 tail 17–27
export const ColorLogicShow = {
  VOODOO_LOUNGE: 0,
  DEEP_BLUE_SEA: 1,
  ROYAL_BLUE: 2,
  AFTERNOON_SKY: 3,
  AQUA_GREEN: 4,
  EMERALD: 5,
  CLOUD_WHITE: 6,
  WARM_RED: 7,
  FLAMINGO: 8,
  VIVID_VIOLET: 9,
  SANGRIA: 10,
  TWILIGHT: 11,
  TRANQUILITY: 12,
  GEMSTONE: 13,
  USA: 14,
  MARDI_GRAS: 15,
  COOL_CABARET: 16,
  YELLOW: 17,
  ORANGE: 18,
  GOLD: 19,
  MINT: 20,
  TEAL: 21,
  BURNT_ORANGE: 22,
  PURE_WHITE: 23,
  CRISP_WHITE: 24,
  WARM_WHITE: 25,
  BRIGHT_YELLOW: 26,
  WATERFIRE: 27,
} as const;

export const ColorLogicPowerState = {
  OFF: 0,
  POWERING_OFF: 1,
  RESETTING: 2,
  CHANGING_SHOW: 3,
  FIFTEEN_SECONDS_WHITE: 4,
  ACTIVE: 6,
  COOLDOWN: 7,
} as const;

export const powerStateName = (code: number | undefined) =>
  Object.entries(ColorLogicPowerState).find(([, v]) => v === code)?.[0] ??
  `#${String(code)}`;

// lit or warming up, with on its way off counting as off
export const isLightLit = (state: number) =>
  state === ColorLogicPowerState.CHANGING_SHOW ||
  state === ColorLogicPowerState.FIFTEEN_SECONDS_WHITE ||
  state === ColorLogicPowerState.ACTIVE;

type ShowEntry = [number, string];

// ColorLogic 2.5 and ColorLogic 4.0
const SHOWS_25_40: ShowEntry[] = [
  [0, "VOODOO_LOUNGE"],
  [1, "DEEP_BLUE_SEA"],
  [2, "AFTERNOON_SKY"],
  [3, "EMERALD"],
  [4, "SANGRIA"],
  [5, "CLOUD_WHITE"],
  [6, "TWILIGHT"],
  [7, "TRANQUILITY"],
  [8, "GEMSTONE"],
  [9, "USA"],
  [10, "MARDI_GRAS"],
  [11, "COOL_CABARET"],
];

const SHOWS_UCL_V2: ShowEntry[] = Object.entries(ColorLogicShow).map(
  ([name, value]) => [value, name],
);
const SHOWS_UCL: ShowEntry[] = SHOWS_UCL_V2.filter(([value]) => value <= 16);

// Pentair Color LED (P-COLOR)
const SHOWS_PENTAIR: ShowEntry[] = [
  [0, "SAM"],
  [1, "PARTY"],
  [2, "ROMANCE"],
  [3, "CARIBBEAN"],
  [4, "AMERICAN"],
  [5, "CALIFORNIA_SUNSET"],
  [6, "ROYAL"],
  [7, "BLUE"],
  [8, "GREEN"],
  [9, "RED"],
  [10, "WHITE"],
  [11, "MAGENTA"],
];

// Jandy Color LED (Z-Color)
const SHOWS_ZODIAC: ShowEntry[] = [
  [0, "ALPINE_WHITE"],
  [1, "SKY_BLUE"],
  [2, "COBALT_BLUE"],
  [3, "CARIBBEAN_BLUE"],
  [4, "SPRING_GREEN"],
  [5, "EMERALD_GREEN"],
  [6, "EMERALD_ROSE"],
  [7, "MAGENTA"],
  [8, "VIOLET"],
  [9, "SLOW_COLOR_SPLASH"],
  [10, "FAST_COLOR_SPLASH"],
  [11, "AMERICA_THE_BEAUTIFUL"],
  [12, "FAT_TUESDAY"],
  [13, "DISCO_TECH"],
];

export type LightShowInfo = {
  value: number;
  name: string;
};

export const getAvailableShows = (
  lightType: string,
  v2Active: boolean = false,
) => {
  let entries: ShowEntry[];
  switch (lightType) {
    case "COLOR_LOGIC_2_5":
    case "COLOR_LOGIC_4_0":
      entries = SHOWS_25_40;
      break;
    case "COLOR_LOGIC_UCL":
    case "COLOR_LOGIC_SAM":
      entries = v2Active ? SHOWS_UCL_V2 : SHOWS_UCL;
      break;
    case "CL_P_COLOR":
      entries = SHOWS_PENTAIR;
      break;
    case "CL_Z_COLOR":
      entries = SHOWS_ZODIAC;
      break;
    default:
      entries = SHOWS_UCL;
      break;
  }
  return entries.map(([value, name]) => ({ value, name }));
};
