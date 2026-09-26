// a swatch per ColorLogic show, by SDK name: a solid color, or a gradient for a pattern
type LightSwatch = { fixed: boolean; css: string };

const SWATCHES: Record<string, LightSwatch> = {
  DEEP_BLUE_SEA: { fixed: true, css: "#2740a8" },
  ROYAL_BLUE: { fixed: true, css: "#2f6fe0" },
  AFTERNOON_SKY: { fixed: true, css: "#12bff0" },
  AQUA_GREEN: { fixed: true, css: "#17b890" },
  EMERALD: { fixed: true, css: "#22b52e" },
  CLOUD_WHITE: { fixed: true, css: "#d4ecf7" },
  WARM_RED: { fixed: true, css: "#f4491b" },
  FLAMINGO: { fixed: true, css: "#ec1a63" },
  VIVID_VIOLET: { fixed: true, css: "#ec0f8c" },
  SANGRIA: { fixed: true, css: "#9c2b96" },
  YELLOW: { fixed: true, css: "#ffd21e" },
  ORANGE: { fixed: true, css: "#ff8c1a" },
  GOLD: { fixed: true, css: "#f0b429" },
  MINT: { fixed: true, css: "#3fe0a0" },
  TEAL: { fixed: true, css: "#12b5b0" },
  BURNT_ORANGE: { fixed: true, css: "#c1440e" },
  PURE_WHITE: { fixed: true, css: "#ffffff" },
  CRISP_WHITE: { fixed: true, css: "#eaf2ff" },
  WARM_WHITE: { fixed: true, css: "#fff4e0" },
  BRIGHT_YELLOW: { fixed: true, css: "#fff200" },

  // pattern bands in the fixed colors plus a yellow, across the part of the gradient a circle shows
  VOODOO_LOUNGE: {
    fixed: false,
    css: "linear-gradient(135deg,#ffe000 0% 20.6%,#22b52e 23.4% 27.6%,#12bff0 30.4% 34.6%,#2740a8 37.4% 41.6%,#ec0f8c 44.4% 48.6%,#ffe000 51.4% 55.6%,#22b52e 58.4% 62.6%,#12bff0 65.4% 69.6%,#2740a8 72.4% 76.6%,#ec0f8c 79.4% 100%)",
  },
  TWILIGHT: {
    fixed: false,
    css: "linear-gradient(135deg,#f4491b 0% 23.6%,#ffe000 27.9% 34.4%,#22b52e 39.8% 49.5%,#12bff0 54.8% 61.3%,#2740a8 65.6% 72.1%,#ec0f8c 76.4% 100%)",
  },
  TRANQUILITY: {
    fixed: false,
    css: "linear-gradient(135deg,#1e3bff 8%,#00b4ff 42%,#5fe6ff 70%,#ffffff 95%)",
  },
  GEMSTONE: {
    fixed: false,
    css: "linear-gradient(135deg,#2b5cff 0% 26.7%,#16d13c 40% 60%,#ff10a8 73.3% 100%)",
  },
  USA: {
    fixed: false,
    css: "linear-gradient(135deg,#ff2020 0% 26.7%,#ffffff 40% 60%,#2b5cff 73.3% 100%)",
  },
  MARDI_GRAS: {
    fixed: false,
    css: "linear-gradient(135deg,#ffe000 0% 26.2%,#ec0f8c 31.8% 40.2%,#2740a8 45.8% 54.2%,#22b52e 59.8% 68.2%,#9c2b96 73.8% 100%)",
  },
  COOL_CABARET: {
    fixed: false,
    css: "linear-gradient(135deg,#f4491b 0% 23.6%,#ffe000 29% 38.7%,#22b52e 44.1% 50.5%,#12bff0 54.8% 61.3%,#2740a8 65.6% 72.1%,#ec0f8c 76.4% 100%)",
  },
  WATERFIRE: {
    fixed: false,
    css: "linear-gradient(135deg,#2b5cff 0% 20%,#00d4ff 30% 45%,#ff7a00 55% 70%,#ff2020 80% 100%)",
  },
};

export const lightSwatch = (name: string): LightSwatch =>
  SWATCHES[name] ?? { fixed: true, css: "var(--mantine-color-gray-5)" };
