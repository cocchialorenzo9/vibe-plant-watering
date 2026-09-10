# Plant Watering Tracker

A mobile-first PWA that keeps a household's houseplants watered. Plant identity
and care notes are researched and committed by Claude Code; the deployed app is
static and read-mostly.

- **Design source of truth:** `design.pen` (open with the Pencil editor).
- **Domain glossary & decisions:** `CONTEXT.md`, `docs/adr/`.

## Architecture (see ADR 0001 / 0002)

| Concern | Where |
|---|---|
| App | Static SPA (Vite + React), GitHub Pages, hash routing |
| Plants, species, care, avatars | Committed JSON + PNGs in `public/` (this public repo) |
| Watering events + schedule overrides + reminder toggle | JSON file in a **separate private repo**, written from the app via the GitHub contents API with a fine-grained PAT stored in the browser |
| 7pm reminder email | Scheduled GitHub Action → `scripts/send-reminder.mjs` → Resend |
| Adding a plant | Claude Code phone app: photo/name → web search → avatar → commit |

## Develop

```bash
npm install
npm run dev        # http://localhost:5173/vibe-plant-watering/
npm test
npm run typecheck
npm run build
```

Without a configured PAT the app uses a local (localStorage) watering store
seeded from `public/data/watering.example.json`, so it is fully usable offline
of GitHub for development and demoing.

## Deploy

1. Push to `main` → `.github/workflows/deploy.yml` builds and publishes to Pages.
   Set **Settings → Pages → Source = GitHub Actions**.
2. Create a **private** repo `plant-watering-data` containing `watering.json`:
   ```json
   { "events": [], "overrides": {} }
   ```
3. In the app's **Settings → Connection**, enter the repo owner, `plant-watering-data`,
   and a fine-grained PAT with **Contents: Read and write** scoped to that repo only.
4. For the reminder, add repo secrets: `DATA_TOKEN` (contents:read on the data
   repo), `DATA_OWNER`, `DATA_REPO`, `RESEND_API_KEY`, `REMINDER_TO`; optional
   repo variables `REMINDER_FROM`, `APP_URL`, `DATA_PATH`.
   Test it with **Actions → Evening watering reminder → Run workflow** (dry run).

## Adding a plant (Claude Code)

In the Claude Code app: *"add a new plant"*, then send a photo or type a name.
Claude identifies the species from Wikipedia / Wikispecies, writes a record into
`public/data/plants.json`, generates a minimal avatar into `public/avatars/`,
and commits. The plant appears after the Pages redeploy.

## Known follow-ups

- App icons are SVG only (`public/icon.svg`); generate PNG `icon-192/512` for
  full iOS home-screen fidelity.
- Migrate the watering store to a Cloudflare Worker + D1 (ADR 0002) to remove
  the client-side PAT.
