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
- The deterministic event key `<plantId>__<date>` is the `{plantId, date}`
  idempotency guarantee. Concurrent writers touch disjoint child paths, so
  there is no read-modify-write race on the tree.
- Live sync: the app subscribes with `onValue`, so a watering logged on one
  phone appears on the others within ~1s.
- The reminder Action reads `plantWatering.json` over the Firebase REST API and
  `PATCH`es `settings/lastRemindedOn` back. No token needed while the rules
  allow anonymous access to this subtree; `FIREBASE_DB_AUTH` is wired through
  for the day they don't.

Security rules (added to `database.rules.json` in the personal-site repo, which
owns rule deployment) scope `plantWatering` to public read/write — the same
posture as the site's existing `homeState` node — plus `.validate` shape
constraints so the subtree can't be repurposed as arbitrary storage.

## Consequences

- No second repo, no PAT on any device, no per-device setup, no commit noise.
- $0 — well inside the Spark free tier for a two-person plant log.
- One shared dependency with the personal site. A quota problem or project
  deletion there takes this app's watering data with it; the authored plant
  data (this repo) is unaffected.
- `plantWatering` is world-writable by anyone who learns the database URL.
  Acceptable at this scale and consistent with the existing `homeState` node;
  the validation rules limit the blast radius to "garble the plant log", which
  is recoverable.
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
