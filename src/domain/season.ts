import type { IsoDate, SeasonalInterval } from "./types";
import { parseIso } from "../lib/date.ts";

/**
 * Northern-hemisphere growing season, fixed by calendar month and not
 * configurable: March 1 – October 31 inclusive. See CONTEXT.md.
 */
export function isGrowingSeason(date: IsoDate): boolean {
  const month = parseIso(date).getUTCMonth() + 1; // 1-12
  return month >= 3 && month <= 10;
}

/** The watering interval (in days) in effect for a given date. */
export function intervalForDate(
  interval: SeasonalInterval,
  date: IsoDate,
): number {
  return isGrowingSeason(date) ? interval.summer : interval.winter;
}
