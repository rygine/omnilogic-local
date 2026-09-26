import type { QueryKey } from "@tanstack/react-query";

// the pending follow-ups of each countdown, by key
const pending = new Map<string, ReturnType<typeof setTimeout>[]>();

export const clearCountdownTimers = (key: QueryKey): void => {
  const id = JSON.stringify(key);
  for (const timer of pending.get(id) ?? []) {
    clearTimeout(timer);
  }
  pending.delete(id);
};

export const scheduleCountdownTimers = (
  key: QueryKey,
  steps: { at: number; run: () => void }[],
): void => {
  clearCountdownTimers(key);
  pending.set(
    JSON.stringify(key),
    steps.map((step) => setTimeout(step.run, step.at)),
  );
};
