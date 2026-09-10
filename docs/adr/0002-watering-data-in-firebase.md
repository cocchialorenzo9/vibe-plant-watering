# 0002 — Watering data in the shared Firebase Realtime Database

Status: accepted
Date: 2026-09-10 (revised same day — see "Earlier draft" below)

## Context

Watering events, per-plant schedule overrides and the reminder toggle are
mutable, written from phones by 1–2 household members, and read every evening by
the reminder GitHub Action. The static app (ADR 0001) has no backend of its own.

The owner already runs a **Firebase Realtime Database** for the personal site
(`personal-website-abda6`, region `europe-west1`), on the free Spark plan, with
the exact pattern this app needs: the browser reads and writes a JSON subtree
directly with the Firebase web SDK, and access is governed by database security
rules rather than a client-held secret.

## Decision

Store all mutable state under a single top-level key, `plantWatering`, in that
existing database:

```
plantWatering/
  events/<plantId>__<date>: { plantId, date, loggedAt }
  overrides/<plantId>:      { intervalOverride?, nextDueAnchor? }
  settings:                 { reminderEnabled, lastRemindedOn? }
```

- The app writes straight from the browser. The only environment input is the
  Firebase **web API key** (`VITE_FIREBASE_API_KEY`), which is a project
  identifier, not a credential — it ships in the JS bundle by design.
- The `plantWatering` subtree requires `auth != null`. The app calls
  `signInAnonymously` on start — no login UI, just enough identity to satisfy
  the rules and to stop a passer-by with the database URL from writing.
- The deterministic event key `<plantId>__<date>` is the `{plantId, date}`
  idempotency guarantee. Concurrent writers touch disjoint child paths, so
  there is no read-modify-write race on the tree.
- Live sync: the app subscribes with `onValue` (after the anon sign-in
  settles), so a watering logged on one phone appears on the others in ~1s.
- The reminder Action mints a short-lived anonymous ID token from the web API
  key (`identitytoolkit` REST), reads `plantWatering.json` over the Firebase
  REST API with `?auth=`, and `PATCH`es `settings/lastRemindedOn` back.
  `FIREBASE_DB_AUTH` can supply a pre-minted token instead.

Security rules (added to `database.rules.json` in the personal-site repo, which
owns rule deployment) scope `plantWatering` to `auth != null` read/write, plus
`.validate` shape constraints so the subtree can't be repurposed as arbitrary
storage. This needs the Anonymous provider enabled on the project — a
project-wide setting shared with the personal site, which was fine to turn on.

## Consequences

- No second repo, no PAT on any device, no per-device setup, no commit noise.
- $0 — well inside the Spark free tier for a two-person plant log.
- One shared dependency with the personal site. A quota problem or project
  deletion there takes this app's watering data with it; the authored plant
  data (this repo) is unaffected.
- `plantWatering` is writable by any authenticated caller, and anonymous
  sign-in is open, so the door is "anyone who loads the app or mints a token",
  not truly locked — but it does stop drive-by writes with just the URL, and
  the validation rules cap the blast radius at "garble the plant log", which is
  recoverable.
- Anonymous auth accrues throwaway user records (no automatic cleanup);
  negligible at this scale, well inside the free 50k MAU.
- Data access stays isolated in `src/data/watering.ts` + `src/data/firebase.ts`
  (`getWateringBackend()` returns the Firebase backend or a local fallback), so
  a future move to Firestore, a Worker + D1, or a dedicated project is a
  one-module change.

## Earlier draft

The first version of this ADR proposed a separate **private GitHub repo**
(`plant-watering-data`) written via the contents API with a fine-grained PAT
kept in `localStorage`, migrating to a Cloudflare Worker + D1 later. It was
replaced before any of it shipped, once it was clear the personal-site Firebase
project already solved the same problem with no client secret and no extra
infrastructure.
