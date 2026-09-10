import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sprout } from "lucide-react";
import { Screen } from "../components/Screen";
import { PrimaryButton } from "../components/ui";
import { PlantWaterCard, PlantUpcomingRow } from "../components/PlantCards";
import { useStore } from "../state/store";
import { useToast } from "../components/Toast";
import { wateredOn } from "../domain/schedule";
import { weekdayLongDate } from "../lib/format";
import "./screens.css";

export function Dashboard() {
  const {
    loading,
    error,
    today,
    plants,
    watering,
    schedules,
    logWatering,
    undoWatering,
  } = useStore();
  const toast = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);

  const { dueToday, comingUp } = useMemo(() => {
    const withSched = plants
      .map((p) => ({ plant: p, schedule: schedules.get(p.id)! }))
      .filter((x) => x.schedule);
    const due = withSched
      .filter(
        (x) =>
          (x.schedule.status === "due" || x.schedule.status === "overdue") &&
          !wateredOn(watering.events, x.plant.id, today),
      )
      .sort((a, b) => a.schedule.daysUntilDue - b.schedule.daysUntilDue);
    const up = withSched
      .filter((x) => !due.some((d) => d.plant.id === x.plant.id))
      .sort((a, b) => a.schedule.daysUntilDue - b.schedule.daysUntilDue);
    return { dueToday: due, comingUp: up };
  }, [plants, schedules, watering.events, today]);

  const nextUp = comingUp[0];

  async function water(plantId: string) {
    setBusy(plantId);
    try {
      await logWatering([plantId]);
      toast.show({
        message: "Watering logged",
        actionLabel: "Undo",
        onAction: () => void undoWatering(plantId, today),
      });
    } catch (e) {
      toast.show({
        message: e instanceof Error ? e.message : "Could not save",
        tone: "error",
        actionLabel: "Retry",
        onAction: () => void water(plantId),
      });
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <Screen>
        <p className="state-msg">Loading your plants…</p>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <h1 className="screen-title">My Plants</h1>
        <p className="state-msg">{error}</p>
      </Screen>
    );
  }

  if (plants.length === 0) {
    return (
      <Screen>
        <h1 className="screen-title">My Plants</h1>
        <div className="empty-card">
          <div className="empty-card__icon">
            <Sprout size={32} aria-hidden />
          </div>
          <h2 className="empty-card__heading">No plants yet</h2>
          <p className="empty-card__body">
            Add your first plant and we'll identify it, gather care notes, and
            remind you when to water.
          </p>
          <PrimaryButton onClick={() => navigate("/add")}>
            Add a plant
          </PrimaryButton>
        </div>
      </Screen>
    );
  }

  return (
    <Screen>
      <header className="dash-header">
        <div>
          <div className="screen-greeting">{weekdayLongDate(today)}</div>
          <h1 className="screen-title">My Plants</h1>
        </div>
        <div className="dash-header__profile" aria-hidden>
          L
        </div>
      </header>

      <Link
        to="/water-check"
        className="summary"
        aria-label="Review plants that need water"
      >
        <span className="summary__figure mono">{dueToday.length}</span>
        <span>
          <span className="summary__l1">
            {dueToday.length === 1
              ? "plant needs water today"
              : "plants need water today"}
          </span>
          <br />
          <span className="summary__l2">
            {nextUp
              ? `1 more coming up ${
                  nextUp.schedule.daysUntilDue === 1
                    ? "tomorrow"
                    : `in ${nextUp.schedule.daysUntilDue} days`
                }`
              : "Everything else is on track"}
          </span>
        </span>
      </Link>

      {dueToday.length > 0 && (
        <section className="section">
          <h2 className="section__heading">Water today</h2>
          {dueToday.map(({ plant, schedule }) => (
            <PlantWaterCard
              key={plant.id}
              plant={plant}
              schedule={schedule}
              busy={busy === plant.id}
              onWater={() => void water(plant.id)}
            />
          ))}
        </section>
      )}

      {comingUp.length > 0 && (
        <section className="section">
          <h2 className="section__heading">Coming up</h2>
          {comingUp.map(({ plant, schedule }) => (
            <PlantUpcomingRow key={plant.id} plant={plant} schedule={schedule} />
          ))}
        </section>
      )}

      {dueToday.length === 0 && (
        <button
          type="button"
          className="link-row"
          onClick={() => navigate("/water-check")}
        >
          Water something early
        </button>
      )}
    </Screen>
  );
}
