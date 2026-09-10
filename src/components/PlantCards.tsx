import { Link } from "react-router-dom";
import { Droplet } from "lucide-react";
import type { Plant, PlantSchedule } from "../domain/types";
import { plantAvatarUrl } from "../data/plants";
import { Avatar } from "./ui";
import { statusText, statusTone, countdownText } from "../lib/format";
import "./PlantCards.css";

const toneVar = {
  water: "var(--water)",
  warn: "var(--warn)",
  sage: "var(--accent)",
} as const;
const toneTint = {
  water: "var(--water-tint)",
  warn: "var(--warn-tint)",
  sage: "var(--sage-tint)",
} as const;

export function PlantWaterCard({
  plant,
  schedule,
  onWater,
  busy,
}: {
  plant: Plant;
  schedule: PlantSchedule;
  onWater: () => void;
  busy?: boolean;
}) {
  const tone = statusTone(schedule);
  return (
    <div className="pwc">
      <Link to={`/plant/${plant.id}`} className="pwc__main">
        <Avatar src={plantAvatarUrl(plant)} alt="" size={56} />
        <div className="pwc__info">
          <span className="pwc__name">{plant.nickname}</span>
          <span className="pwc__status" style={{ color: toneVar[tone] }}>
            <Droplet size={13} aria-hidden />
            {statusText(schedule)}
          </span>
        </div>
      </Link>
      <button
        type="button"
        className="pwc__btn"
        style={{ background: toneTint[tone], color: toneVar[tone] }}
        onClick={onWater}
        disabled={busy}
      >
        <Droplet size={14} aria-hidden />
        Water
      </button>
    </div>
  );
}

export function PlantUpcomingRow({
  plant,
  schedule,
}: {
  plant: Plant;
  schedule: PlantSchedule;
}) {
  const tone = statusTone(schedule);
  return (
    <Link to={`/plant/${plant.id}`} className="pur">
      <Avatar src={plantAvatarUrl(plant)} alt="" size={40} />
      <div className="pur__info">
        <span className="pur__name">{plant.nickname}</span>
        <span className="pur__sub muted">
          Every {schedule.currentIntervalDays} days
        </span>
      </div>
      <span
        className="pur__chip mono"
        style={{ background: toneTint[tone], color: toneVar[tone] }}
      >
        {countdownText(schedule)}
      </span>
    </Link>
  );
}
