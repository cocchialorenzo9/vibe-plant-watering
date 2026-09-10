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
| Plants, species, care, avatars | Committed JSON + images in `public/` (this public repo) |
| Watering events + overrides + reminder toggle | `plantWatering` subtree of the **shared Firebase Realtime Database** reused from the personal-site project; browser reads/writes it directly, no client secret |
| 7pm reminder email | Scheduled GitHub Action → `scripts/send-reminder.mjs` → Firebase REST → Resend |
| Adding a plant | Claude Code phone app: photo/name → web search → avatar → commit |

## Develop

```bash
npm install
npm run dev        # http://localhost:5173/vibe-plant-watering/
npm test
npm run typecheck
npm run build
```

With no `VITE_FIREBASE_API_KEY` set, the app uses a local (localStorage)
watering store seeded from `public/data/watering.example.json` — fully usable
for development and demoing. Set the key in `.env.local` (see `.env.example`) to
talk to the real shared database.

## Deploy

1. **Pages:** push to `main` → `.github/workflows/deploy.yml` builds and
   publishes. Set **Settings → Pages → Source = GitHub Actions**.
2. **Firebase key:** add repo secret `VITE_FIREBASE_API_KEY` — the same web API
   key the personal site uses (`FIREBASE_API_KEY` in that repo's `.env`). It is
   a project identifier, not a credential.
3. **Database rules:** in the **personal-site repo** (which owns rule
   deployment), add the `plantWatering` block from `firebase.rules.snippet.json`
   to `database.rules.json`, then `firebase deploy --only database` — or paste
   it in the Firebase console under **Realtime Database → Rules → Publish**.
   This is the only manual Firebase step.
4. **Reminder:** add repo secret `RESEND_API_KEY` and `REMINDER_TO`, and repo
   variable `FIREBASE_DB_URL`
   (`https://personal-website-abda6-default-rtdb.europe-west1.firebasedatabase.app`);
   optional variables `REMINDER_FROM`, `APP_URL`, and secret `FIREBASE_DB_AUTH`
   (only if the rules later require auth). Test with **Actions → Evening
   watering reminder → Run workflow** (dry run). The job fires hourly 16–21 UTC,
   acts only during the Berlin evening, and emails at most once per day.

## Adding a plant (Claude Code)

In the Claude Code app: *"add a new plant"*, then send a photo or type a name.
Claude identifies the species from Wikipedia / Wikispecies, writes a record into
`public/data/plants.json`, generates a minimal avatar into `public/avatars/`,
and commits. The plant appears after the Pages redeploy.

## Known follow-ups

- App icons are SVG only (`public/icon.svg`); generate PNG `icon-192/512` for
  full iOS home-screen fidelity.
- The watering store shares the personal-site Firebase project. Move it to its
  own project (or Firestore) if the coupling ever bites — `getWateringBackend()`
  in `src/data/watering.ts` is the single swap point (ADR 0002).
