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
                     (Person model addendum: docs/prd-7-data-model-person.md)
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

## Deployment — one-click Vercel import

This repo is a static client-side SPA and is ready to import into Vercel as-is.
`vercel.json` already pins every setting below (including the SPA rewrite so deep
links don't 404), so the dashboard fields are auto-detected — just click through.

| Vercel setting     | Value           |
| ------------------ | --------------- |
| Framework Preset   | **Vite**        |
| Install Command     | `npm install`   |
| Build Command      | `npm run build` |
| Output Directory   | `dist`          |
| Node.js Version    | 18.x or 20.x    |

**Import steps:** Vercel → *Add New… → Project* → import this GitHub repo →
the fields above are detected from `vercel.json` → **Deploy**. No env vars
required for the v1 build.

A clean clone builds with the exact commands Vercel runs:

```bash
npm ci          # installs deps incl. devDeps (vite/tsc) — required to build
npm run build   # tsc -b && vite build  →  dist/
```

> **Note (agent build environment only):** the `--cache /tmp/npm-cache-ple78`
> install flag in [scripts/DEPLOYMENT.md](scripts/DEPLOYMENT.md) is specific to
> this CI sandbox's permission-locked cache. It is **not** needed on Vercel or a
> normal machine — a plain `npm install` / `npm ci` works there.

See [scripts/DEPLOYMENT.md](scripts/DEPLOYMENT.md) for access gating and Vercel
SSO notes. Until the access model is confirmed (§11/§12), keep the deployment on
an unguessable preview URL.
