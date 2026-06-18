# Ghost / antecedent node visual — design spec

**Owner:** UXDesigner (Principal Product Designer) · **Ticket:** PLE-120 · **Stage:** ① spec + ② board direction-check (PLE-94 gate)
**Origin:** Lawrence's board resolution (PLE-109 → PLE-112). The Savanna first-bond-fail
(`n-savanna-bond-fail`, 2026-04-07) **intentionally predates** the Savanna intro
(`n-savanna-intro`, 2026-04-14) — the failure is *why* Adam Newman reached out. Dates are
correct and must not change; the fail is **rendered as a ghost**, ordered first, and is
**never flagged, auto-corrected, or suppressed**.

**Mockup:** `docs/design/ghost-node-desktop.html` + `ghost-node-mobile.html` (shared
`ghost-node.css`). **Renders:** `docs/design/renders/ple120-desktop-1440.png`,
`ple120-mobile-390.png`.

---

## 1. Problem & intent

A net-new node visual state: a **"ghost"** treatment for *antecedent* events — events that
occur **before** the relationship/thread they belong to formally begins, and that motivate a
later introduction. First and currently only instance: `n-savanna-bond-fail`.

The ghost must read as a **distinct fourth register** against the three states already in the
node visual language, and must not be confusable with any of them:

| State | Existing treatment (flow.css) | Encodes |
|---|---|---|
| **Live / confirmed** | solid fill `#161a22`, solid 1px border `rgba(255,255,255,.1)`, full opacity | the default |
| **Unconfirmed (§12)** | `border-style: dashed` + “pending” badge, **full opacity** | *certainty*, not time |
| **Temporal `past` / `projected`** | background **region wash** (`rgba(110,168,255,.035)` right of today) — **never per-node** | *when*, by axis position |
| **Search-dimmed** | `opacity: .22`, no border/badge change | transient filter |
| **Ghost / antecedent (NEW)** | **60% opacity + dotted border + inline “antecedent” chip** | *pre-history* — predates its own thread |

Design rationale: opacity alone is ambiguous (reads as disabled/dimmed), so the ghost pairs a
genuine **fade** (the board's literal "ghost" ask) with a **named, color-independent
affordance** (the inline "antecedent" chip) so it never reads as broken — recognition over
recall, and WCAG color-independence is satisfied by the text label, not the fade.

---

## 2. The ghost treatment — concrete values

State key **`antecedent`** (the visual is the "ghost"; the semantic state is "antecedent").
CSS class **`.flow-node--antecedent`**, applied to the existing `.flow-node`. Per the PLE-100
convention these are named state keys, not ad-hoc colors.

### Proposed state tokens (→ design-system owner)
```css
--node-antecedent-opacity:   .6;                      /* resting fade; → 1 on hover/select/focus */
--node-antecedent-border:    rgba(255,255,255,.26);   /* DOTTED — distinct from unconfirmed DASHED */
--node-antecedent-bar-opacity: .42;                   /* the left type-accent bar, muted */
--badge-antecedent-fill:     rgba(167,139,250,.14);   /* violet = the existing meta/concept register */
--badge-antecedent-text:     #c5b6f4;
--badge-antecedent-border:   rgba(167,139,250,.34);
```

### Rules
```css
.flow-node--antecedent {
  opacity: var(--node-antecedent-opacity);
  border-style: dotted;
  border-color: var(--node-antecedent-border);
  box-shadow: 0 2px 8px rgba(0,0,0,.25);   /* flatter than live cards → sits "behind" */
}
.flow-node--antecedent .flow-node__bar { opacity: var(--node-antecedent-bar-opacity); }

/* full legibility the moment it gets attention — the fade is a RESTING state only */
.flow-node--antecedent:hover,
.flow-node--antecedent.selected,         /* React Flow `selected` prop → existing --selected class */
.flow-node--antecedent:focus-within { opacity: 1; }
```

Three independent cues, so the state survives any single channel being missed:
1. **Fade** — `opacity .6` (vs search-dimmed `.22`: clearly a different register — half-faded vs nearly-gone).
2. **Dotted border** — distinct from `unconfirmed`'s **dashed** border, and from the live **solid** border.
3. **Inline "antecedent" chip** — the explicit, color-independent signifier (see §3).

### Why not the obvious overloads
- **Not reduced opacity alone** → that is `search-dimmed`. Ghost is less faded *and* carries a border + chip.
- **Not dashed border** → that is `unconfirmed`. Ghost uses **dotted**.
- **Not a temporal style** → `past`/`projected` are background washes; the ghost is *also*
  `past` by date, but ghostliness is a per-node semantic the wash cannot express.

---

## 3. The "antecedent" affordance — inline meta chip (not a bottom-right badge)

`n-savanna-bond-fail` already carries a `demandScore: 42` → it renders the bottom-right **`D 42`**
badge. Adding a *second* bottom-right badge crowds the card. So the antecedent affordance lives
**inline at the start of the `.flow-node__meta` row** instead, where the type/date metadata sits:

> `‹ antecedent` · Event · Savanna · 04-07

```css
.meta-antecedent {                /* inline chip; flex:none so it never truncates */
  display:inline-flex; align-items:center; gap:3px;
  font-size: var(--text-3xs); font-weight: var(--font-weight-bold);
  text-transform: lowercase; padding: 1px var(--space-1); border-radius: 4px;
  color: var(--badge-antecedent-text);
  background: var(--badge-antecedent-fill);
  border: 1px solid var(--badge-antecedent-border);
}
```
The leading glyph is a small CSS chevron-hook (`‹`, "points back in time"); no icon font needed.
The bottom-right badge slot is left entirely to `D 42`, so the two never collide.

---

## 4. Chronological placement + connector treatment

- **Ordering** is already correct: `nodeAxisDate` sorts `04-07` before `04-14`. No layout/ordering
  change is required — confirmed against `src/lib/temporal.ts` + the PLE-121 zoned layout. The
  ghost simply occupies its true axis position, faded.
- **Axis date-dot:** the ghost's dot on the time axis is hollow/dotted (`.dot--ghost`:
  `background:#0c0f15; border:1.4px dotted #a9b2c6`) so the antecedent reads as a ghost *on the
  axis* too, not just in the card.
- **Causal connector (optional, recommended):** the fail *motivated* the intro. Today the data has
  `e-savanna-bond-fail-approval` (label "reconnection") and `e-savanna-intro-approval`, but **no
  direct fail→intro edge**. Recommend adding one so the "this failure is why the intro happened"
  story is legible:
  - **Edge:** `e-savanna-bondfail-intro`, `from: n-savanna-bond-fail`, `to: n-savanna-intro`,
    `kind: "other"`, `label: "motivated"`. (Uses the existing `other` EdgeKind — **no schema
    change**. A dedicated `motivates` EdgeKind is a larger system change and is **not** proposed here.)
  - **Style — "ghost connector":** dotted, faded, open (unfilled) arrowhead, violet:
    `stroke: #a78bfa; stroke-width: 1.4; stroke-dasharray: 2 3; opacity: .6;` open chevron marker.
    This visually matches the ghost register and is clearly softer than the solid `depends_on` edges.
  - This edge is **optional**: if Eng prefers to keep the edge set minimal, the ghost node styling
    alone satisfies the acceptance criteria. Build is **not blocked** on it.

---

## 5. Accessibility & motion

- **Color-independence:** the state is communicated by the **"antecedent" text chip** and the
  **dotted border shape**, not by the fade/color alone.
- **Resting fade vs. legibility:** at rest the card is `.6` opacity. Full-contrast reading is always
  one interaction away — **hover / keyboard focus / select restores `opacity: 1`**, and the detail
  panel (PLE-101) always renders at full contrast. The fade is decorative de-emphasis with an
  accessible full-contrast path, not an information barrier.
- **Reduced motion:** opacity is a static property; the hover/focus transition reuses the existing
  `.flow-node` `transition: …, opacity .15s` and respects the app's existing reduced-motion handling.
- **Mobile:** tap restores full opacity → bottom-sheet detail (PLE-101). 44px touch target unchanged (PLE-97).

---

## 6. Downstream handoff (NOT in this ticket — after board sign-off)

Per the standing UI gate, UX owns this spec; Eng consumes. After the stage-② board direction-check:

- **Eng Lead (schema):** add `isAntecedent?: boolean` to `TimelineNode` in `src/data/types.ts`.
  A dedicated boolean is cleaner than overloading `confidence` (the two are **orthogonal** — an
  antecedent can be confirmed *or* unconfirmed; `n-savanna-bond-fail` is `confidence: "confirmed"`).
  Optional (default `undefined`/`false`), so no other content needs touching.
- **Frontend:** thread `isAntecedent` through `StageNodeData`; in `StageNode` add
  `d.isAntecedent ? "flow-node--antecedent" : ""` to the class list and render the inline
  `.meta-antecedent` chip at the start of `.flow-node__meta`; add the `.dot--ghost` axis treatment
  in `FlowCanvas`. Add the proposed tokens + the `.flow-node--antecedent` / `.meta-antecedent` rules
  to `flow.css`. Optionally add the `e-savanna-bondfail-intro` "motivated" edge (§4) + a ghost-edge
  style branch in the `rfEdges` builder.
- **Content:** set `isAntecedent: true` on `n-savanna-bond-fail` in `content.ts`. **No date change.**

### Acceptance (restated)
Ghost styling visible on `n-savanna-bond-fail`, ordered before `n-savanna-intro`; no date altered;
nothing flags/suppresses the fail-before-intro; visual-truth renders captured at both breakpoints
(`ple120-desktop-1440.png`, `ple120-mobile-390.png`).
