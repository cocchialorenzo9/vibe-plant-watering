import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "./App";
import plants from "../public/data/plants.json";

const watering = {
  events: [
    { plantId: "monstera-deliciosa", date: "2026-09-03", loggedAt: "2026-09-03T08:00:00Z" },
  ],
  overrides: {},
};

beforeEach(() => {
  localStorage.clear();
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
});
