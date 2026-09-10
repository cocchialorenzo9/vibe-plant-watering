import type {
  HouseholdSettings,
  PlantOverride,
  WateringData,
  WateringEvent,
} from "../domain/types";
import { type AppConfig, isConnected } from "./config";

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

export interface WateringBackend {
  readonly kind: "local" | "github";
  load(signal?: AbortSignal): Promise<WateringData>;
  addEvents(events: WateringEvent[]): Promise<WateringData>;
  setOverride(plantId: string, override: PlantOverride): Promise<WateringData>;
  setSettings(patch: Partial<HouseholdSettings>): Promise<WateringData>;
}

/* ------------------------------------------------------------------ */
/* Local backend — localStorage, seeded from the bundled example file. */
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
/* GitHub backend — a JSON file in the private data repo.              */
/* ------------------------------------------------------------------ */

interface GhFile {
  data: WateringData;
  sha: string | null;
}

const API = "https://api.github.com";

function b64decode(s: string): string {
  return decodeURIComponent(escape(atob(s.replace(/\n/g, ""))));
}
function b64encode(s: string): string {
  return btoa(unescape(encodeURIComponent(s)));
}

class GitHubBackend implements WateringBackend {
  readonly kind = "github" as const;
  constructor(private cfg: AppConfig) {}

  private url(): string {
    const { owner, repo, path } = this.cfg;
    return `${API}/repos/${owner}/${repo}/contents/${path}`;
  }

  private headers(): HeadersInit {
    return {
      Authorization: `Bearer ${this.cfg.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
  }

  private async fetchFile(signal?: AbortSignal): Promise<GhFile> {
    const res = await fetch(this.url(), { headers: this.headers(), signal });
    if (res.status === 404) return { data: EMPTY, sha: null };
    if (!res.ok) {
      throw new Error(`GitHub read failed (${res.status})`);
    }
    const body = (await res.json()) as { content: string; sha: string };
    return {
      data: JSON.parse(b64decode(body.content)) as WateringData,
      sha: body.sha,
    };
  }

  async load(signal?: AbortSignal): Promise<WateringData> {
    return (await this.fetchFile(signal)).data;
  }

  private async commit(
    apply: (current: WateringData) => WateringData,
    message: string,
  ): Promise<WateringData> {
    // Up to 3 attempts to absorb a concurrent write (409 / stale sha).
    let lastErr: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data, sha } = await this.fetchFile();
      const next = apply(data);
      const res = await fetch(this.url(), {
        method: "PUT",
        headers: { ...this.headers(), "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          content: b64encode(JSON.stringify(next, null, 2) + "\n"),
          ...(sha ? { sha } : {}),
        }),
      });
      if (res.ok) return next;
      if (res.status === 409 || res.status === 422) {
        lastErr = new Error(`GitHub write conflict (${res.status})`);
        continue;
      }
      throw new Error(`GitHub write failed (${res.status})`);
    }
    throw lastErr ?? new Error("GitHub write failed");
  }

  async addEvents(events: WateringEvent[]): Promise<WateringData> {
    return this.commit(
      (cur) => merge(cur, events),
      `Log watering: ${events.map((e) => e.plantId).join(", ")}`,
    );
  }

  async setOverride(
    plantId: string,
    override: PlantOverride,
  ): Promise<WateringData> {
    return this.commit(
      (cur) => merge(cur, [], { plantId, override }),
      `Update schedule: ${plantId}`,
    );
  }

  async setSettings(
    patch: Partial<HouseholdSettings>,
  ): Promise<WateringData> {
    return this.commit(
      (cur) => merge(cur, [], undefined, patch),
      `Update household settings`,
    );
  }
}

export function getWateringBackend(cfg: AppConfig): WateringBackend {
  return isConnected(cfg) ? new GitHubBackend(cfg) : new LocalBackend();
}
