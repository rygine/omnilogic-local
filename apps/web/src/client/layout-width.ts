import { createStoredValue } from "@/client/stored";
import { isOneOf } from "@/shared/guards";

// the shell's content width, kept per browser
export const LAYOUT_WIDTH_OPTIONS = [
  { value: "normal", label: "Normal" },
  { value: "wide", label: "Wide" },
  { value: "full", label: "Full" },
] as const;

type LayoutWidth = (typeof LAYOUT_WIDTH_OPTIONS)[number]["value"];

const isWidth = isOneOf(LAYOUT_WIDTH_OPTIONS.map((o) => o.value));

const store = createStoredValue<LayoutWidth>({
  key: "omni.layoutWidth",
  fallback: "normal",
  parse: (raw) => (isWidth(raw) ? raw : undefined),
  serialize: (v) => v,
});

export const setLayoutWidth = store.set;
export const useLayoutWidth = store.use;
