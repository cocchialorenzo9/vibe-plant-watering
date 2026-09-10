import type {
  HouseholdSettings,
  PlantOverride,
  WateringData,
  WateringEvent,
} from "../domain/types";
import {
  get,
  onValue,
  ref,
  remove,
  set,
  update,
  type Database,
} from "firebase/database";
import { getDb, WATERING_PATH } from "./firebase";

const EMPTY: WateringData = { events: [], overrides: {} };

function dedupeEvents(events: WateringEvent[]): WateringEvent[] {
  const seen = new Set<string>();
  const out: WateringEvent[] = [];
  for (const e of [...events].sort((a, b) => a.loggedAt.localeCompare(b.loggedAt))) {
    const key = `${e.plantId}|${e.date}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

function merge(
  base: WateringData,
  addedEvents: WateringEvent[],
  overridePatch?: { plantId: string; override: PlantOverride },
  settingsPatch?: Partial<HouseholdSettings>,
): WateringData {
  const overrides = { ...base.overrides };
  if (overridePatch) {
    overrides[overridePatch.plantId] = overridePatch.override;
  }
  const settings =
    settingsPatch || base.settings
      ? {
          reminderEnabled: true,
          ...base.settings,
          ...settingsPatch,
        }
      : undefined;
  return {
    events: dedupeEvents([...base.events, ...addedEvents]),
    overrides,
    ...(settings ? { settings } : {}),
  };
}

function without(
  base: WateringData,
  plantId: string,
  date: string,
): WateringData {
  return {
    ...base,
    events: base.events.filter(
      (e) => !(e.plantId === plantId && e.date === date),
    ),
  };
}

export interface WateringBackend {
  readonly kind: "local" | "firebase";
  load(signal?: AbortSignal): Promise<WateringData>;
  /**
   * Optional live sync; returns an unsubscribe function. `onError` fires when
   * the live listener itself fails (e.g. the DB rules reject the read) — the
   * one-shot `load()` is otherwise the only error channel.
   */
  subscribe?(
    onData: (data: WateringData) => void,
    onError?: (err: Error) => void,
  ): () => void;
  addEvents(events: WateringEvent[]): Promise<WateringData>;
  removeEvent(plantId: string, date: string): Promise<WateringData>;
  setOverride(plantId: string, override: PlantOverride): Promise<WateringData>;
  setSettings(patch: Partial<HouseholdSettings>): Promise<WateringData>;
}

/* ------------------------------------------------------------------ */
/* Local backend — localStorage, seeded from the bundled example file. */
/* Used for development and demoing when no Firebase key is present.   */
/* ------------------------------------------------------------------ */

const LOCAL_KEY = "pw:watering";

class LocalBackend implements WateringBackend {
  readonly kind = "local" as const;

  private read(): WateringData | null {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      return raw ? (JSON.parse(raw) as WateringData) : null;
    } catch {
      return null;
    }
  }

  private write(data: WateringData): void {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
    } catch {
      /* ignore */
    }
  }

  async load(signal?: AbortSignal): Promise<WateringData> {
    const stored = this.read();
    if (stored) return stored;
    try {
      const res = await fetch(
        `${import.meta.env.BASE_URL}data/watering.example.json`,
        { signal },
      );
      if (res.ok) {
        const seed = (await res.json()) as WateringData;
        this.write(seed);
        return seed;
      }
    } catch {
      /* fall through */
    }
    return EMPTY;
  }

  async addEvents(events: WateringEvent[]): Promise<WateringData> {
    const next = merge((await this.load()) ?? EMPTY, events);
    this.write(next);
    return next;
  }

  async removeEvent(plantId: string, date: string): Promise<WateringData> {
    const next = without((await this.load()) ?? EMPTY, plantId, date);
    this.write(next);
    return next;
  }

  async setOverride(
    plantId: string,
    override: PlantOverride,
  ): Promise<WateringData> {
    const next = merge((await this.load()) ?? EMPTY, [], { plantId, override });
    this.write(next);
    return next;
  }

  async setSettings(
    patch: Partial<HouseholdSettings>,
  ): Promise<WateringData> {
    const next = merge((await this.load()) ?? EMPTY, [], undefined, patch);
    this.write(next);
    return next;
  }
}

/* ------------------------------------------------------------------ */
/* Firebase backend — one subtree in the shared Realtime Database.     */
/*                                                                    */
/*   plantWatering/                                                   */
/*     events/<plantId>__<date>: { plantId, date, loggedAt }          */
/*     overrides/<plantId>:      { intervalOverride?, nextDueAnchor? } */
/*     settings:                 { reminderEnabled, lastRemindedOn? }  */
/*                                                                    */
/* The deterministic event key is the {plantId, date} idempotency     */
/* guarantee; concurrent writers touch disjoint child paths, so there */
/* is no read-modify-write race on the tree as a whole.               */
/* ------------------------------------------------------------------ */

function eventKey(plantId: string, date: string): string {
  return `${plantId}__${date}`;
}

interface RawTree {
  events?: Record<string, WateringEvent>;
  overrides?: Record<string, PlantOverride>;
  settings?: HouseholdSettings;
}

function treeToData(raw: RawTree | null): WateringData {
  if (!raw) return EMPTY;
  const events = raw.events ? Object.values(raw.events) : [];
  return {
    events: dedupeEvents(events),
    overrides: raw.overrides ?? {},
    ...(raw.settings ? { settings: raw.settings } : {}),
  };
}

/**
 * Serialise for Realtime Database: keys whose value is `undefined` are dropped
 * (the SDK rejects them); an explicit `null` is kept and deletes that child on
 * write, which is how "clear the next-due anchor" is expressed.
 */
function forDb<T extends object>(obj: T): Partial<T> {
  return JSON.parse(JSON.stringify(obj));
}

/** Wrap an RTDB write so a failure reaches the caller as a readable Error. */
async function runWrite<T>(what: string, op: () => Promise<T>): Promise<T> {
  try {
    return await op();
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    throw new Error(`Couldn't ${what}: ${detail}`);
  }
}

class FirebaseBackend implements WateringBackend {
  readonly kind = "firebase" as const;
  constructor(private db: Database) {}

  private root() {
    return ref(this.db, WATERING_PATH);
  }

  async load(): Promise<WateringData> {
    const snap = await get(this.root());
    return treeToData(snap.val());
  }

  subscribe(
    onData: (data: WateringData) => void,
    onError?: (err: Error) => void,
  ): () => void {
    return onValue(
      this.root(),
      (snap) => onData(treeToData(snap.val())),
      (err) => onError?.(err),
    );
  }

  async addEvents(events: WateringEvent[]): Promise<WateringData> {
    const current = await this.load();
    const have = new Set(current.events.map((e) => eventKey(e.plantId, e.date)));
    const added: WateringEvent[] = [];
    const patch: Record<string, WateringEvent> = {};
    for (const e of events) {
      const key = eventKey(e.plantId, e.date);
      if (have.has(key)) continue;
      patch[key] = e;
      added.push(e);
    }
    if (added.length > 0) {
      await runWrite("log the watering", () =>
        update(ref(this.db, `${WATERING_PATH}/events`), patch),
      );
    }
    return merge(current, added);
  }

  async removeEvent(plantId: string, date: string): Promise<WateringData> {
    const current = await this.load();
    await runWrite("undo the watering", () =>
      remove(ref(this.db, `${WATERING_PATH}/events/${eventKey(plantId, date)}`)),
    );
    return without(current, plantId, date);
  }

  async setOverride(
    plantId: string,
    override: PlantOverride,
  ): Promise<WateringData> {
    const current = await this.load();
    await runWrite("update the schedule", () =>
      set(
        ref(this.db, `${WATERING_PATH}/overrides/${plantId}`),
        forDb(override),
      ),
    );
    return merge(current, [], { plantId, override });
  }

  async setSettings(
    patch: Partial<HouseholdSettings>,
  ): Promise<WateringData> {
    const current = await this.load();
    await runWrite("save the setting", () =>
      update(ref(this.db, `${WATERING_PATH}/settings`), forDb(patch)),
    );
    return merge(current, [], undefined, patch);
  }
}

/**
 * The Firebase backend when an API key is configured, otherwise a local
 * localStorage-backed store for development.
 */
export function getWateringBackend(): WateringBackend {
  const db = getDb();
  return db ? new FirebaseBackend(db) : new LocalBackend();
}
