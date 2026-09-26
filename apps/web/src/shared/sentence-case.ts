// VOODOO_LOUNGE → "Voodoo Lounge"
export const sentenceCase = (name: string): string =>
  name
    .split("_")
    .map((word) =>
      word.length === 0 ? "" : word.charAt(0) + word.slice(1).toLowerCase(),
    )
    .join(" ");
