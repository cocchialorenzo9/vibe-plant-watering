import type { IsoDate } from "../domain/types";

/** Parse an ISO date ("YYYY-MM-DD") as a UTC calendar day. */
export function parseIso(date: IsoDate): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toIso(date: Date): IsoDate {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const d = parseIso(date);
  d.setUTCDate(d.getUTCDate() + days);
  return toIso(d);
}

/** Whole days from `a` to `b` (b - a). Positive when b is later. */
export function diffDays(a: IsoDate, b: IsoDate): number {
  const ms = parseIso(b).getTime() - parseIso(a).getTime();
  return Math.round(ms / 86_400_000);
}

/** Today's calendar date in the Europe/Berlin timezone. */
export function todayInBerlin(now: Date = new Date()): IsoDate {
  // en-CA gives YYYY-MM-DD; the timeZone option handles CET/CEST + DST.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
  }).format(now);
}
