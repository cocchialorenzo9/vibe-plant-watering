import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getDatabase, type Database } from "firebase/database";

/**
 * Shared Firebase Realtime Database, reused from the personal-site project
 * (`personal-website-abda6`). The watering log lives under a single top-level
 * key; see ADR 0002. Only the API key is environment-provided — a Firebase web
 * API key is a project identifier, not a secret; access is governed by the
 * database security rules (`database.rules.json` in the personal-site repo).
 */
const DATABASE_URL =
  "https://personal-website-abda6-default-rtdb.europe-west1.firebasedatabase.app";

/** Top-level key holding this app's entire mutable state. */
export const WATERING_PATH = "plantWatering";

let cached: Database | null = null;

export function firebaseConfigured(): boolean {
  return Boolean(import.meta.env.VITE_FIREBASE_API_KEY);
}

/** The Realtime Database handle, or null when no API key is configured. */
export function getDb(): Database | null {
  if (cached) return cached;
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  if (!apiKey) return null;
  const app: FirebaseApp =
    getApps()[0] ??
    initializeApp({
      apiKey,
      databaseURL: DATABASE_URL,
      projectId: "personal-website-abda6",
    });
  cached = getDatabase(app);
  return cached;
}
