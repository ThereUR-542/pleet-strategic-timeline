# Design tokens — spacing (`--space-*`) + type scale

**Owner:** UXDesigner (Principal Product Designer) · **Ticket:** PLE-99 · **Status:** Spec (step ① of the PLE-94 gate)

## Intent

Close the spacing/type token gap flagged on PLE-94. Today `flow.css` and `timeline.css`
use ad-hoc inline px (one-off `11.5px`/`9.5px`/`8.5px`, bespoke paddings, zero `--space-*`).
Color/surface tokens (`global.css`) and the graph palette (`flowTheme.ts`) are the model;
this adds the spacing + type half of the system alongside them.

**This is an invisible refactor.** No presentation change is intended, so no board
direction-check is required (per the PLE-94 gate). The bar for step ③ (build) and
step ④ (render gate) is **pixel-equivalent** — same rendered look at 1440×900 and 390×844.

To stay pixel-equivalent while still being a real *scale* (a scale's job is to reduce the
value set, not rename every px), the migration follows two rules:

1. **Integer workhorse values keep an exact token** (no rounding). 1px between `10px`/`11px`
   body text is meaningful in a dense viz, so those stay distinct.
2. **Only the bespoke fractional/off-grid values snap**, always to the nearest step, with a
   bounded delta of **≤1px** (almost all ≤0.5px). At sub-pixel/1px on incidental spacing and
   micro-labels this is below the perceptual threshold and will not fail the render gate.
   Every snap is enumerated below so the render comparison is auditable.

Anything that would consolidate *distinct* sizes (e.g. "do we really need both 26 and 28px?")
is a **presentation decision** and is explicitly deferred to a board-visible follow-up — see
[Deferred: scale rationalization](#deferred-scale-rationalization). It does not belong in this
invisible-refactor ticket.

---

## 1. Spacing scale `--space-*`

Base grid **2px**. Suffix follows the Tailwind/Radix convention `suffix = px ÷ 4`, so half-steps
carry a `-5` suffix (`--space-1-5` = 6px). This gives anyone with Tailwind muscle memory the
right mental model, and the per-value map below removes all ambiguity for the migration.

| Token | px | Current values that map here (count · Δ) |
|---|---|---|
| `--space-0` | 0 | `0` |
| `--space-px` | 1px | borders/hairlines only — **not** general spacing |
| `--space-0-5` | 2px | `2px` (9 · exact), `3px` (5 · −1) |
| `--space-1` | 4px | `4px` (12 · exact), `5px` (10 · −1) |
| `--space-1-5` | 6px | `6px` (18 · exact), `7px` (1 · −1) |
| `--space-2` | 8px | `8px` (26 · exact), `9px` (2 · −1) |
| `--space-2-5` | 10px | `10px` (17 · exact) |
| `--space-3` | 12px | `12px` (25 · exact), `13px` (1 · −1) |
| `--space-3-5` | 14px | `14px` (11 · exact) |
| `--space-4` | 16px | `16px` (16 · exact) |
| `--space-4-5` | 18px | `18px` (6 · exact) |
| `--space-5` | 20px | `20px` (6 · exact) |
| `--space-5-5` | 22px | `22px` (2 · exact) |
| `--space-6` | 24px | `24px` (5 · exact) |
| `--space-7` | 28px | `28px` (6 · exact) |
| `--space-8` | 32px | `32px` (1 · exact) |
| `--space-10` | 40px | `40px` (1 · exact) |

**Snaps (the only deltas in spacing):** `3px→2`, `5px→4`, `7px→6`, `9px→8`, `13px→12`.
All −1px, on incidental paddings/gaps. Max spacing delta anywhere = **1px**.
(The per-value table above is authoritative; `3px` maps to `--space-0-5` = 2px.)

**Note on half-steps:** they are deliberate. `6/10/14/18/22px` are frequent (≈54 uses combined);
forcing them onto a pure 4px grid would shift ±2px across many elements and *would* be visible.
The 2px grid preserves the existing rhythm exactly.

`--space-px` (1px) exists for hairline borders only so authors don't reach for a raw `1px`;
border-*width* is not spacing and is out of this scale's remit otherwise.

---

## 2. Type scale

### 2a. Font size `--text-*`

12 steps spanning micro axis-ticks (9px) to the hero numeral (32px). Integer sizes are exact;
the five bespoke `.5` values snap to their integer neighbour (≤0.5px), and the lone sub-9 micros
fold into `--text-3xs`.

| Token | px | Default line-height | Current values that map here (Δ) | Typical use |
|---|---|---|---|---|
| `--text-3xs` | 9 | `--leading-tight` | `8px` (+1), `8.5px` (+0.5), `9px` (exact), `9.5px` (−0.5) | axis micro-ticks, tiny meta |
| `--text-2xs` | 10 | `--leading-tight` | `10px` (exact), `10.5px` (−0.5) | dense captions |
| `--text-xs` | 11 | `--leading-tight` | `11px` (exact), `11.5px` (−0.5) | node sub-labels |
| `--text-sm` | 12 | `--leading-normal` | `12px` (exact) | secondary body / chips |
| `--text-md` | 13 | `--leading-normal` | `13px` (exact), `13.5px` (−0.5) | body, card titles |
| `--text-lg` | 14 | `--leading-normal` | `14px` (exact) | emphasised body |
| `--text-xl` | 16 | `--leading-normal` | `16px` (exact) | section labels |
| `--text-2xl` | 18 | `--leading-tight` | `18px` (exact) | panel headings |
| `--text-3xl` | 20 | `--leading-tight` | `20px` (exact) | sub-hero |
| `--text-4xl` | 26 | `--leading-tight` | `26px` (exact) | display |
| `--text-5xl` | 28 | `--leading-tight` | `28px` (exact) | display |
| `--text-6xl` | 32 | `--leading-tight` | `32px` (exact) | hero numeral |

**Snaps (the only deltas in type size):** `8.5→9`, `9.5→9`, `10.5→10`, `11.5→11`, `13.5→13`
(all ≤0.5px) and the single `8px→9` micro-label (+1px, 1 use). Max type delta = **1px**, once.

The default line-heights above are *recommendations* for new usage. **For the migration, keep
each element's existing `line-height` as-is** (see §2c) — changing both size and leading at once
would risk the pixel-equivalent guarantee. Adopt the defaults opportunistically later.

### 2b. Font weight `--font-weight-*`

Exact 1:1, no deltas.

| Token | value |
|---|---|
| `--font-weight-medium` | 500 |
| `--font-weight-semibold` | 600 |
| `--font-weight-bold` | 700 |
| `--font-weight-extrabold` | 800 |

### 2c. Line height `--leading-*`

| Token | value | Current values that map here (Δ) |
|---|---|---|
| `--leading-none` | 1 | `1` (exact) |
| `--leading-tight` | 1.3 | `1.22` (+0.08, 1 use), `1.3` (exact) |
| `--leading-normal` | 1.5 | `1.5` (exact) |
| `--leading-relaxed` | 1.6 | `1.6` (exact) |

**Snap:** `1.22→1.3` (single use). On one text block this is a sub-1px vertical shift; if the
render gate shows any reflow there, the build may keep `1.22` inline and flag it for the
rationalization follow-up rather than snap it. Everything else is exact.

---

## 3. Build handoff (step ③ — Eng Lead)

**File: `src/styles/global.css`** — add the four token groups to `:root` *alongside* the existing
glass/color tokens (do not touch those). Suggested block:

```css
:root {
  /* ... existing glass + color tokens unchanged ... */

  /* Spacing — 2px grid, suffix = px/4 (PLE-99) */
  --space-0: 0;      --space-px: 1px;
  --space-0-5: 2px;  --space-1: 4px;    --space-1-5: 6px;  --space-2: 8px;
  --space-2-5: 10px; --space-3: 12px;   --space-3-5: 14px; --space-4: 16px;
  --space-4-5: 18px; --space-5: 20px;   --space-5-5: 22px; --space-6: 24px;
  --space-7: 28px;   --space-8: 32px;   --space-10: 40px;

  /* Type — sizes */
  --text-3xs: 9px;  --text-2xs: 10px; --text-xs: 11px;  --text-sm: 12px;
  --text-md: 13px;  --text-lg: 14px;  --text-xl: 16px;  --text-2xl: 18px;
  --text-3xl: 20px; --text-4xl: 26px; --text-5xl: 28px; --text-6xl: 32px;

  /* Type — weight */
  --font-weight-medium: 500; --font-weight-semibold: 600;
  --font-weight-bold: 700;   --font-weight-extrabold: 800;

  /* Type — line height */
  --leading-none: 1; --leading-tight: 1.3; --leading-normal: 1.5; --leading-relaxed: 1.6;
}
```

**Files: `src/styles/flow.css`, `src/styles/timeline.css`** — replace raw px for
`padding`/`margin`/`gap`/`font-size`/`font-weight`/`line-height` with `var(--…)` per the maps
above. Leave `border: …px` widths, `transform`, `width`/`height`/`top`/`left` geometry, and
`flowTheme.ts` graph-palette values **untouched** — out of scope.

**Acceptance for the build:**
- All four token groups defined in `global.css`; existing tokens unchanged.
- No raw px remains for spacing/type properties in `flow.css`/`timeline.css` (a quick check:
  `grep -nE '(padding|margin|gap|font-size|font-weight|line-height)[^;]*[0-9]+px' src/styles/flow.css src/styles/timeline.css` should return only border-width lines, if any).
- Hand back with screenshots at **1440×900** and **390×844**, or a runnable preview URL, for the
  step ④ render gate. (Render via the existing static `dist/` + headless chromium path.)

---

## Deferred: scale rationalization

A second, **board-visible** pass (separate ticket) should ask the presentation questions this
ticket intentionally avoids: do we need 12 size steps, or can the micro tier (9/10/11) and the
display tier (26/28) consolidate? Should `global.css`'s own inline px (`.hero`, `.stats`,
`.citations-*`) adopt these tokens too? Those change the rendered design and therefore need the
board direction-check on a mockup — out of scope here.
