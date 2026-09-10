import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "./App";
import type { Plant } from "./domain/types";

// The shipped public/data/plants.json is empty (plants are added via Claude
// Code). These fixtures stand in for an authored plant so the populated
// dashboard and detail flow stay covered.
const monstera: Plant = {
  id: "monstera-deliciosa",
  nickname: "Monstera",
  location: "Living room window",
  species: {
    scientificName: "Monstera deliciosa",
    commonNames: ["Swiss cheese plant"],
    italianName: "Costola di Adamo",
    shortDescription: "A climbing evergreen aroid.",
    origin: "Tropical forests of southern Mexico and Central America.",
    curiosities: ["The fenestrations are thought to let light through to lower leaves."],
    toxicity: "Toxic to cats and dogs if ingested.",
    sources: [{ title: "Monstera deliciosa — Wikipedia", url: "https://en.wikipedia.org/wiki/Monstera_deliciosa" }],
  },
  care: {
    waterIntervalDays: { summer: 7, winter: 14 },
    light: "Bright indirect light.",
    idealTempC: [18, 27],
  },
  avatar: "avatars/monstera-deliciosa.png",
  addedOn: "2026-06-01",
};

const plants: Plant[] = [monstera];

const watering = {
  events: [
    { plantId: "monstera-deliciosa", date: "2026-09-03", loggedAt: "2026-09-03T08:00:00Z" },
  ],
  overrides: {},
};

beforeEach(() => {
  localStorage.clear();
  window.location.hash = ""; // HashRouter state leaks between tests otherwise
  vi.useFakeTimers({ shouldAdvanceTime: true, now: new Date("2026-09-10T12:00:00+02:00") });
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      const body = String(url).includes("plants.json") ? plants : watering;
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(body),
      } as Response);
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("App", () => {
  it("renders the dashboard with the plant list and due section", async () => {
    render(<App />);
    expect(await screen.findByText("My Plants")).toBeInTheDocument();
    // Monstera last watered Sep 3, summer interval 7 -> due Sep 10 (today).
    await waitFor(() =>
      expect(screen.getByText("Water today")).toBeInTheDocument(),
    );
    expect(screen.getByRole("link", { name: /Monstera/ })).toBeInTheDocument();
  });

  it("navigates to a plant detail and shows the water action", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    const link = await screen.findByRole("link", { name: /Monstera/ });
    await user.click(link);
    expect(
      await screen.findByRole("button", { name: /I watered this today/i }),
    ).toBeInTheDocument();
  });

  it("shows the empty state when there are no plants", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve(String(url).includes("plants.json") ? [] : watering),
      } as Response),
    );
    render(<App />);
    expect(await screen.findByText("No plants yet")).toBeInTheDocument();
  });
});
