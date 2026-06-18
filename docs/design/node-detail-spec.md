# Design spec — Node detail experience (zoho-map parity) · PLE-101 / PLE-92

**Owner:** UXDesigner (design-first gate, PLE-94). **Status:** awaiting board direction-check.
**Mockup:** [`docs/design/node-detail-mockup.html`](./node-detail-mockup.html) — open in any browser; renders both viewports.
**Source research:** [`docs/reference-modal-research.md`](../reference-modal-research.md) (Eng Lead, commit `283bf2b`).

> Board ask (Lawrence, 2026-06-18): structure accepted, **detail depth rejected** — *"I demand the
> modals of zoho-map… I want more detail."* This spec closes the depth gap **without** breaking the
> hard constraint.

---

## 1. Hard constraint (non-negotiable)

**Nothing stacked over the busy graph.** Detail is a **docked surface**, never a card floating mid-canvas.
This is also what the reference actually does — its "modal" is a docked, edge-pinned card (confirmed in the
research doc), not an overlay. We honor it on both viewports:

- **Desktop:** detail opens in its **own column** beside the canvas. The canvas *resizes* to make room
  (flex layout) — zero overlap. This is already how `DetailPanel` works today; we keep it.
- **Mobile:** detail is a **bottom sheet** (platform-conventional — iOS/Material). The graph is **dimmed +
  lightly blurred** behind it so it reads as quieted background, not a competing surface. This is *not* the
  rejected pattern (a small card floating over a live, busy graph); it's a standard sheet over a backgrounded
  view. Jakob's Law — users already know this gesture.

---

## 2. What changes vs. today (the "more detail" delta)

Today's docked panel = type dot + title + meta line + prose body + media + Works Cited. The reference adds
**scannability and specificity**. Four additions, in priority order:

| # | Addition | Why (board) | Lens |
|---|----------|-------------|------|
| 1 | **Key-facts list** (bulleted, type-colored markers) | THE core "more detail" — scannable specifics, not just prose | Chunking · F-pattern · Recognition-over-recall |
| 2 | **Type/phase tag pill** (eyebrow) replacing plain meta text | instantly classifies the node; reference parity | Von Restorff · Similarity |
| 3 | **Type-keyed 2px top border** on the panel | color-codes type at the surface level, matches reference | Mapping · Similarity to node color |
| 4 | **Compact footer citation** (sticky, top-bordered) | reference's footer source line; keeps full Works Cited in scroll | Serial position (recency) · Peak-End |

Optional **delighter** (phase 2, not blocking): a **Connections** row of EdgeKind-colored chips naming linked
nodes — turns the panel into a graph-navigation affordance (Zeigarnik / goal-gradient: invites exploration).

---

## 3. Anatomy (top → bottom)

Wrapper: `<aside class="detail-panel" role="complementary">`, **type-keyed `border-top: 2px solid`**.

1. **Header** — `padding: --space-5 --space-5 --space-4`; `border-bottom: 1px solid rgba(255,255,255,.08)`.
   - **Tag pill** — `NODE_TYPE_LABEL · threadLabel`. `--text-2xs` / `--fw-semibold` / `letter-spacing .06em` /
     uppercase; color = `NODE_COLOR[type]`; bg = `color-mix(in srgb, NODE_COLOR 14%, transparent)`;
     `border-radius: --radius-chip`; 6px leading dot in the type color.
   - **Title** `<h2>` — `--text-2xl` / `--fw-bold` / `--leading-tight` / `--text-hi`; `margin-top: --space-2-5`;
     right-padded `--space-7` to clear the close button.
   - **Meta line** — date (`--text-xs` / `--text-low` / tabular-nums) + a **temporal-state chip**
     (`past` / `Today` / `projected`, §4.7). `Today` chip = solid `--node-project` on dark text (Von Restorff).
   - **Close ✕** — absolute top-right, **32px box / ≥44px effective hit area**, `Esc` also closes
     (Fitts's Law · WCAG 2.5.5 target size · Shneiderman "easy reversal").
2. **Scroll body** — `flex:1; overflow-y:auto; padding: --space-4 --space-5 --space-7`.
   - **Status chips** (conditional): unconfirmed → amber "Pending verification (§12)"; theoretical demand →
     green "THEORETICAL demand score: N/100". `--text-sm`, `--radius-md`. (Honest framing — no false certainty.)
   - **Description** — `node.bodyMd` paragraphs. `--text-md` / `--leading-relaxed` / `--text-mid`; `<strong>`
     lifts to `--text-hi`. Inverted pyramid: lede first.
   - **Key facts** — section label (`--text-xs` uppercase `.08em` `--text-low`) + `<ul>` with custom
     type-colored dot markers. Each item `--text-sm` / `--leading-normal`; optional `key:` in `--text-low`,
     value in `--text-hi`. **3–6 bullets** (Miller's Law — stay scannable). Gap `--space-2`.
   - **Connections** *(phase 2)* — label + wrap of chips; each `<EdgeKind label> → <node title>`, relation word
     colored by `EDGE_COLOR[kind]`. `--text-xs`, `--radius-chip`.
   - **Media** — existing `MediaEmbed`; `--radius-md`, `margin-top: --space-4`.
3. **Footer** — `flex:0 0 auto; border-top; padding: --space-3 --space-5`. Compact source line
   `--text-xs --text-low`: `Source: <primary citation> · Works Cited (N)` — the count links to the full
   Works Cited (kept in scroll body / existing CitationsPanel). Sticks to the bottom edge.

---

## 4. Tokens (all PLE-99 / flowTheme — no inline values)

- **Spacing:** `--space-1 … --space-7` only. Header `--space-5/-4`; body gaps `--space-2/-3`; section
  label top `--space-4-5`.
- **Type:** sizes `--text-2xs … --text-2xl`; weights `--fw-medium/-semibold/-bold`; leading
  `--leading-tight/-normal/-relaxed`. Two weights + ~4 sizes per the system bar.
- **Color per NodeType** (`flowTheme.NODE_COLOR`): person `#6ea8ff` · project `#57e0a8` · event `#f59e0b` ·
  concept `#c084fc`. Drives: top border, tag, bullet markers, demand chip.
- **Color per EdgeKind** (`flowTheme.EDGE_COLOR`): finances `#f59e0b` · owns `#6ea8ff` · converges_on
  `#a78bfa` · partners `#4ade80` · etc. Drives connection-chip relation words.
- **Motion:** reuse `detail-in` (180ms, slide 16px + fade). No per-item stagger (gimmick, not signal).
  `@media (prefers-reduced-motion: reduce)` → none. Doherty (<400ms) honored.

### System proposals (call out to design-system owner / Eng Lead — don't inline)

1. **Semantic text tokens** — replace the scattered hex in `flow.css` (`#d7dde9`, `#8b94a7`) with
   `--text-hi:#f4f6fb` / `--text-mid:#d7dde9` / `--text-low:#8b94a7`. Reused everywhere the panel sets color.
2. **Radii tokens** — `--radius-md:10px` (chips/notes/media), `--radius-chip:999px` (pills),
   `--radius-panel:20px` (mobile sheet top corners). Replaces `border-radius:8px/10px` literals.
3. **Data-model:** add `keyFacts: string[]` to `TimelineNode` (`src/data/types.ts`). **Non-blocking** —
   initial facts derive from existing fields (decision from `summary`, owner/people from `bodyMd` bolds,
   thread, demandScore, confidence). Richer curated facts are a Backend/§7 content task, not a render blocker.

---

## 5. States (all get the same care — visual bar)

- **Empty / no selection:** panel column collapsed; canvas full-width (no empty shell).
- **Unconfirmed:** amber "Pending verification (§12)" chip; body framed as illustrative.
- **No media / no citations:** sections simply omitted — no empty headers, no "N/A".
- **Long content:** body scrolls; header + footer stay pinned (sticky source line = Peak-End recency).
- **Reduced motion / reduced transparency:** animation off; solid panel (already solid — no glass on the dock).

## 6. Accessibility

`role="complementary"`, `aria-label="Details: <title>"`. Type is never color-only — tag pill carries the type
**word** + thread (color-independence, WCAG 1.4.1). Body text `--text-mid` on `--panel` ≥ 4.5:1; muted
`--text-low` reserved for ≥`--text-sm` non-essential labels. Close reachable by `Esc` + visible focus ring.
Hit targets ≥44px. Mobile sheet scrolls within the sheet; background inert.

## 7. Acceptance criteria (for the eng build issue, post-approval)

1. Detail renders **docked** (desktop column / mobile bottom sheet) — **never overlaps a live graph**. ✔ at 1440×900 + 390×844.
2. Anatomy present in order: type border → tag pill → title → meta+state chip → status chips → description →
   **key facts** → connections (phase 2) → media → footer source line.
3. All spacing/type from PLE-99 tokens; all type/edge color from `flowTheme`. No inline px/hex (lint-greppable).
4. `keyFacts` rendered (derived fallback acceptable for v1); 3–6 bullets; type-colored markers.
5. Reduced-motion + reduced-transparency honored; contrast + target sizes pass.
6. Visual-truth render evidence attached at both viewports before the build ticket is called done.
