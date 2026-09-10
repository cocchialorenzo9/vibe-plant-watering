import { useState } from "react";
import type { Plant, PlantOverride } from "../domain/types";
import { effectiveInterval } from "../domain/schedule";
import { PrimaryButton, SecondaryButton } from "./ui";
import "./EditScheduleSheet.css";

export function EditScheduleSheet({
  plant,
  override,
  onClose,
  onSave,
}: {
  plant: Plant;
  override: PlantOverride | undefined;
  onClose: () => void;
  onSave: (next: PlantOverride) => Promise<void>;
}) {
  const current = effectiveInterval(plant, override);
  const [summer, setSummer] = useState(String(current.summer));
  const [winter, setWinter] = useState(String(current.winter));
  const [anchor, setAnchor] = useState(override?.nextDueAnchor ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    const s = Number(summer);
    const w = Number(winter);
    if (!Number.isInteger(s) || !Number.isInteger(w) || s < 1 || w < 1) {
      setErr("Intervals must be whole numbers of days.");
      return;
    }
    setSaving(true);
    setErr(null);
    const next: PlantOverride = {
      ...override,
      intervalOverride: { summer: s, winter: w },
      nextDueAnchor: anchor || null,
    };
    try {
      await onSave(next);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="sheet-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Edit watering schedule"
      onClick={onClose}
    >
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__handle" />
        <h2 className="sheet__title">Watering schedule</h2>
        <p className="sub">
          Days between waterings. Growing season is March–October; the rest of
          the year uses the dormant interval.
        </p>

        <label className="sheet__field">
          <span>Growing season (summer)</span>
          <input
            type="number"
            min={1}
            inputMode="numeric"
            value={summer}
            onChange={(e) => setSummer(e.target.value)}
          />
        </label>
        <label className="sheet__field">
          <span>Dormant season (winter)</span>
          <input
            type="number"
            min={1}
            inputMode="numeric"
            value={winter}
            onChange={(e) => setWinter(e.target.value)}
          />
        </label>
        <label className="sheet__field">
          <span>Shift next watering to (optional)</span>
          <input
            type="date"
            value={anchor}
            onChange={(e) => setAnchor(e.target.value)}
          />
        </label>

        {err && <p className="sheet__err">{err}</p>}

        <PrimaryButton onClick={() => void save()} disabled={saving}>
          {saving ? "Saving…" : "Save schedule"}
        </PrimaryButton>
        <SecondaryButton onClick={onClose} disabled={saving}>
          Cancel
        </SecondaryButton>
      </div>
    </div>
  );
}
