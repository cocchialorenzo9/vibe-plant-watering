import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Droplet,
  Sun,
  Thermometer,
  Info,
  ChevronRight,
  Sprout,
  Pencil,
  SkipForward,
} from "lucide-react";
import { Screen } from "../components/Screen";
import { BackHeader } from "../components/BackHeader";
import { PrimaryButton } from "../components/ui";
import { EditScheduleSheet } from "../components/EditScheduleSheet";
import { useStore } from "../state/store";
import { useToast } from "../components/Toast";
import { plantAvatarUrl } from "../data/plants";
import { wateredOn, nextDueDate } from "../domain/schedule";
import { shortDate, relativeDay } from "../lib/format";
import { diffDays } from "../lib/date";
import "./screens.css";

export function PlantDetail() {
  const { id = "" } = useParams();
  const toast = useToast();
  const {
    loading,
    today,
    plantById,
    schedules,
    watering,
    logWatering,
    undoWatering,
    setOverride,
  } = useStore();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const plant = plantById(id);
  const schedule = schedules.get(id);
  const override = watering.overrides[id];

  const events = useMemo(
    () =>
      watering.events
        .filter((e) => e.plantId === id)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [watering.events, id],
  );

  if (loading) {
    return (
      <Screen>
        <p className="state-msg">Loading…</p>
      </Screen>
    );
  }
  if (!plant || !schedule) {
    return (
      <Screen>
        <BackHeader title="Not found" to="/" />
        <p className="state-msg">That plant doesn't exist.</p>
      </Screen>
    );
  }

  const wateredToday = wateredOn(watering.events, id, today);
  const interval = schedule.currentIntervalDays;
  const sinceLast = schedule.lastWatered
    ? diffDays(schedule.lastWatered, today)
    : interval;
  const progress = Math.max(0, Math.min(1, sinceLast / interval));

  async function water() {
    setBusy(true);
    try {
      await logWatering([id]);
      toast.show({
        message: `${plant!.nickname} watered`,
        actionLabel: "Undo",
        onAction: () => void undoWatering(id, today),
      });
    } catch (e) {
      toast.show({
        message: e instanceof Error ? e.message : "Could not save",
        tone: "error",
        actionLabel: "Retry",
        onAction: () => void water(),
      });
    } finally {
      setBusy(false);
    }
  }

  async function skipNext() {
    try {
      await setOverride(id, { ...override, skipNext: true });
      toast.show({ message: "Skipped this watering" });
    } catch (e) {
      toast.show({
        message: e instanceof Error ? e.message : "Could not save",
        tone: "error",
      });
    }
  }

  const nextDue = nextDueDate(plant, override, watering.events, today);

  return (
    <Screen>
      <BackHeader title={plant.nickname} to="/" />

      <div className="hero-card">
        <div className="hero">
          <img
            className="avatar"
            src={plantAvatarUrl(plant)}
            alt=""
            width={60}
            height={60}
          />
          <div>
            <div className="hero__sci" style={{ fontSize: 20 }}>
              {plant.nickname}
            </div>
            <div className="hero-card__meta">
              {plant.species.scientificName} · added {shortDate(plant.addedOn)}
            </div>
          </div>
        </div>
        <div>
          <div className="progress__labels">
            <span>
              {schedule.lastWatered
                ? `Last watered ${shortDate(schedule.lastWatered)}`
                : "Not watered yet"}
            </span>
            <span>Next {shortDate(nextDue)}</span>
          </div>
          <div className="progress__track">
            <div
              className="progress__fill"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <div className="progress__countdown">
            {schedule.daysUntilDue === 0
              ? "Water today"
              : schedule.daysUntilDue < 0
                ? `${Math.abs(schedule.daysUntilDue)} days overdue`
                : `Water in ${schedule.daysUntilDue} days`}
          </div>
        </div>
      </div>

      <PrimaryButton onClick={() => void water()} disabled={busy || wateredToday}>
        {wateredToday ? "Watered today ✓" : "I watered this today"}
      </PrimaryButton>

      <div style={{ display: "flex", gap: 10 }}>
        <button
          type="button"
          className="link-row"
          style={{ justifyContent: "center", fontWeight: 600 }}
          onClick={() => setEditing(true)}
        >
          <Pencil size={16} aria-hidden /> Edit schedule
        </button>
        <button
          type="button"
          className="link-row"
          style={{ justifyContent: "center", fontWeight: 600 }}
          onClick={() => void skipNext()}
        >
          <SkipForward size={16} aria-hidden /> Skip next
        </button>
      </div>

      <div className="facts">
        <div className="fact">
          <Droplet size={16} className="fact__icon" aria-hidden />
          <span className="fact__label">Water</span>
          <span className="fact__value">Every {interval} days</span>
        </div>
        <div className="fact">
          <Sun size={16} className="fact__icon" aria-hidden />
          <span className="fact__label">Light</span>
          <span className="fact__value">{plant.care.light}</span>
        </div>
        <div className="fact">
          <Thermometer size={16} className="fact__icon" aria-hidden />
          <span className="fact__label">Ideal temp</span>
          <span className="fact__value">
            {plant.care.idealTempC[0]}–{plant.care.idealTempC[1]}°C
          </span>
        </div>
      </div>

      <section className="section">
        <h2 className="section__heading">Watering history</h2>
        <div className="history-list">
          {events.map((e) => (
            <div key={e.date + e.loggedAt} className="history-row">
              <Droplet size={14} style={{ color: "var(--water)" }} aria-hidden />
              <span className="history-row__date">{shortDate(e.date)}</span>
              <span className="history-row__rel">
                {relativeDay(e.date, today)}
              </span>
            </div>
          ))}
          <div className="history-row">
            <Sprout size={14} style={{ color: "var(--accent)" }} aria-hidden />
            <span className="history-row__date">{shortDate(plant.addedOn)}</span>
            <span className="history-row__rel">Added</span>
          </div>
        </div>
      </section>

      <Link to={`/plant/${id}/about`} className="link-row">
        <Info size={16} aria-hidden />
        About this plant
        <ChevronRight size={16} className="link-row__chev" aria-hidden />
      </Link>

      {editing && (
        <EditScheduleSheet
          plant={plant}
          override={override}
          onClose={() => setEditing(false)}
          onSave={(next) => setOverride(id, next)}
        />
      )}
    </Screen>
  );
}
