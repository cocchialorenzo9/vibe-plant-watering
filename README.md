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
3. **Firebase console (one-time):**
   - **Authentication → Sign-in method → Anonymous → Enable.** The `plantWatering`
     rules require `auth != null`; the app signs in anonymously.
   - **Database rules:** in the **personal-site repo** (which owns rule
     deployment), add the `plantWatering` block from `firebase.rules.snippet.json`
     to `database.rules.json`, then `firebase deploy --only database` — or paste
     it under **Realtime Database → Rules → Publish**.
4. **Reminder:** add repo secrets `RESEND_API_KEY`, `REMINDER_TO`
   (`cocchialorenzo@gmail.com`), and `VITE_FIREBASE_API_KEY` (reused by the
   script to mint an anon token); repo variable `FIREBASE_DB_URL`
   (`https://personal-website-abda6-default-rtdb.europe-west1.firebasedatabase.app`);
   optional variables `REMINDER_FROM`, `APP_URL`, and secret `FIREBASE_DB_AUTH`
   (a pre-minted token, skips the anon sign-in). Test with **Actions → Evening
   watering reminder → Run workflow** (dry run). The job fires hourly 16–21 UTC,
   acts only during the Berlin evening, and emails at most once per day.

   `REMINDER_FROM` defaults to `onboarding@resend.dev` (works with no setup,
   Resend test mode only delivers to your own account address). To send as
   `Plant Watering <noreply@vibewatering.dev>`, you must own `vibewatering.dev`,
   add it under **Resend → Domains**, and publish the SPF/DKIM/DMARC DNS records
   it gives you; then set the `REMINDER_FROM` variable to that address.

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
