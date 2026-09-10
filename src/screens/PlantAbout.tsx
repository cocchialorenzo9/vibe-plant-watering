import { useParams } from "react-router-dom";
import { Droplet, Sun, Globe, Leaf, BookOpen, ArrowUpRight, ShieldAlert } from "lucide-react";
import { Screen } from "../components/Screen";
import { BackHeader } from "../components/BackHeader";
import { useStore } from "../state/store";
import { plantAvatarUrl } from "../data/plants";
import "./screens.css";

export function PlantAbout() {
  const { id = "" } = useParams();
  const { loading, plantById, schedules } = useStore();
  const plant = plantById(id);
  const schedule = schedules.get(id);

  if (loading) {
    return (
      <Screen>
        <p className="state-msg">Loading…</p>
      </Screen>
    );
  }
  if (!plant) {
    return (
      <Screen>
        <BackHeader title="Not found" to="/" />
        <p className="state-msg">That plant doesn't exist.</p>
      </Screen>
    );
  }

  return (
    <Screen>
      <BackHeader title="About this plant" to={`/plant/${id}`} />

      <div className="hero">
        <img
          className="avatar"
          src={plantAvatarUrl(plant)}
          alt=""
          width={76}
          height={76}
        />
        <div>
          <div className="hero__sci">{plant.species.scientificName}</div>
          <div className="hero__common">
            {plant.species.commonNames.join(" · ")}
          </div>
        </div>
      </div>

      <div className="facts">
        <div className="fact">
          <Droplet size={16} className="fact__icon" aria-hidden />
          <span className="fact__label">Water</span>
          <span className="fact__value">
            Every {schedule?.currentIntervalDays ?? plant.care.waterIntervalDays.summer} days
          </span>
        </div>
        <div className="fact">
          <Sun size={16} className="fact__icon" aria-hidden />
          <span className="fact__label">Light</span>
          <span className="fact__value">{plant.care.light}</span>
        </div>
        <div className="fact">
          <Globe size={16} className="fact__icon" aria-hidden />
          <span className="fact__label">Origin</span>
          <span className="fact__value">{shortOrigin(plant.species.origin)}</span>
        </div>
      </div>

      <section className="prose">
        <h2>Origin</h2>
        <p>{plant.species.origin}</p>
      </section>

      <section className="prose">
        <h2>Good to know</h2>
        {plant.species.curiosities.map((c, i) => (
          <div className="bullet" key={i}>
            <Leaf size={14} aria-hidden />
            <span>{c}</span>
          </div>
        ))}
      </section>

      <section className="prose">
        <h2>Toxicity</h2>
        <div className="bullet">
          <ShieldAlert size={14} aria-hidden />
          <span>{plant.species.toxicity}</span>
        </div>
      </section>

      <section className="section">
        <h2 className="section__heading">Sources</h2>
        {plant.species.sources.map((s) => (
          <a
            key={s.url}
            className="source-row"
            href={s.url}
            target="_blank"
            rel="noreferrer"
          >
            <BookOpen size={16} aria-hidden />
            <span className="source-row__t">
              {s.title}
              <br />
              <span className="source-row__u">{hostname(s.url)}</span>
            </span>
            <ArrowUpRight size={15} className="ext" aria-hidden />
          </a>
        ))}
      </section>
    </Screen>
  );
}

function shortOrigin(origin: string): string {
  const cleaned = origin
    .replace(/^(Native to|Origin uncertain;?|Likely)\s*(the\s+)?/i, "")
    .split(/[,.;]/)[0]
    .trim();
  return cleaned.length > 24 ? cleaned.slice(0, 22).trimEnd() + "…" : cleaned;
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
