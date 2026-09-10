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
import { firebaseConfigured } from "../data/firebase";
import { getWateringBackend } from "../data/watering";

interface StoreValue {
  loading: boolean;
  error: string | null;
  today: string;
  plants: Plant[];
  watering: WateringData;
  /** True when watering writes go to the shared Firebase store. */
  connected: boolean;
  schedules: Map<string, PlantSchedule>;
  plantById: (id: string) => Plant | undefined;
  logWatering: (plantIds: string[], date?: string) => Promise<void>;
  undoWatering: (plantId: string, date: string) => Promise<void>;
  setOverride: (plantId: string, override: PlantOverride) => Promise<void>;
  reminderEnabled: boolean;
  setReminderEnabled: (v: boolean) => Promise<void>;
  reload: () => void;
}

const Ctx = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [today, setToday] = useState(() => todayInBerlin());
  useEffect(() => {
    const sync = () => setToday(todayInBerlin());
    const timer = setInterval(sync, 60_000);
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("focus", sync);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [watering, setWatering] = useState<WateringData>({
    events: [],
    overrides: {},
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const backend = useMemo(() => getWateringBackend(), []);

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
    // Live sync: later writes from any device push straight into state.
    const unsubscribe = backend.subscribe?.((w) => setWatering(w));
    return () => {
      ac.abort();
      unsubscribe?.();
    };
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
      const next = await backend.removeEvent(plantId, date);
      setWatering(next);
    },
    [backend],
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

  const value: StoreValue = {
    loading,
    error,
    today,
    plants,
    watering,
    connected: firebaseConfigured(),
    schedules,
    plantById,
    logWatering,
    undoWatering,
    setOverride,
    reminderEnabled: watering.settings?.reminderEnabled ?? true,
    setReminderEnabled,
    reload: () => setNonce((n) => n + 1),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): StoreValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore must be used within StoreProvider");
  return v;
}
