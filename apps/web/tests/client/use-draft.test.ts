import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useDraft } from "@/client/use-draft";

type Value = { a: number; b: boolean };

describe("useDraft", () => {
  it("draft mirrors current until something is set", () => {
    const { result } = renderHook(
      ({ current }: { current: Value }) => useDraft(current),
      { initialProps: { current: { a: 1, b: false } } },
    );
    expect(result.current.draft).toEqual({ a: 1, b: false });
    expect(result.current.dirty).toBe(false);
  });

  it("set marks dirty; setting back to the current value clears it", () => {
    const { result } = renderHook(() => useDraft<Value>({ a: 1, b: false }));
    act(() => result.current.set("a", 2));
    expect(result.current.draft).toEqual({ a: 2, b: false });
    expect(result.current.dirty).toBe(true);
    act(() => result.current.set("a", 1));
    expect(result.current.draft).toEqual({ a: 1, b: false });
    expect(result.current.dirty).toBe(false);
  });

  it("reset clears every edit and dirty goes false", () => {
    const { result } = renderHook(() => useDraft<Value>({ a: 1, b: false }));
    act(() => result.current.set("a", 2));
    act(() => result.current.set("b", true));
    expect(result.current.dirty).toBe(true);
    act(() => result.current.reset());
    expect(result.current.draft).toEqual({ a: 1, b: false });
    expect(result.current.dirty).toBe(false);
  });

  it("a new current flows through for keys the user never touched", () => {
    const { result, rerender } = renderHook(
      ({ current }: { current: Value }) => useDraft(current),
      { initialProps: { current: { a: 1, b: false } } },
    );
    act(() => result.current.set("a", 5));
    // the controller's own value for b changes, a stays the local edit
    act(() => rerender({ current: { a: 1, b: true } }));
    expect(result.current.draft).toEqual({ a: 5, b: true });
    expect(result.current.dirty).toBe(true);
  });
});
