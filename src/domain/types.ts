/** A calendar date with no time component, ISO "YYYY-MM-DD". */
export type IsoDate = string;

export interface SeasonalInterval {
  /** Days between waterings during the growing season (Mar 1 – Oct 31). */
  summer: number;
  /** Days between waterings during dormancy (Nov 1 – Feb 28/29). */
  winter: number;
}

export interface PlantSource {
  title: string;
  url: string;
}

export interface Species {
  scientificName: string;
  commonNames: string[];
  /** The plant's common name in Italian. */
  italianName: string;
  shortDescription: string;
  origin: string;
  curiosities: string[];
  toxicity: string;
  sources: PlantSource[];
}

export interface PlantCare {
  waterIntervalDays: SeasonalInterval;
  light: string;
  idealTempC: [number, number];
}

/** Authored, immutable plant record committed to the public repo. */
export interface Plant {
  id: string;
  nickname: string;
  location?: string;
  species: Species;
  care: PlantCare;
  avatar: string;
  addedOn: IsoDate;
}

/** A recorded actual watering. Lives in the private data repo. */
export interface WateringEvent {
  plantId: string;
  date: IsoDate;
  loggedAt: string; // ISO timestamp, also the idempotency tiebreaker
}

/** Per-plant schedule adjustments. Lives in the private data repo. */
export interface PlantOverride {
  intervalOverride?: SeasonalInterval;
  /**
   * Pin the next watering to this date; automatically ignored once a later
   * WateringEvent exists. "Skip next" is expressed by setting this to the
   * skipped-forward date, so it expires the same way.
   */
  nextDueAnchor?: IsoDate | null;
}

export interface HouseholdSettings {
  /** Whether the 7pm evening reminder email is sent. Default true. */
  reminderEnabled: boolean;
  /** ISO date the reminder job last emailed; its once-per-day guard. */
  lastRemindedOn?: IsoDate;
}

export interface WateringData {
  events: WateringEvent[];
  overrides: Record<string, PlantOverride>;
  /** Shared household settings that the reminder job needs to see. */
  settings?: HouseholdSettings;
}

export type WaterStatus = "overdue" | "due" | "upcoming";

export interface PlantSchedule {
  plantId: string;
  lastWatered: IsoDate | null;
  nextDue: IsoDate;
  status: WaterStatus;
  /** Whole days until next due; negative when overdue. */
  daysUntilDue: number;
  /** Interval (days) currently in effect for this plant. */
  currentIntervalDays: number;
}
