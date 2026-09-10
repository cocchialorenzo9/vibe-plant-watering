/**
 * Local device configuration. The data-repo Personal Access Token lives here,
 * per ADR 0002. This whole module is the isolation seam: swapping to a
 * Cloudflare Worker backend later should only touch config.ts + watering.ts.
 */

export interface AppConfig {
  /** Fine-grained PAT with contents:write on the private data repo only. */
  token: string;
  /** e.g. "cocchialorenzo" */
  owner: string;
  /** e.g. "plant-watering-data" */
  repo: string;
  /** Path to the watering JSON file within that repo. */
  path: string;
  /** Whether the 7pm evening reminder email is enabled. */
  reminderEnabled: boolean;
}

const KEY = "pw:config";

const DEFAULTS: AppConfig = {
  token: "",
  owner: import.meta.env.VITE_DATA_OWNER ?? "",
  repo: import.meta.env.VITE_DATA_REPO ?? "plant-watering-data",
  path: import.meta.env.VITE_DATA_PATH ?? "watering.json",
  reminderEnabled: true,
};

export function loadConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<AppConfig>) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveConfig(patch: Partial<AppConfig>): AppConfig {
  const next = { ...loadConfig(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable — config simply won't persist */
  }
  return next;
}

/** True when the app can write watering data to GitHub. */
export function isConnected(c: AppConfig): boolean {
  return Boolean(c.token && c.owner && c.repo && c.path);
}
