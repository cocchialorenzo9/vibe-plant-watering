import type { PlantSchedule, SeasonalInterval } from "../domain/types";
import { parseIso } from "./date";

export function statusTone(s: PlantSchedule): "water" | "warn" | "sage" {
  if (s.status === "overdue") return "warn";
  if (s.status === "due") return "water";
  return "sage";
}

/** "Needs water today" / "2 days overdue" / "Due in 5 days" */
export function statusText(s: PlantSchedule): string {
  const d = s.daysUntilDue;
  if (d === 0) return "Needs water today";
  if (d < 0) {
    const n = Math.abs(d);
    return `${n} day${n === 1 ? "" : "s"} overdue`;
  }
  return `Due in ${d} day${d === 1 ? "" : "s"}`;
}

/** Compact countdown for the dashboard chips: "today", "in 5d", "3d ago" */
export function countdownText(s: PlantSchedule): string {
  const d = s.daysUntilDue;
  if (d === 0) return "today";
  if (d < 0) return `${Math.abs(d)}d ago`;
  return `in ${d}d`;
}

export function intervalText(interval: SeasonalInterval): string {
  if (interval.summer === interval.winter) {
    return `Every ${interval.summer} days`;
  }
  return `Every ${interval.summer}–${interval.winter} days`;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function shortDate(iso: string): string {
  const d = parseIso(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export function weekdayLongDate(iso: string): string {
  const d = parseIso(iso);
  return `${DAYS[d.getUTCDay()]}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export function relativeDay(iso: string, today: string): string {
  const a = parseIso(iso).getTime();
  const b = parseIso(today).getTime();
  const days = Math.round((b - a) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.round(days / 7);
  if (days < 30) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  const months = Math.round(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}
