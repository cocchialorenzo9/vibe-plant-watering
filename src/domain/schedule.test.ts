import { describe, it, expect } from "vitest";
import {
  effectiveInterval,
  nextDueDate,
  skippedNextDate,
  waterStatus,
  computeSchedule,
  forwardSchedule,
  wateredOn,
} from "./schedule";
import type { Plant, PlantOverride, WateringEvent } from "./types";

const plant: Plant = {
  id: "monstera-deliciosa",
  nickname: "Monstera",
  species: {
    scientificName: "Monstera deliciosa",
    commonNames: ["Swiss cheese plant"],
    shortDescription: "",
    origin: "",
    curiosities: [],
    toxicity: "",
    sources: [],
  },
  care: {
    waterIntervalDays: { summer: 7, winter: 14 },
    light: "Bright indirect",
    idealTempC: [18, 27],
  },
  avatar: "avatars/monstera-deliciosa.png",
  addedOn: "2026-06-01",
};

const ev = (date: string): WateringEvent => ({
  plantId: plant.id,
  date,
  loggedAt: `${date}T09:00:00.000Z`,
});

describe("effectiveInterval", () => {
  it("returns the authored interval when there is no override", () => {
    expect(effectiveInterval(plant, undefined)).toEqual({ summer: 7, winter: 14 });
  });

  it("prefers the override interval", () => {
    const o: PlantOverride = { intervalOverride: { summer: 5, winter: 10 } };
    expect(effectiveInterval(plant, o)).toEqual({ summer: 5, winter: 10 });
  });
});

describe("nextDueDate", () => {
  it("counts from the most recent watering using the seasonal interval", () => {
    expect(nextDueDate(plant, undefined, [ev("2026-07-01")], "2026-07-03")).toBe(
      "2026-07-08",
    );
  });

  it("falls back to addedOn when the plant was never watered", () => {
    expect(nextDueDate(plant, undefined, [], "2026-06-02")).toBe("2026-06-08");
  });

  it("uses the winter interval when the anchor date is dormant", () => {
    expect(nextDueDate(plant, undefined, [ev("2026-12-01")], "2026-12-02")).toBe(
      "2026-12-15",
    );
  });

  it("honours a nextDueAnchor until a later watering supersedes it", () => {
    const o: PlantOverride = { nextDueAnchor: "2026-07-20" };
    expect(nextDueDate(plant, o, [ev("2026-07-01")], "2026-07-10")).toBe(
      "2026-07-20",
    );
    // A watering on/after the anchor makes it stale.
    expect(nextDueDate(plant, o, [ev("2026-07-01"), ev("2026-07-21")], "2026-07-22")).toBe(
      "2026-07-28",
    );
  });

  it("skippedNextDate advances one interval past the current due date", () => {
    expect(skippedNextDate(plant, undefined, [ev("2026-07-01")], "2026-07-03")).toBe(
      "2026-07-15",
    );
  });

  it("ignores events belonging to other plants", () => {
    const other: WateringEvent = { plantId: "aloe", date: "2026-07-05", loggedAt: "x" };
    expect(nextDueDate(plant, undefined, [ev("2026-07-01"), other], "2026-07-03")).toBe(
      "2026-07-08",
    );
  });
});

describe("waterStatus", () => {
  it("is due on the exact day", () => {
    expect(waterStatus("2026-07-08", "2026-07-08")).toBe("due");
  });
  it("is overdue after the due day", () => {
    expect(waterStatus("2026-07-08", "2026-07-10")).toBe("overdue");
  });
  it("is upcoming before the due day", () => {
    expect(waterStatus("2026-07-08", "2026-07-05")).toBe("upcoming");
  });
});

describe("computeSchedule", () => {
  it("summarises a plant's watering state", () => {
    const s = computeSchedule(plant, undefined, [ev("2026-07-01")], "2026-07-10");
    expect(s).toEqual({
      plantId: "monstera-deliciosa",
      lastWatered: "2026-07-01",
      nextDue: "2026-07-08",
      status: "overdue",
      daysUntilDue: -2,
      currentIntervalDays: 7,
    });
  });
});

describe("forwardSchedule", () => {
  it("projects future watering dates, re-evaluating the season each step", () => {
    const dates = forwardSchedule(plant, undefined, [ev("2026-10-20")], "2026-10-21", 3);
    // due = 10-20 +7 (summer) -> 10-27; +7 -> 11-03; from 11-03 winter (+14) -> 11-17
    expect(dates).toEqual(["2026-10-27", "2026-11-03", "2026-11-17"]);
  });
});

describe("wateredOn", () => {
  it("detects an existing watering for a plant on a date", () => {
    expect(wateredOn([ev("2026-07-01")], "monstera-deliciosa", "2026-07-01")).toBe(true);
    expect(wateredOn([ev("2026-07-01")], "monstera-deliciosa", "2026-07-02")).toBe(false);
  });
});
