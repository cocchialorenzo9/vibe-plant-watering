/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages project site is served from /<repo>/.
// Override with BASE_PATH env when the repo name differs.
const base = process.env.BASE_PATH ?? "/vibe-plant-watering/";

export default defineConfig({
  base,
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // Force the local backend in tests regardless of any .env.local key.
    env: { VITE_FIREBASE_API_KEY: "" },
  },
});
