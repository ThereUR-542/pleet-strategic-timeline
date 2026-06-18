# Pleet LLC — Interactive Strategic Timeline

A premium, glassmorphic dark **"Liquid Glass"** interactive web timeline that proves
3D-printed-structure demand grew from ≈0 (Jan 2026) to significant/compounding by
Jun 17 2026 — forcing the scaling of printer manufacturing to Oklahoma.

It is a **strategic persuasion instrument**, not a chronological list.

> **Source of truth:** PRD *Timeline For SQ4D (v13)* (PLE-77). This repo implements
> it. All demand numbers are **theoretical / illustrative** (§6) — not audited fact.

## Stack (PRD §10)

React SPA (Vite + TypeScript) · custom SVG/Canvas renderer (D3 scales) · PDF.js ·
Google Maps Embed API · youtube-nocookie · Vitest for the §6 dual-verification.

## Layout

```
src/
  data/types.ts      §7 canonical data model — the shared contract
  data/content.ts    §8 reconciled chronology (placeholder, config-driven) + §6 model
  lib/demand.ts      §6 demand math + algebra/Simpson dual verification
  lib/demand.test.ts §6.4 unit tests asserting |Δ| ≤ 1e-4
  lib/temporal.ts    §4.7 live "Today" marker + derived temporal state
  App.tsx            foundation shell (replaced by the dual-orientation renderer)
```

## Scripts

```bash
npm install
npm test        # §6.4 dual-verification unit tests
npm run dev     # local preview
npm run build   # production build (Vercel)
```

## Content is data, not code

Swapping in Lawrence's real assets/methodology is a change to `src/data/content.ts`
(and asset URLs) plus the §6 model parameters — **not** a rebuild (§6.4). Every node
carries a `confidence` flag; unconfirmed facts render "pending verification" (§12).

## Deployment

Vercel (static SPA). Default to an unguessable preview URL until the access model
is confirmed (§11/§12).

**Quick start:** Use `NODE_ENV=development npm install --include=dev --cache /tmp/npm-cache-ple78` to install (shared npm cache is permission-locked). Then `npm test` + `npm run build`. See [scripts/DEPLOYMENT.md](scripts/DEPLOYMENT.md) for full deployment docs, access gating, and Vercel SSO setup.
