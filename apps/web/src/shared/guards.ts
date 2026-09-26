export const isOneOf =
  <T>(values: T[]) =>
  (v: unknown): v is T =>
    values.some((x) => x === v);

export const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === "string");
