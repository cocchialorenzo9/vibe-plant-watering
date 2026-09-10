# 0002 — Watering events in a private repo, via the GitHub contents API

Status: accepted (with a planned migration)
Date: 2026-09-10

## Context

Watering events and per-plant schedule edits are mutable, written from phones by
1–2 household members, and read every evening by the reminder GitHub Action. The
static app (ADR 0001) has no backend to write them.

Options considered:

- **A. GitHub file in a repo, PAT in `localStorage`** — zero extra infra.
- **B. Cloudflare Worker + D1** — proper `POST /water` endpoint, no client token,
  SQL history; costs one more platform account and deploy pipeline.
- **C. Supabase / Firebase free tier** — heavier SDK, free tiers that sleep or
  expire.

## Decision

Go with **A for now**, hardened:

- Watering events live as a JSON file in a **separate private repo**
  (`plant-watering-data`), never in this public Pages repo.
- The app writes via the GitHub contents API using a **fine-grained PAT** scoped
  to `contents:write` on **only** that private data repo. The PAT is entered once
  in Settings and kept in `localStorage` per device.
- Concurrency is last-write-wins using the blob SHA; on a 409 the app refetches
  and retries.
- The reminder Action reads the data repo with its own repo secret.

## Why not B yet

B is the right long-term home. A is chosen now only because it is genuinely
zero-infra and the stakes are low. A leaked PAT can only garble a private JSON
file with no Pages/Actions/secrets attached to it; the log can be regenerated.

## Planned migration to B

Migrate to a Cloudflare Worker + D1 when any of:

- a second consumer of the watering data appears (beyond the app and the Action),
- concurrent writes actually cause lost updates in practice,
- write authentication / per-user attribution becomes necessary,
- commit noise on the data repo becomes annoying.

The app's data access is to be isolated behind a single module so this swap
touches one file.

## Consequences

- Two repos: this one (public, static app + authored plant data) and
  `plant-watering-data` (private, watering log).
- A PAT lives in `localStorage` on each phone — documented low-stakes risk.
- No monthly cost, no extra platform until the migration.
