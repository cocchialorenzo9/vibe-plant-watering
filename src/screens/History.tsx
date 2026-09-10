import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Droplet } from "lucide-react";
import { Screen } from "../components/Screen";
import { Avatar } from "../components/ui";
import { useStore } from "../state/store";
import { plantAvatarUrl } from "../data/plants";
import { relativeDay, weekdayLongDate } from "../lib/format";
import { parseIso } from "../lib/date";
import "./screens.css";

export function History() {
  const { loading, today, plants, watering } = useStore();

  const grouped = useMemo(() => {
    const byDate = new Map<string, typeof watering.events>();
    for (const e of [...watering.events].sort((a, b) =>
      b.date === a.date
        ? b.loggedAt.localeCompare(a.loggedAt)
        : b.date.localeCompare(a.date),
    )) {
      const arr = byDate.get(e.date) ?? [];
      arr.push(e);
      byDate.set(e.date, arr);
    }
    return [...byDate.entries()];
  }, [watering.events]);

  const monthCount = useMemo(() => {
    const now = parseIso(today);
    return watering.events.filter((e) => {
      const d = parseIso(e.date);
      return (
        d.getUTCFullYear() === now.getUTCFullYear() &&
        d.getUTCMonth() === now.getUTCMonth()
      );
    }).length;
  }, [watering.events, today]);

  const plantOf = (id: string) => plants.find((p) => p.id === id);

  if (loading) {
    return (
      <Screen>
        <p className="state-msg">Loading…</p>
      </Screen>
    );
  }

  return (
    <Screen>
      <h1 className="screen-title">History</h1>
      <p className="sub">
        {monthCount} watering{monthCount === 1 ? "" : "s"} this month.
      </p>

      {grouped.length === 0 && (
        <p className="state-msg">No waterings logged yet.</p>
      )}

      {grouped.map(([date, events]) => (
        <section className="section" key={date}>
          <div className="history-day-label">
            {relativeDay(date, today) === "today"
              ? "Today"
              : relativeDay(date, today) === "yesterday"
                ? "Yesterday"
                : weekdayLongDate(date)}
          </div>
          <div className="history-list">
            {events.map((e) => {
              const p = plantOf(e.plantId);
              const row = (
                <>
                  {p ? (
                    <Avatar src={plantAvatarUrl(p)} alt="" size={32} />
                  ) : (
                    <Droplet size={16} aria-hidden />
                  )}
                  <span className="history-row__date" style={{ fontFamily: "var(--font-body)" }}>
                    {p?.nickname ?? e.plantId} watered
                  </span>
                  <span className="history-row__rel">
                    {relativeDay(e.date, today)}
                  </span>
                </>
              );
              return p ? (
                <Link
                  key={e.plantId + e.loggedAt}
                  to={`/plant/${e.plantId}`}
                  className="history-row"
                >
                  {row}
                </Link>
              ) : (
                <div key={e.plantId + e.loggedAt} className="history-row">
                  {row}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </Screen>
  );
}
