export const numberOf = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;

export const stringOf = (v: unknown) =>
  typeof v === "string" && v !== "" ? v : undefined;

export const defined = <T extends object>(obj: T) => {
  const out: Partial<T> = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      out[key] = obj[key];
    }
  }
  return out;
};

export const matches = <E extends object>(
  actual: { [K in keyof E]?: unknown } | undefined,
  expected: E,
) => {
  if (actual === undefined) {
    return false;
  }
  for (const key in expected) {
    if (actual[key] !== expected[key]) {
      return false;
    }
  }
  return true;
};

export const isRecord = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

export const findBySystemId = (
  parent: unknown,
  systemId: number,
): Record<string, unknown> | undefined => {
  if (!isRecord(parent)) {
    return undefined;
  }
  for (const value of Object.values(parent)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (!isRecord(item)) {
        continue;
      }
      if (Number(item.systemId) === systemId) {
        return item;
      }
      const found = findBySystemId(item, systemId);
      if (found !== undefined) {
        return found;
      }
    }
  }
  return undefined;
};
