import type { Plant } from "../domain/types";

/** Fetch the authored plant list committed to this (public) repo. */
export async function fetchPlants(signal?: AbortSignal): Promise<Plant[]> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/plants.json`, {
    signal,
  });
  if (!res.ok) {
    throw new Error(`Could not load plants (${res.status})`);
  }
  return (await res.json()) as Plant[];
}

export function plantAvatarUrl(plant: Plant): string {
  return `${import.meta.env.BASE_URL}${plant.avatar}`;
}
