import { describe, expect, it } from "vitest";

import { formatAgo, formatCountdown } from "@/client/tick";

describe("formatAgo", () => {
  it("says how stale a reading is, coarsely", () => {
    expect(formatAgo(0)).toBe("just now");
    expect(formatAgo(4_900)).toBe("just now");
    expect(formatAgo(5_000)).toBe("5 seconds ago");
    expect(formatAgo(59_999)).toBe("59 seconds ago");
    expect(formatAgo(60_000)).toBe("1 minute ago");
    expect(formatAgo(4 * 60_000 + 30_000)).toBe("4 minutes ago");
    expect(formatAgo(60 * 60_000)).toBe("1 hour ago");
    expect(formatAgo(3 * 60 * 60_000)).toBe("3 hours ago");
    const day = 24 * 60 * 60_000;
    expect(formatAgo(day)).toBe("1 day ago");
    expect(formatAgo(29 * day)).toBe("29 days ago");
    expect(formatAgo(30 * day)).toBe("1 month ago");
    expect(formatAgo(300 * day)).toBe("10 months ago");
    expect(formatAgo(365 * day)).toBe("1 year ago");
    expect(formatAgo(800 * day)).toBe("2 years ago");
    expect(formatAgo(-500)).toBe("just now");
  });
});

describe("formatCountdown", () => {
  it("floors at zero and drops the hour when there is none", () => {
    expect(formatCountdown(-1)).toBe("0:00");
    expect(formatCountdown(65_000)).toBe("1:05");
    expect(formatCountdown(3_600_000)).toBe("1:00:00");
  });
});
