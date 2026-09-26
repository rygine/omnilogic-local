// the firmware keeps 13 bytes of a name (UTF-8 bytes, not characters)
export const NAME_MAX_BYTES = 13;

// and 12 of a theme's
export const THEME_NAME_MAX = 12;

export const utf8Bytes = (s: string): number =>
  new TextEncoder().encode(s).length;
