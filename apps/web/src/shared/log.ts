// an error's message, anything else as text
export const messageOf = (value: unknown): string =>
  value instanceof Error ? value.message : String(value);
