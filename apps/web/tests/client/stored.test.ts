import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { createStoredValue } from "@/client/stored";

let n = 0;
const freshKey = () => `test.stored.${String(++n)}`;

const numberStore = (key: string, fallback = 0) =>
  createStoredValue<number>({
    key,
    fallback,
    parse: (raw) => {
      const v = Number(raw);
      return Number.isFinite(v) ? Math.min(v, 100) : undefined;
    },
    serialize: String,
  });

describe("createStoredValue", () => {
  it("falls back when nothing is stored", () => {
    expect(numberStore(freshKey(), 7).get()).toBe(7);
  });

  it("persists a set value to localStorage and reads it back", () => {
    const key = freshKey();
    const store = numberStore(key);
    store.set(3);
    expect(store.get()).toBe(3);
    expect(window.localStorage.getItem(key)).toBe("3");
  });

  it("reads a value stored before it was created", () => {
    const key = freshKey();
    window.localStorage.setItem(key, "42");
    expect(numberStore(key).get()).toBe(42);
  });

  it("falls back when parse refuses the stored text", () => {
    const key = freshKey();
    window.localStorage.setItem(key, "enormous");
    expect(numberStore(key, 1).get()).toBe(1);
  });

  it("falls back when parse throws", () => {
    const key = freshKey();
    window.localStorage.setItem(key, "{not json");
    const store = createStoredValue<{ v: number }>({
      key,
      fallback: { v: 0 },
      parse: (raw) => JSON.parse(raw),
      serialize: JSON.stringify,
    });
    expect(store.get()).toEqual({ v: 0 });
  });

  it("reads the value back as parse normalizes it, not as it was set", () => {
    const store = numberStore(freshKey());
    store.set(500);
    expect(store.get()).toBe(100);
  });
});

describe("the hook", () => {
  it("re-renders subscribers on set", () => {
    const store = numberStore(freshKey(), 1);
    const { result } = renderHook(() => store.use());
    expect(result.current).toBe(1);
    act(() => store.set(9));
    expect(result.current).toBe(9);
  });

  it("keeps the snapshot reference stable across renders", () => {
    const store = createStoredValue<{ v: number }>({
      key: freshKey(),
      fallback: { v: 0 },
      parse: (raw) => JSON.parse(raw),
      serialize: JSON.stringify,
    });
    store.set({ v: 5 });
    const { result, rerender } = renderHook(() => store.use());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
