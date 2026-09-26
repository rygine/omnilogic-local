import { useSyncExternalStore } from "react";

import { pad2 } from "@/client/format";

// a once-per-second clock
let now = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

const subscribe = (cb: () => void): (() => void) => {
  listeners.add(cb);
  if (timer === null) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      for (const l of listeners) {
        l();
      }
    }, 1000);
  }
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
};

export const useNow = (): number =>
  useSyncExternalStore(
    subscribe,
    () => now,
    () => now,
  );

// "H:MM:SS", or "M:SS" under an hour, never below zero
export const formatCountdown = (ms: number): string => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${m}:${pad2(s)}`;
};

// a reading's age in words: "just now", then seconds, minutes… years ago
export const formatAgo = (ms: number): string => {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 5) {
    return "just now";
  }
  if (s < 60) {
    return `${s} seconds ago`;
  }
  const m = Math.floor(s / 60);
  if (m < 60) {
    return plural(m, "minute");
  }
  const h = Math.floor(m / 60);
  if (h < 24) {
    return plural(h, "hour");
  }
  const d = Math.floor(h / 24);
  if (d < 30) {
    return plural(d, "day");
  }
  const months = Math.floor(d / 30);
  if (months < 12) {
    return plural(months, "month");
  }
  return plural(Math.floor(d / 365), "year");
};

const plural = (n: number, unit: string): string =>
  n === 1 ? `1 ${unit} ago` : `${n} ${unit}s ago`;
