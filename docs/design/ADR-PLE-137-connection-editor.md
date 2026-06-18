# ADR PLE-137 — Visual connection editor (writes `connections.yaml`)

**Status:** v1 implemented (connections), pending design-first visual sign-off (UXDesigner) and QA round-trip.
**Author:** CTO · **Date:** 2026-06-18 · **Builds on:** PLE-136 (YAML-first content), PLE-135 (board fast-follow).

## Context
PLE-136 made content data: the app loads `public/data/{nodes,lanes,connections}.yaml`
at runtime through a graceful-fail loader (`src/data/loader.ts` → `validateFile` +
`assembleBundle` in `src/data/schema.ts`). PLE-137 is the board-confirmed fast-follow:
a visual editor for **node connections** that persists to `connections.yaml` so a
commit/push rides the normal Vercel auto-deploy + refresh path.

## Decision

1. **Repo-local, dev-server-only editor — not on the live site.**
   The public deploy is a static Vercel SPA with **no backend and no auth**. A
   browser editor that writes the repo there would require either a serverless
   function holding a GitHub write token or a public unauthenticated write surface
   — both are security holes for a board-facing public site. The issue explicitly
   permits "in-app **(or repo-local)**". Data authors already have repo access (the
   PLE-135 workflow), so the editor lives under `npm run dev` at `/editor`, gated by
   `import.meta.env.DEV`. The prod build never reaches the route (dead branch) and
   the write endpoint is `apply:"serve"` → absent from production entirely.

2. **Persistence via a dev-only Vite middleware** (`scripts/editor-plugin.ts`):
   `POST /__editor/connections` → re-validates → writes `public/data/connections.yaml`
   **byte-compatibly with `scripts/gen-yaml.ts`** (same header + `stringify({lineWidth:0})`),
   so editor output and `npm run gen:yaml` output are identical → clean diffs.

3. **Validation parity by construction (the core AC).** Both client (`src/editor/validate.ts`,
   inline as you type) and server (the middleware, before writing disk) call the
   **literal loader functions** — `validateFile(connectionsFileSchema, …)` +
   `assembleBundle(…)`. No rule is re-implemented, so no path can produce YAML the
   loader would reject; the same located `{file, field, reason}` errors are surfaced.
   A bad save writes nothing (422); a good save returns `{ok, count}`.

## Workflow
`npm run dev` → open `/editor` → add/edit/delete connections (from/to node pickers,
kind enum, label) → fix any inline located errors → **Save** writes
`connections.yaml` → `git commit && git push` → Vercel auto-deploy → refresh reflects.

## Scope / follow-ups
- **v1 = connections only** (the issue's primary AC). Node + lane editing is the
  stated stretch — a clean extension: same middleware pattern + `nodesFileSchema` /
  `lanesFileSchema`, separate follow-up issue.
- The lazy `ConnectionEditor` chunk (~6.6 kB) is emitted by the prod build but is
  unreachable (DEV-gated route). Acceptable; can be fully tree-shaken later if desired.
- Path note: the issue title says `data/connections.yaml`; the real PLE-136 path is
  `public/data/connections.yaml`.

## Verification (this build)
- `npm test` → 118 passing (112 prior + 6 new parity/round-trip tests in
  `src/editor/validate.test.ts`).
- `npm run build` → green; editor isolated in its own chunk.
- Live dev-server smoke: valid write → `200 {ok,count:1}`, file rewritten in
  gen-yaml format; dangling endpoint and bad-enum payloads → `422` with the loader's
  exact located errors and **no disk write**.
