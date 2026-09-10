import { describe, it, expect, beforeEach } from "vitest";
import { getWateringBackend } from "./watering";
import type { AppConfig } from "./config";

const cfg: AppConfig = {
  token: "",
  owner: "",
  repo: "",
  path: "watering.json",
  reminderEnabled: true,
};

beforeEach(() => {
  localStorage.clear();
  // Avoid the example-file fetch in jsdom.
  localStorage.setItem("pw:watering", JSON.stringify({ events: [], overrides: {} }));
});

describe("LocalBackend", () => {
  it("is selected when there is no GitHub config", () => {
    expect(getWateringBackend(cfg).kind).toBe("local");
  });

  it("dedupes a repeated {plantId, date} watering", async () => {
    const b = getWateringBackend(cfg);
    await b.addEvents([
      { plantId: "monstera", date: "2026-09-10", loggedAt: "2026-09-10T18:00:00Z" },
    ]);
    const data = await b.addEvents([
      { plantId: "monstera", date: "2026-09-10", loggedAt: "2026-09-10T18:05:00Z" },
    ]);
    expect(data.events).toHaveLength(1);
    expect(data.events[0].loggedAt).toBe("2026-09-10T18:00:00Z");
  });

  it("keeps events for different plants and dates", async () => {
    const b = getWateringBackend(cfg);
    await b.addEvents([
      { plantId: "monstera", date: "2026-09-10", loggedAt: "a" },
      { plantId: "aloe", date: "2026-09-10", loggedAt: "b" },
    ]);
    const data = await b.addEvents([
      { plantId: "monstera", date: "2026-09-17", loggedAt: "c" },
    ]);
    expect(data.events).toHaveLength(3);
  });

  it("stores household settings for the reminder job", async () => {
    const b = getWateringBackend(cfg);
    const data = await b.setSettings({ reminderEnabled: false });
    expect(data.settings).toEqual({ reminderEnabled: false });
  });

  it("replaces a plant override", async () => {
    const b = getWateringBackend(cfg);
    const data = await b.setOverride("monstera", {
      intervalOverride: { summer: 5, winter: 9 },
    });
    expect(data.overrides.monstera.intervalOverride).toEqual({
      summer: 5,
      winter: 9,
    });
  });
});
