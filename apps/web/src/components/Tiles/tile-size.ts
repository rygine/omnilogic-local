import type { Tile } from "./Tiles";

// a row for long free text, two columns for a phrase, one tile otherwise
export const tileSizeOf = (value: unknown): Pick<Tile, "wide" | "span"> => {
  if (typeof value !== "string") {
    return {};
  }
  if (value.length > 30) {
    return { wide: true };
  }
  if (value.length > 16) {
    return { span: 2 };
  }
  return {};
};
