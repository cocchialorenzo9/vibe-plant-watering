import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Check, CalendarClock } from "lucide-react";
import { Screen } from "../components/Screen";
import { PrimaryButton } from "../components/ui";
import { useStore } from "../state/store";

export function WateredConfirmation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { plants, schedules } = useStore();
  const names: string[] = (location.state as { names?: string[] })?.names ?? [];

  const nextUp = useMemo(() => {
    return plants
      .map((p) => ({ plant: p, schedule: schedules.get(p.id)! }))
      .filter((x) => x.schedule && x.schedule.daysUntilDue > 0)
      .sort((a, b) => a.schedule.daysUntilDue - b.schedule.daysUntilDue)[0];
  }, [plants, schedules]);

  const list =
    names.length === 0
      ? "Your plants are"
      : names.length === 1
        ? `${names[0]} is`
        : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]} are`;

  return (
    <Screen>
      <div className="confirm">
        <div className="confirm__circle">
          <Check size={40} aria-hidden />
        </div>
        <h1 className="confirm__title">Nice work!</h1>
        <p className="confirm__body">
          {list} watered. We'll nudge you again when the next one is due — and by
          email at 7&nbsp;PM if it slips by.
        </p>
        {nextUp && (
          <div className="confirm__next">
            <CalendarClock size={16} aria-hidden />
            <span>
              Next up: {nextUp.plant.nickname} in {nextUp.schedule.daysUntilDue}{" "}
              day{nextUp.schedule.daysUntilDue === 1 ? "" : "s"}
            </span>
          </div>
        )}
        <PrimaryButton onClick={() => navigate("/")}>
          Back to my plants
        </PrimaryButton>
      </div>
    </Screen>
  );
}
