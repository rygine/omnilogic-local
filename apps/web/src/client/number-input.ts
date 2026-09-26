// Mantine's NumberInput reports an empty or unparsable field as a string
export const inputNumber = (v: number | string, fallback = NaN): number =>
  typeof v === "number" ? v : fallback;
