import { useSyncExternalStore } from "react";

// a value kept in localStorage, shared with other tabs
export type StoredValue<T> = {
  get: () => T;
  set: (next: T) => void;
  use: () => T;
};

export const createStoredValue = <T>({
  key,
  fallback,
  parse,
  serialize,
}: {
  key: string;
  fallback: T;
  // the stored text as a value, or undefined when it is not one
  parse: (raw: string) => T | undefined;
  serialize: (value: T) => string;
}): StoredValue<T> => {
  let cached: { value: T } | undefined;
  const listeners = new Set<() => void>();

  const read = (): T => {
    if (typeof window === "undefined") {
      return fallback;
    }
    const raw = window.localStorage.getItem(key);
    if (raw === null) {
      return fallback;
    }
    try {
      return parse(raw) ?? fallback;
    } catch {
      return fallback;
    }
  };
  const snapshot = (): T => {
    cached ??= { value: read() };
    return cached.value;
  };
  const invalidate = (): void => {
    cached = undefined;
  };
  const subscribe = (cb: () => void): (() => void) => {
    listeners.add(cb);
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) {
        invalidate();
        cb();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(cb);
      window.removeEventListener("storage", onStorage);
    };
  };
  const useValue = (): T =>
    useSyncExternalStore(subscribe, snapshot, () => fallback);

  return {
    get: snapshot,
    set: (next) => {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, serialize(next));
      }
      invalidate();
      for (const l of listeners) {
        l();
      }
    },
    use: useValue,
  };
};
