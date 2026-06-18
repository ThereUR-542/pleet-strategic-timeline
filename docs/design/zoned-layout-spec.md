# PLE-114 — Zoned / container layout + octopus orthogonal routing

**Owner:** UXDesigner · **Parent:** PLE-110 · **Status:** Awaiting board direction-check (stage ②)
**Builds on:** PLE-92 (time-axis node-graph), PLE-100 (NodeType/EdgeKind color keys), PLE-99 (spacing/type tokens), PLE-102 (DetailPanel)
**Artifacts:** `docs/design/zoned-layout-mockup.html` · renders in `docs/design/renders/ple114-{desktop-1440,mobile-390}.png`

---

## 0. What the board asked for (PLE-110 + Zoho reference)

1. **Zones / containers** like the Zoho reference — tinted vertical swim-lane columns with headers, grouping related nodes; some colored sub-groupings.
2. **More organization & vertical (Y) space** — spread info up/down as events/persons flow along X through time.
3. **Octopus-tentacle routing** — connectors reach / spindle out from a node toward concepts using **orthogonal (elbow)** routing, not curved/crossing edges.

> **Scope note — Z-plane / 3D *build* is NOT in this ticket; the depth *design direction* now lives here.** PLE-110 also requested a Z-plane to rotate the flow in 3D; the *build* was routed to **CTO** under [PLE-115](/PLE/issues/PLE-115) (feasibility proven via CSS-3D spike). Per the CTO's design-gate ask, the **depth treatment is specified in §10 below** so X, Y, and Z are designed as one coherent system rather than bolted together later. PLE-114 still ships the 2D layout + routing (§1–§9); §10 is the design contract PLE-115's build consumes. The separation that makes this safe: **the layout engine emits (x, y); Z is a separable transform layer applied over that output** — so depth rides on top of this zoned layout unchanged.

---

## 1. Core design decision — zones *without* losing the time axis

The accepted PLE-92 direction is "I want to SEE time — a line with ticks, each node above/below its tick, to show the EVOLUTION." The board now wants **zones**. These are reconciled, not traded:

- **Zones = chronological CHAPTER columns laid out ALONG the existing X time-flow.** Each zone is a tinted vertical band that spans a date range; the PLE-92 month-tick axis and the Today marker are **preserved underneath** the zones. So zone boundaries fall on chapter date boundaries — you still read time left→right, you now also read *story structure*.
- This gives the board's "more organization": instead of one thin axis with everything stacked on it, the canvas is partitioned into labeled chapters, and each chapter uses the **full canvas height** for its nodes.

Why chapters (chronological) rather than threads (thematic) as the column unit: the Zoho reference columns are sequential phases, and the board explicitly wants information *flowing through X over time*. Thread identity is preserved instead via **color** (node/edge keys) and **sub-containers** (below), so we get both axes of meaning.

### Chapter zones (5)
| # | Zone title | Date range | Dominant thread(s) |
|---|------------|-----------|--------------------|
| 1 | Foundations | Jan – Feb 2026 | `foundational` |
| 2 | Growth & Relationships | Mar – Apr 2026 | `growth`, `strategic_relationships`, `media_brand` |
| 3 | Savanna Schools | Apr – Aug 2026 | `savanna` |
| 4 | Oswego & Tulsa | May – Jun 2026 | `oswego`, `major_projects` |
| 5 | Manufacturing Imperative | Jun 2026 → projected | `manufacturing`, `financial_interest`, concepts |

Chapter boundaries are **data-derived** (date ranges over the node set), not hand-placed — eng computes them from `effectiveDate` clustering so the layout stays correct as content changes. A thread that recurs across chapters appears in each (color carries identity); the sub-container only renders where a thread *clusters* in one zone.

---

## 2. Sub-containers (the "colored sub-groupings")

A **sub-container** is a rounded, thread-tinted region nested inside a zone that groups a thread's cluster of nodes (Gestalt **common region** + **proximity**; Von Restorff for the tinted standout). Header pill in the thread color, top-left.

Rendered in the mockup: **Savanna · bond saga** (`--thread-savanna` orange), **Oswego project** (`--thread-oswego` cyan), **Banking relationships** (`--thread-strategic-relationships` blue), **Financial model** (`--thread-financial-interest` gold).

Tint recipe (token-driven, low-alpha so nodes/edges stay legible on `--bg-0`):
- fill: `color-mix(in srgb, var(--thread-X) 8%, transparent)` (`--subgroup-fill-pct`)
- border: `1px solid color-mix(in srgb, var(--thread-X) 26%, transparent)` (`--subgroup-border-pct`)
- tag: `--text-3xs`, uppercase, thread-color text on `--bg-0`, `--radius-chip`

---

## 3. Octopus orthogonal routing

Replace React Flow's default **bezier** edges with **orthogonal (elbow)** routing, and let edges "spindle out" toward their target by choosing the nearest handle — the octopus reach.

**Eng spec:**
1. **Edge type → `smoothstep`** (orthogonal segments with softened corners; `borderRadius: 8` = `--space-2`). Use `step` only if the board prefers hard 90° corners; `smoothstep` matches the rounded connectors in the Zoho reference and reads cleaner at density.
2. **Multi-handle nodes.** Give each `StageNode` source+target handles on **left & right**; give `concept` **hub** nodes handles on **all four sides** (top/right/bottom/left). At layout time, pick the handle pair that minimizes the connector's path length / crossings — this is what makes tentacles "reach efficiently" toward a concept from whatever direction.
3. **Hub pattern.** A `concept` node (e.g. **Equipment Demand N(t)**) is the octopus body: multiple `converges_on` tentacles route in from Savanna, Oswego-demand, Manufacturing, and tentacles route *out* (`demonstrates`, `finances`) to other concepts. Hub nodes get the pill shape + `concept` border to read as a convergence point, not a card.
4. **Crossing-min preserved (PLE-92).** Orthogonal routing + per-edge handle selection + lane-offsetting parallel edges keeps crossings down. Bundle co-directional edges on shared vertical lanes between columns.
5. **EdgeKind keys unchanged (PLE-100).** Color and weight still come from `flowTheme.EDGE_COLOR` / `EDGE_KIND_LABEL`. `finances` stays gold + dashed; `finances`/`converges_on` stay thicker (1.8px). Routing geometry changes; the semantic key system does **not**.

---

## 4. Naming keys (PLE-100) used in this layout

**NodeType** (`flowTheme.NODE_COLOR`): `person` #6ea8ff · `project` #57e0a8 · `event` #f59e0b · `concept` #c084fc.
**EdgeKind** (`flowTheme.EDGE_COLOR`): `introduced` #94a3b8 · `owns` #6ea8ff · `partners` #4ade80 · `converges_on` #a78bfa · `demonstrates` #22d3ee · `depends_on` #fbbf24 · `finances` #f59e0b (dashed) · `other` #6b7280.
**Thread** (sub-container tints, `timeline.css --thread-*`): `foundational`, `growth`, `savanna`, `oswego`, `strategic_relationships`, `media_brand`, `manufacturing`, `financial_interest`.

---

## 5. Token scale

All spacing/type/radii from **PLE-99** (`--space-*` 2px grid, `--text-*`, `--radius-*`). No one-off px values.

### Proposed system-level additions (→ design-system owner to accept/defer)
These are **new** and don't exist in `global.css` yet — they're the zone primitives, deliberately proposed (not inlined):

| Token | Value | Purpose |
|-------|-------|---------|
| `--zone-fill` | `rgba(255,255,255,.018)` | base chapter-column wash |
| `--zone-fill-alt` | `rgba(255,255,255,.040)` | alternating column (figure-ground separation between adjacent zones) |
| `--zone-border` | `rgba(255,255,255,.07)` | 1px vertical divider between zones |
| `--subgroup-fill-pct` | `8%` | thread-color mix for sub-container fill |
| `--subgroup-border-pct` | `26%` | thread-color mix for sub-container border |

Zone header type reuses existing tokens: kicker `--text-2xs`/`--text-low`, title `--text-md`/`--text-mid`, range `--text-2xs`/`--text-low`.

---

## 6. Mobile (390×844)

Five vertical columns can't coexist at 390px (PLE-97). Zones **rotate from columns to stacked horizontal chapter bands**, scrolled vertically:
- Sticky top bar with chapter pager ("Ch 4 / 5 ▾") for fast jumps (recognition over recall; avoids losing place — Zeigarnik).
- Each band = full-width chapter section (kicker / title / date range), nodes on a **horizontal scroll rail** inside the band.
- Active chapter gets a left inset accent (`--node-project`).
- Cross-zone tentacles can't be drawn as long elbows on a phone, so they degrade to **"→ hub" affordance chips** (e.g. "Oswego printing → converges on N(t) (Ch 5)") that deep-link to the target node. Sub-groups show as labeled chips.

---

## 7. Fit with existing DetailPanel (PLE-102)

No conflict. The DetailPanel is a **docked** surface (desktop right column `flex:0 0 400px`; mobile bottom sheet) and is unchanged by this ticket. When open on desktop, the zoned canvas shrinks to ~1040px and the 5 columns compress **proportionally** — zones are flex, so the system reflows without overlap. The panel never stacks over the graph; the hard constraint from PLE-101/102 still holds. Selecting a node in any zone opens the same panel.

---

## 8. Acceptance criteria (for the eng build that follows board sign-off)

1. Canvas renders 5 data-derived chapter zones as tinted columns with headers; PLE-92 month axis + Today marker visible beneath; zone boundaries align to chapter date ranges.
2. Thread clusters render as tinted sub-containers using the token recipe in §2.
3. Edges are orthogonal (`smoothstep`), multi-handle, EdgeKind-colored/weighted per PLE-100; ≥1 `concept` hub shows ≥3 converging `converges_on` tentacles.
4. Nodes use full zone height (more Y spread); no node overlap (hard constraint retained).
5. DetailPanel (PLE-102) opens docked with canvas reflow, no overlap, at both viewports.
6. Mobile collapses to stacked chapter bands with chapter pager + horizontal rails + tentacle chips.
7. All spacing/type/radii from PLE-99 tokens; the 5 proposed `--zone-*`/`--subgroup-*` tokens added to `global.css` (or board-deferred alternative). No one-off values.
8. Visual-truth: renders pixel-match the approved mockup at **1440×900** and **390×844**.

---

## 10. Depth / Z-plane treatment (design contract for PLE-115)

This section is the UX design gate for the Z-plane. It defines *how* depth should look and behave so the CTO's CSS-3D build ([PLE-115](/PLE/issues/PLE-115), Approach A) integrates onto this layout coherently. **Grounded in real renders this run** of the feasibility spike at both the spike's pose and my recommended pose — see `docs/design/renders/ple115-uxgate-{desktop-1440,mobile-390,recommended-desktop}.png`.

### 10.1 The non-negotiable: 3D is a *mode*, not the default
The board's accepted look (PLE-92) is a readable left→right time flow. **The canvas loads flat (0° / true 2D).** Depth is engaged by an explicit, reversible **"3D depth" toggle** in the HUD; engaging it animates the plane to the default tilt pose. Rationale: Jakob's Law (the timeline must read on load the way the board already approved), and the render proves a steep default both costs legibility and taxes hit-testing for every user. Flat is always one tap away — depth never becomes a wall between the user and the data. *Recognition over recall, Forgiveness (reversible), Aesthetic-Usability without sacrificing the base reading.*

### 10.2 Which semantic variable maps to Z → **story `thread`** (v1 default)
Depth encodes the **`thread`** identity (the same `--thread-*` keys already driving node/edge color in §4 and sub-containers in §2). Each thread lifts to its own parallel Z layer.
- **Why thread:** it directly de-crosses edges — co-thread connectors stay in-plane, only cross-thread tentacles bridge planes — which *reinforces* the octopus de-crossing goal of §3 rather than competing with it. And it makes X/Y/Z **one** semantic system: thread = color in 2D, thread = depth in 3D. No new variable to learn.
- **Color-independence / accessibility:** because depth is *redundant* with color, depth perception is never the sole channel for meaning (WCAG — don't rely on a single perceptual cue; supports users who can't resolve 3D foreshortening).
- **Documented v1.1 alternatives** (selectable depth axis, not v1 scope): `confidence` (confirmed nodes forward / unverified receded — ties to the source-ledger work, [PLE-105](/PLE/issues/PLE-105)) and `type` (NodeType). v1 ships `thread` only; the axis selector is a deliberate later extension.

### 10.3 Octopus hubs in depth
A `concept` hub (§3.3) receives `converges_on` tentacles from **multiple** threads, so it cannot live on one thread plane. **Hub/`concept` nodes sit at the z=0 ground plane**; thread tentacles descend/ascend to them. The hub literally becomes the convergence point in depth as well as in plane — the octopus body sits "on the floor," arms reaching down from each thread layer.

### 10.4 Tilt range, clamp, and default pose (desktop)
From the renders: past ~35° Y the far cards recede too hard and DOM hit-testing degrades (matches CTO's ~45° finding); the spike's -24°/34° wastes vertical canvas and crowds the right edge. The gentler recommended pose keeps all cards frontal and legible.
| Param | Clamp | Default (on toggle-on) |
|-------|-------|------------------------|
| `rotateY` | **−35° … +35°** | **+22°** |
| `rotateX` | **−32° … +8°** (tilt top away; only slight forward) | **−18°** |
| `perspective` | fixed | `1500px`, origin `50% 50%` |
| z-gap between thread layers | token-driven | `--zplane-layer-gap` (proposed, §10.7) |
- **Snap-to-flat** preset returns to 0°/0° for precise interaction/selection (overlay an invisible flat pick-plane if click accuracy drifts near the clamp edges).
- Discrete **pose presets** ("Flat · Tilt · Side") in addition to drag — recognition over recall, and a non-drag path for motor accessibility.

### 10.5 Mobile (390×844) — flatter and secondary
The mobile render confirms steep 3D is unusable at 390px (cards clip off both edges; HUD eats the top third). On mobile the **stacked chapter bands (§6) remain the primary navigation**; 3D is a desktop-first delighter.
- 3D toggle is **off by default and visually de-emphasized** on mobile.
- If engaged: **flatter clamp `rotateY −18°…+18°`, `rotateX −12°…0°`**, gentler perspective, and the rotation control **collapses into the existing mobile overlay dock** ([PLE-97](/PLE/issues/PLE-97)) rather than a fixed panel.

### 10.6 The fixed 2D HUD invariant (what must NOT rotate)
These stay screen-fixed as a flat HUD and **never** rotate with the plane (the spike proves this for the control panel; extend the rule):
- PLE-92 **time axis + month ticks + Today marker**, the **legend**, **zone headers / chapter labels**, the **DetailPanel** (PLE-102), and the **rotation control** itself.
- **What DOES rotate with the plane:** nodes, edges/tentacles, zone column tints, and sub-container regions — they are the flow substrate and must stay co-planar with the cards.

### 10.7 Motion, accessibility, tokens
- **`prefers-reduced-motion`:** no tilt animation — snap directly to the target pose; never auto-orbit.
- Toggle/preset controls ≥ **44px** touch targets (PLE-97); keyboard: arrows nudge rotation when the control is focused; toggle is a labeled switch, not icon-only.
- **Doherty:** rotation is compositor-driven CSS transforms (Approach A) → stays < 400ms / 60fps; keep the `.08s linear` follow from the spike for drag, ease for preset jumps.
- **Proposed system tokens** (→ design-system owner, same posture as §5): `--zplane-layer-gap` (z-distance between thread layers), `--zplane-perspective` (`1500px`), `--zplane-tilt-default-x` (`-18deg`), `--zplane-tilt-default-y` (`22deg`). Tilt **clamps** are interaction constants, not visual tokens. No one-off values in the build.

### 10.8 Acceptance criteria for the Z build (additive to §8, owned by PLE-115)
9. Canvas loads flat 2D; a reversible "3D depth" toggle animates to the default pose in §10.4; toggling off restores exact 2D.
10. Depth encodes `thread`; co-thread edges stay in-plane, cross-thread tentacles bridge planes; `concept` hubs sit at z=0.
11. Tilt is clamped to §10.4 (desktop) / §10.5 (mobile); a Flat snap preset exists.
12. The §10.6 HUD set stays screen-fixed and unrotated at every pose; nodes/edges/zone tints/sub-containers rotate together rigidly.
13. `prefers-reduced-motion` snaps without animation; controls meet §10.7 a11y/target-size rules.
14. Visual-truth: 3D-on renders legible at **1440×900** and the flatter mobile clamp legible at **390×844**.

---

## 11. Handoff & next step

**Stage ② — board direction-check (this ticket, now):** CEO carries the mockup renders to Lawrence. Direction questions, not pixel questions:
- **X/Y (this spec §1–§9):** Are chapter columns the right zone unit (vs thematic threads)? Is octopus-to-hub orthogonal routing the reach he meant? Tints subtle enough?
- **Z / depth (§10, coordinated with [PLE-115](/PLE/issues/PLE-115)):** Is **3D-as-an-opt-in-mode over a flat default** the right call, or does the board want the timeline to *open* tilted? Is **story-thread → depth** the right thing to encode in Z (vs confidence / type)? Compare `ple115-uxgate-recommended-desktop.png` (my gentler v1 default) against the spike's `zplane-desktop.png`.

On board "yes" →
- **stage ③ Eng build (X/Y)**: assign Eng Lead with `layout.ts` (chapter-zone computation + sub-container bounds), `FlowCanvas.tsx` (zone/sub-container render layer + axis under zones), edge config (`smoothstep` + multi-handle + handle-selection), `flowTheme.ts`/`global.css` (the 5 proposed tokens).
- **Z build stays on [PLE-115](/PLE/issues/PLE-115)/CTO**, consuming §10 as its design contract, integrating *after* this layout lands (separable-Z principle). UX runs **stage ④ visual-truth** on both surfaces before done.
