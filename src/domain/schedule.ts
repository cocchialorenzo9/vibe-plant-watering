import type {
  IsoDate,
  Plant,
  PlantOverride,
  PlantSchedule,
  SeasonalInterval,
  WateringEvent,
  WaterStatus,
} from "./types";
import { addDays, diffDays } from "../lib/date.ts";
import { intervalForDate } from "./season.ts";

export function effectiveInterval(
  plant: Plant,
  override: PlantOverride | undefined,
): SeasonalInterval {
  return override?.intervalOverride ?? plant.care.waterIntervalDays;
}

function plantEvents(events: WateringEvent[], plantId: string): WateringEvent[] {
  return events
    .filter((e) => e.plantId === plantId)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function lastWateredDate(
  events: WateringEvent[],
  plantId: string,
): IsoDate | null {
  const mine = plantEvents(events, plantId);
  return mine.length ? mine[mine.length - 1].date : null;
}

export function wateredOn(
  events: WateringEvent[],
  plantId: string,
  date: IsoDate,
): boolean {
  return events.some((e) => e.plantId === plantId && e.date === date);
}

export function nextDueDate(
  plant: Plant,
  override: PlantOverride | undefined,
  events: WateringEvent[],
  _today: IsoDate,
): IsoDate {
  const interval = effectiveInterval(plant, override);
  const last = lastWateredDate(events, plant.id);
  const anchor = last ?? plant.addedOn;

  const pinned = override?.nextDueAnchor ?? null;
  const anchorSuperseded = pinned != null && last != null && last >= pinned;

  if (pinned != null && !anchorSuperseded) {
    return pinned;
  }
  return addDays(anchor, intervalForDate(interval, anchor));
}

/** The date "Skip next" should pin the next watering to. */
export function skippedNextDate(
  plant: Plant,
  override: PlantOverride | undefined,
  events: WateringEvent[],
  today: IsoDate,
): IsoDate {
  const interval = effectiveInterval(plant, override);
  const due = nextDueDate(plant, override, events, today);
  return addDays(due, intervalForDate(interval, due));
}

export function waterStatus(nextDue: IsoDate, today: IsoDate): WaterStatus {
  const delta = diffDays(today, nextDue);
  if (delta < 0) return "overdue";
  if (delta === 0) return "due";
  return "upcoming";
}

export function computeSchedule(
  plant: Plant,
  override: PlantOverride | undefined,
  events: WateringEvent[],
  today: IsoDate,
): PlantSchedule {
  const nextDue = nextDueDate(plant, override, events, today);
  return {
    plantId: plant.id,
    lastWatered: lastWateredDate(events, plant.id),
    nextDue,
    status: waterStatus(nextDue, today),
    daysUntilDue: diffDays(today, nextDue),
    currentIntervalDays: intervalForDate(
      effectiveInterval(plant, override),
      today,
    ),
  };
}

/**
 * Project the next `count` watering dates, starting with the current due
 * date and re-evaluating the season at each step.
 */
export function forwardSchedule(
  plant: Plant,
  override: PlantOverride | undefined,
  events: WateringEvent[],
  today: IsoDate,
  count: number,
): IsoDate[] {
  const interval = effectiveInterval(plant, override);
  const out: IsoDate[] = [];
  let cursor = nextDueDate(plant, override, events, today);
  for (let i = 0; i < count; i++) {
    out.push(cursor);
    cursor = addDays(cursor, intervalForDate(interval, cursor));
  }
  return out;
}
