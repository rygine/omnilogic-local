import { useState } from "react";

const changed = (
  draft: Record<string, boolean | number>,
  current: Record<string, boolean | number>,
): boolean => Object.keys(current).some((k) => draft[k] !== current[k]);

// local edits held over a value that keeps changing
export const useDraft = <T extends Record<string, boolean | number>>(
  current: T,
) => {
  const [edited, setEdited] = useState<Partial<T>>({});
  const draft: T = { ...current, ...edited };
  const set = <K extends keyof T>(k: K, v: T[K]) =>
    setEdited((e) => ({ ...e, [k]: v }));
  const reset = () => setEdited({});
  const dirty = changed(draft, current);
  return { draft, set, reset, dirty };
};
