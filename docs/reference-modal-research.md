# Reference detail-modal research — zoho-map.vercel.app (PLE-92)

Captured 2026-06-18 via headless Chromium + puppeteer-core, per Lawrence's board
direction: *"I demand the modals of https://zoho-map.vercel.app/ … view the
modals and examine the code thereof … I want more detail."* The reference is a
Next.js + React Flow app. This documents exactly how its detail view works so we
can match it. (Design spec/mockup is owned by the UXDesigner under the
design-first gate; this is the underlying engineering research.)

## How detail is triggered
- **On HOVER** of a node (the header literally says "hover any node for details"),
  not click. Instant, no modal-over-busy-background.
- The card is a `<div role="tooltip" data-hover-modal="<nodeId>">`.

## Detail card — structure (top to bottom)
1. `<header>`: `<h2>` **title** (16px / 600 / `--text-hi`) + a small **phase/category
   tag** line (11px / 500 / letter-spacing 0.04em / `--text-low`), e.g. "Phase 1 ·
   Email Ingestion & Analysis".
2. `<p>` **description** paragraph (13px / line-height 1.55 / `--text-mid`).
3. `<ul>` **bulleted key-facts list** (12.5px / line-height 1.5) — the concrete
   specifics for that node (e.g. Sender / All recipients / Message content / Attachments).
4. `<footer>` **citation/reference** line (11px / `--text-low`) with a top border
   separator, e.g. "PRD §1 — Email Ingestion & Analysis".

## Detail card — styling
- `position: fixed; left: 16px; width: 340px; max-height: 420px; overflow-y: auto;
  z-index: 50;` — docked to the screen's left edge, scrolls if long, never covers
  the graph center.
- Glassmorphic: `background: var(--glass-bg); backdrop-filter: var(--blur-modal)`
  (measured ~`blur(28px) saturate(1.8)`).
- `border-top: 2px solid var(--phase-color)` — a colored top border keyed to the
  node's phase/type. `border-radius: var(--radius-modal)` (~20px).
- `box-shadow: var(--shadow-modal), var(--glass-highlight)`.
- Enter animation: `animation: modal-in 120ms ease-out` (subtle slide/fade in).

## Node card (for reference)
- `react-flow__node-<type>` (types: appStep, decision, asset, escalation, plus
  phaseBand stage groupers). Inner `.glass-node`: 220×96, `border-radius: 36px`
  (pill), flex column centered.
- Content: **eyebrow** (9px uppercase, phase color via `color-mix`), **title**
  (12.5px / 600, ellipsis), **subtitle** one-liner (10.5px / `--text-mid`, ellipsis).
- Glass fill + a colored top border by phase. (Glass is fine here — the board's
  earlier rejection was about STACKING/clutter, not glass itself.)

## Gap vs. our current build (v4)
- Ours opens detail on **click** in a docked right side-panel. Reference is **hover**,
  left-docked, glassy, animated, phase-bordered.
- Ours shows prose body + media + citations. Reference adds a scannable **bulleted
  key-facts list** and a compact **footer citation** — this is the "more detail,
  more impressive" the board is asking for.

## Recommendation (for the UXDesigner's spec → my implementation)
1. Add a **hover detail card** (in addition to / replacing click) matching the
   reference: title → type·thread·date tag → summary paragraph → **bulleted
   key-facts** → footer source line. Glassy, type-colored top border, `modal-in`
   animation, fixed left-dock, scroll-on-overflow.
2. Enrich content so each node has a few **key-fact bullets** (we have `summary`,
   `bodyMd`, `demandScore`, `confidence`, citations to derive them from; may want a
   `keyFacts: string[]` on the node model).
3. Keep the click → full docked panel for deep detail (media, full Works Cited).
4. Honor the hard constraint: card is its own surface, never stacked over a busy
   background.

Data needed from content: short per-node key-facts. Can be derived initially from
existing fields; richer facts are a content task (Backend/§7), not a blocker for
the visual pattern.
