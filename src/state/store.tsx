import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  Plant,
  PlantOverride,
  PlantSchedule,
  WateringData,
} from "../domain/types";
import { computeSchedule } from "../domain/schedule";
import { todayInBerlin } from "../lib/date";
import { fetchPlants } from "../data/plants";
import {
  type AppConfig,
  isConnected,
  loadConfig,
  saveConfig,
} from "../data/config";
import { getWateringBackend } from "../data/watering";

interface StoreValue {
  loading: boolean;
  error: string | null;
  today: string;
  plants: Plant[];
  watering: WateringData;
  config: AppConfig;
  connected: boolean;
  schedules: Map<string, PlantSchedule>;
  plantById: (id: string) => Plant | undefined;
  logWatering: (plantIds: string[], date?: string) => Promise<void>;
  undoWatering: (plantId: string, date: string) => Promise<void>;
  setOverride: (plantId: string, override: PlantOverride) => Promise<void>;
  reminderEnabled: boolean;
  setReminderEnabled: (v: boolean) => Promise<void>;
  updateConfig: (patch: Partial<AppConfig>) => void;
  reload: () => void;
}

const Ctx = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [today] = useState(() => todayInBerlin());
  const [config, setConfig] = useState<AppConfig>(() => loadConfig());
  const [plants, setPlants] = useState<Plant[]>([]);
  const [watering, setWatering] = useState<WateringData>({
    events: [],
    overrides: {},
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const backend = useMemo(() => getWateringBackend(config), [config]);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    Promise.all([fetchPlants(ac.signal), backend.load(ac.signal)])
      .then(([p, w]) => {
        setPlants(p);
        setWatering(w);
      })
      .catch((e: unknown) => {
        if (!ac.signal.aborted) {
          setError(e instanceof Error ? e.message : "Failed to load");
        }
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, [backend, nonce]);

  const schedules = useMemo(() => {
    const map = new Map<string, PlantSchedule>();
    for (const plant of plants) {
      map.set(
        plant.id,
        computeSchedule(
          plant,
          watering.overrides[plant.id],
          watering.events,
          today,
        ),
      );
    }
    return map;
  }, [plants, watering, today]);

  const plantById = useCallback(
    (id: string) => plants.find((p) => p.id === id),
    [plants],
  );

  const logWatering = useCallback(
    async (plantIds: string[], date: string = today) => {
      const loggedAt = new Date().toISOString();
      const events = plantIds.map((plantId) => ({ plantId, date, loggedAt }));
      const next = await backend.addEvents(events);
      setWatering(next);
    },
    [backend, today],
  );

  const undoWatering = useCallback(
    async (plantId: string, date: string) => {
      // Local backend only supports this cleanly; GitHub path rewrites the file.
      const filtered: WateringData = {
        events: watering.events.filter(
          (e) => !(e.plantId === plantId && e.date === date),
        ),
        overrides: watering.overrides,
      };
      setWatering(filtered);
      try {
        localStorage.setItem("pw:watering", JSON.stringify(filtered));
      } catch {
        /* ignore */
      }
    },
    [watering],
  );

  const setOverride = useCallback(
    async (plantId: string, override: PlantOverride) => {
      const next = await backend.setOverride(plantId, override);
      setWatering(next);
    },
    [backend],
  );

  const setReminderEnabled = useCallback(
    async (v: boolean) => {
      const next = await backend.setSettings({ reminderEnabled: v });
      setWatering(next);
    },
    [backend],
  );

  const updateConfig = useCallback((patch: Partial<AppConfig>) => {
    setConfig(saveConfig(patch));
  }, []);

  const value: StoreValue = {
    loading,
    error,
    today,
    plants,
    watering,
    config,
    connected: isConnected(config),
    schedules,
    plantById,
    logWatering,
    undoWatering,
    setOverride,
    reminderEnabled: watering.settings?.reminderEnabled ?? true,
    setReminderEnabled,
    updateConfig,
    reload: () => setNonce((n) => n + 1),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): StoreValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore must be used within StoreProvider");
  return v;
}
