import { describe, it, expect } from "vitest";
import {
  statusText,
  countdownText,
  intervalText,
  relativeDay,
  shortDate,
} from "./format";
import type { PlantSchedule } from "../domain/types";

const sched = (daysUntilDue: number): PlantSchedule => ({
  plantId: "x",
  lastWatered: "2026-09-01",
  nextDue: "2026-09-10",
  status: daysUntilDue === 0 ? "due" : daysUntilDue < 0 ? "overdue" : "upcoming",
  daysUntilDue,
  currentIntervalDays: 7,
});

describe("statusText", () => {
  it("handles today, overdue and upcoming", () => {
    expect(statusText(sched(0))).toBe("Needs water today");
    expect(statusText(sched(-2))).toBe("2 days overdue");
    expect(statusText(sched(-1))).toBe("1 day overdue");
    expect(statusText(sched(5))).toBe("Due in 5 days");
  });
});

describe("countdownText", () => {
  it("is compact", () => {
    expect(countdownText(sched(0))).toBe("today");
    expect(countdownText(sched(5))).toBe("in 5d");
    expect(countdownText(sched(-3))).toBe("3d ago");
  });
});

describe("intervalText", () => {
  it("collapses equal seasons and shows a range otherwise", () => {
    expect(intervalText({ summer: 7, winter: 7 })).toBe("Every 7 days");
    expect(intervalText({ summer: 7, winter: 14 })).toBe("Every 7–14 days");
  });
});

describe("relativeDay", () => {
  it("describes distance from today", () => {
    expect(relativeDay("2026-09-10", "2026-09-10")).toBe("today");
    expect(relativeDay("2026-09-09", "2026-09-10")).toBe("yesterday");
    expect(relativeDay("2026-09-03", "2026-09-10")).toBe("1 week ago");
    expect(relativeDay("2026-08-27", "2026-09-10")).toBe("2 weeks ago");
  });
});

describe("shortDate", () => {
  it("formats as 'Mon D'", () => {
    expect(shortDate("2026-09-03")).toBe("Sep 3");
  });
});
