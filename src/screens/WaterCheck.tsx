import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { Screen } from "../components/Screen";
import { BackHeader } from "../components/BackHeader";
import { PrimaryButton } from "../components/ui";
import { Avatar } from "../components/ui";
import { useStore } from "../state/store";
import { useToast } from "../components/Toast";
import { wateredOn } from "../domain/schedule";
import { plantAvatarUrl } from "../data/plants";
import { statusText } from "../lib/format";
import "./screens.css";

export function WaterCheck() {
  const navigate = useNavigate();
  const toast = useToast();
  const { loading, today, plants, schedules, watering, logWatering } = useStore();
  const [saving, setSaving] = useState(false);

  const rows = useMemo(() => {
    return plants
      .map((p) => ({ plant: p, schedule: schedules.get(p.id)! }))
      .filter((r) => r.schedule)
      .sort((a, b) => a.schedule.daysUntilDue - b.schedule.daysUntilDue);
  }, [plants, schedules]);

  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [initialised, setInitialised] = useState(false);
  useEffect(() => {
    if (initialised || !rows.length) return;
    setSelected(
      new Set(
        rows
          .filter(
            (r) =>
              (r.schedule.status === "due" || r.schedule.status === "overdue") &&
              !wateredOn(watering.events, r.plant.id, today),
          )
          .map((r) => r.plant.id),
      ),
    );
    setInitialised(true);
  }, [initialised, rows, watering.events, today]);

  function toggle(id: string, done: boolean) {
    if (done) return;
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function logAll() {
    const ids = [...selected];
    if (!ids.length) return;
    setSaving(true);
    try {
      await logWatering(ids);
      navigate("/watered", {
        state: {
          names: rows
            .filter((r) => ids.includes(r.plant.id))
            .map((r) => r.plant.nickname),
        },
      });
    } catch (e) {
      toast.show({
        message: e instanceof Error ? e.message : "Could not save",
        tone: "error",
        actionLabel: "Retry",
        onAction: () => void logAll(),
      });
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <p className="state-msg">Loading…</p>
      </Screen>
    );
  }

  const count = selected.size;

  return (
    <Screen>
      <BackHeader title="Water check" to="/" />
      <p className="sub">
        We've pre-selected the plants due today. Tap to adjust, then log them all
        at once.
      </p>

      <div className="section">
        {rows.map(({ plant, schedule }) => {
          const done = wateredOn(watering.events, plant.id, today);
          const on = selected.has(plant.id);
          return (
            <button
              key={plant.id}
              type="button"
              className="check-row"
              aria-pressed={on}
              onClick={() => toggle(plant.id, done)}
            >
              <Avatar src={plantAvatarUrl(plant)} alt="" size={40} />
              <span className="check-row__name">{plant.nickname}</span>
              <span
                className={`check-row__due ${
                  schedule.status === "overdue" ? "check-row__due--warn" : ""
                }`}
              >
                {done ? "Watered today" : statusText(schedule)}
              </span>
              <span
                className={`check-box ${
                  done ? "check-box--done" : on ? "check-box--on" : ""
                }`}
              >
                {(done || on) && <Check size={14} aria-hidden />}
              </span>
            </button>
          );
        })}
      </div>

      <PrimaryButton onClick={() => void logAll()} disabled={saving || count === 0}>
        {count === 0
          ? "Select a plant"
          : `Log ${count} watering${count === 1 ? "" : "s"}`}
      </PrimaryButton>
    </Screen>
  );
}
