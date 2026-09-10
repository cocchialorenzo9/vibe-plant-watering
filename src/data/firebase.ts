import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getDatabase, type Database } from "firebase/database";
import { getAuth, signInAnonymously } from "firebase/auth";

/**
 * Shared Firebase project, reused from the personal-site project
 * (`personal-website-abda6`). The watering log lives under a single top-level
 * key; see ADR 0002. Only the API key is environment-provided — a Firebase web
 * API key is a project identifier, not a secret. The `plantWatering` subtree
 * requires an authenticated caller (`auth != null`); the app signs in
 * anonymously, which is enough to satisfy the rules without any login UI.
 */
const DATABASE_URL =
  "https://personal-website-abda6-default-rtdb.europe-west1.firebasedatabase.app";
const PROJECT_ID = "personal-website-abda6";

/** Top-level key holding this app's entire mutable state. */
export const WATERING_PATH = "plantWatering";

let cached: Database | null = null;
let authPromise: Promise<unknown> | null = null;

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
    initializeApp({ apiKey, databaseURL: DATABASE_URL, projectId: PROJECT_ID });
  cached = getDatabase(app);
  authPromise = signInAnonymously(getAuth(app)).catch((err) => {
    // Surfaced later as a load/listener error; log so it is not fully silent.
    console.error("Firebase anonymous sign-in failed", err);
  });
  return cached;
}

/** Resolves once the anonymous sign-in has settled (or immediately if none). */
export function authReady(): Promise<unknown> {
  return authPromise ?? Promise.resolve();
}
