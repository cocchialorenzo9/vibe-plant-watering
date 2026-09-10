# 0001 — Static PWA with Claude-authored plant content

Status: accepted
Date: 2026-09-10

## Context

The app needs AI plant identification, care research, minimal-avatar generation,
web search, shared storage, and a 7pm reminder email. The owner has a Claude Pro
subscription (which is **not** API access) and wants to deploy on GitHub Pages in
a personal projects space, at no monthly cost.

GitHub Pages serves static files only: no server, no cron, no secret keys. Paying
per-call for the Anthropic API and running a serverless proxy to hide the key was
the alternative.

## Decision

The deployed app is a **static PWA on GitHub Pages**. All "AI" work happens at
**authoring time inside the Claude Code phone app**, not at app runtime:

- Registering a plant is done by the owner in a Claude Code session — upload a
  photo or give a name, Claude web-searches Wikipedia / Wikispecies, resolves the
  species, researches origin/curiosities/sources, iterates on the avatar, writes
  the plant record, commits and pushes. Pages redeploys.
- Plant records, care info and avatar PNGs are committed static assets in this
  (public) repo.
- The only runtime-mutable data is watering events (see ADR 0002).
- The 7pm reminder runs as a scheduled GitHub Action.

## Consequences

- $0/month. No API keys anywhere in the deployed system.
- Adding a plant is not self-service — it needs the owner plus a Claude Code
  session. Acceptable: plants are added rarely, by one household.
- Identification quality is full Claude, not a metered API budget.
- The design's in-app "Add plant" and "Identify plant" screens are dropped as
  interactive flows; "About this plant" remains as a read-only view.
- If self-service registration is ever required, this decision must be revisited
  (it forces a backend with an API key).
