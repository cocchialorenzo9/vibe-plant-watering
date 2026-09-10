import { describe, it, expect } from "vitest";
import { isGrowingSeason, intervalForDate } from "./season";
import type { SeasonalInterval } from "./types";

const interval: SeasonalInterval = { summer: 7, winter: 14 };

describe("isGrowingSeason", () => {
  it("treats March 1 through October 31 as growing season", () => {
    expect(isGrowingSeason("2026-03-01")).toBe(true);
    expect(isGrowingSeason("2026-06-15")).toBe(true);
    expect(isGrowingSeason("2026-10-31")).toBe(true);
  });

  it("treats November through February as dormant", () => {
    expect(isGrowingSeason("2026-11-01")).toBe(false);
    expect(isGrowingSeason("2026-12-25")).toBe(false);
    expect(isGrowingSeason("2027-01-10")).toBe(false);
    expect(isGrowingSeason("2028-02-29")).toBe(false);
  });
});

describe("intervalForDate", () => {
  it("uses the summer value during the growing season", () => {
    expect(intervalForDate(interval, "2026-07-01")).toBe(7);
  });

  it("uses the winter value during dormancy", () => {
    expect(intervalForDate(interval, "2026-01-01")).toBe(14);
  });
});
