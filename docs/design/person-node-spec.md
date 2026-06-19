# Person node + modal — design spec

**Owner:** UXDesigner (Principal Product Designer) · **Ticket:** PLE-153 (parent [PLE-152]) · **Stage:** ① spec + ② board direction-check (PLE-94 gate)
**Origin:** Board's *Master Person–Relationship Index v1.0* (2026-06-18). 17 named people now carry
dated, multi-touchpoint interaction histories. They need a node visual that is (a) distinct at a
glance, (b) anchored **once** per person, (c) connected by **curvilinear** relationship edges, and
(d) openable into a modal that shows the **full chronological history** plus an in-modal **relationship
graphic**.

**Mockup:** `docs/design/person-node-desktop.html` + `person-node-mobile.html` (shared `person-node.css`).
**Renders:** `docs/design/renders/ple153-desktop-1440.png`, `ple153-mobile-390.png`.

**Reuse-first:** `type: "person"` already exists in the `NodeType` union (`src/data/types.ts:13`); its color
token `--node-person: #6ea8ff` already exists (`flowTheme.ts:11`, `global.css:47`). This spec adds a **shape
variant** keyed off that existing type, a **routing dimension** on existing EdgeKinds, and an **extension** of
the existing `DetailPanel` — no new color tokens for the node itself.

---

## 1. Problem & intent

People are not events. An *Event*/*Project*/*Concept* is a thing that happens or exists at a point/range in
time — rectilinear cards are right for them. A *Person* is an **actor** who persists and accumulates a *web of
dated interactions*. Encoding a person as one more rectangle (today they are `type: event` cards like
"First meeting with Kayla Lee") loses three things the board wants back:

1. **Identity** — a person should read as a person at a glance, not as another event card.
2. **Singularity** — one person, one node. No "Kayla in Jan" + "Kayla in Jun" duplicates.
3. **The relationship web** — each person's later interactions are *edges from that one anchor*, not new nodes.

Design answer: a **circle** (the universal "agent/avatar" form — Gestalt *similarity*: every person shares the
circle, so the eye groups them as a class), bearing a **subtle person silhouette** (recognition over recall,
color-independent per WCAG — the shape, not just the blue, signals "person"), **moored once** at the date of
first contact, with **curvilinear** relationship edges that read as a distinct, organic *relationship layer*
beneath the rectilinear thread spine.

### The four registers stay distinct

| Form | Encodes | Treatment |
|---|---|---|
| **Rectangle card** (existing) | Event / Project / Concept — an occurrence | 202px card, left type-accent bar, `--node-{type}` |
| **Pill / hub** (existing) | Concept hub w/ ≥3 converging edges (octopus) | `--radius-chip`, concept border |
| **Ghost** (existing, PLE-120) | Antecedent — predates its own thread | 0.6 opacity + dotted border + chip |
| **Circle + silhouette (NEW)** | **Person — a persistent actor** | 72px disc, `--node-person` ring, person glyph, name caption below |

---

## 2. Person node — concrete treatment

State key **`person`** (existing `NodeType`). CSS class **`.flow-node--person`**, applied to `.flow-node`,
**overrides the rectangle geometry** to a disc. Per the PLE-100 convention this is a named type key, not an
ad-hoc color — the color is the existing `--node-person`.

### 2.1 Shape + icon

```css
/* PROPOSED — person node geometry tokens (→ design-system owner) */
--person-node-size:        72px;   /* disc diameter; compact footprint so it packs in-band */
--person-node-ring:        2px;    /* ring weight, in --node-person */
--person-glyph-opacity:    .55;    /* subtle silhouette — present, not loud */
--person-ring-rest:        color-mix(in srgb, var(--node-person) 70%, transparent);
--person-fill:             rgba(20, 26, 38, .92);   /* dark disc, person-tinted */
--person-halo:             color-mix(in srgb, var(--node-person) 22%, transparent);
```

```css
.flow-node--person {
  width: var(--person-node-size); height: var(--person-node-size);
  min-height: 0; padding: 0;
  border-radius: 50%;
  border: var(--person-node-ring) solid var(--person-ring-rest);
  background: var(--person-fill);
  box-shadow: 0 0 0 6px var(--person-halo), 0 6px 18px rgba(0,0,0,.42);
  display: grid; place-items: center;
}
.flow-node--person .person-glyph {          /* centered silhouette, currentColor = --node-person */
  width: 34px; height: 34px; color: var(--node-person); opacity: var(--person-glyph-opacity);
}
/* the name + role caption is rendered BELOW the disc (a disc can't hold long names) */
.flow-node--person .person-caption {
  position: absolute; top: calc(100% + var(--space-1-5)); left: 50%; transform: translateX(-50%);
  width: max-content; max-width: 168px; text-align: center;
}
.person-caption b { font-size: var(--text-sm); font-weight: var(--fw-semibold); color: var(--text-hi); }
.person-caption span { display:block; font-size: var(--text-2xs); color: var(--text-low); }
```

- **Silhouette glyph:** a simple head-and-shoulders SVG, `--node-person` at 55% opacity — *inside* the disc
  (the board's "inside or adjacent"). The disc + glyph together are unmistakably a person at 100% zoom.
- **Name below, not inside:** names ("Timothy C. Janak, Esq.") overflow a 72px disc; the caption sits below
  with the role as a quiet second line (Miller's law — two chunks, name then role).
- **Selected / focal:** ring → full `--node-person`, halo widens, glyph → opacity 1 (reuses the existing
  `.flow-node--selected` / `.flow-node--focal` brighten pattern, no new behavior).

### 2.2 Single-anchor behavior on the swim-lane / calendar-proportional axis

- **X (time):** the disc center is moored to `initial_appearance_date` on the existing calendar-proportional
  axis (PLE-133). Kayla = 2026-01-20; Aiman = 2026-01-28; etc. This is a **real date**, so the live **Today
  marker** and the past/projected region wash apply to it exactly as to any node — the anchoring logic adds no
  special-casing of Today (a hard board requirement: "must not break … the live Today marker").
- **Y (band):** the disc sits in the person's **primary thread band** (first entry in `threads[]`) — Kayla →
  *foundational*, Bo Jett → *financial_interest*. People thus cluster into the swim-lane they belong to.
- **One node, forever:** later interactions are **not** new nodes. Each later touchpoint is an **edge** from the
  anchor disc to the existing Event/Project/Concept node for that interaction (e.g. Kayla → *Pleet LLC formation*,
  Kayla → *Savanna board meeting*, Kayla → *Mayor Nichols meeting*). Because the anchor is the person's
  **earliest** date, every relationship edge runs **forward in time (rightward)** — no backward spaghetti.
- **Layout safety (no overlap):** the 72px disc has a small footprint and is packed by the existing per-zone
  packer alongside event cards; the caption reserves vertical space below so it never collides with a sibling.
  Disc + caption are treated as one bounding box by the packer.

### 2.3 Resting legibility — the relationship layer is *quiet by default*

17 people × many interactions = a lot of edges. Rendering them all at full strength would bury the primary
thread spine (cognitive overload, violates the board's "clean, readable"). Design rule:

- **At rest**, a person's relationship edges render at **low emphasis** (`opacity ~.32`, thin, `--node-person`),
  reading as a faint secondary layer.
- **On hover/select of the person disc**, *that person's* edges brighten to full and their connected nodes get a
  focal ring (progressive disclosure + the existing focal pattern). Other people's edges stay quiet.
- The **complete** web is always available, fully drawn, in the **modal relationship graphic** (§4) — so "show
  ALL connections" is satisfied without ever cluttering the main canvas.

This is the single most important layout decision and the thing the board should react to in the direction-check.

---

## 3. Curvilinear edges — EdgeKind + routing

**EdgeKind is unchanged** — it carries *semantics + color* (`introduced` / `partners` / `finances` /
`owns` / `converges_on` / `demonstrates` / `depends_on` / `other`, per `types.ts:31` & `flowTheme.EDGE_COLOR`).
A person's interaction edge keeps the *kind* that best describes it (Brady→Bo = `introduced`; Bo→Brady-home =
`finances`; a plain dated meeting with no stronger verb = `other`, label "Related", colored `--node-person`).

What changes is a **new routing dimension**, orthogonal to kind:

```
routing: "smoothstep"  (existing, orthogonal — keep for all non-person edges)
routing: "curvilinear" (NEW — any edge incident to a person node)
```

- **Trigger:** an edge is `curvilinear` iff **either endpoint is a `person` node**. Engineering: in the edge
  builder, `routing = (src.type === 'person' || tgt.type === 'person') ? 'curvilinear' : 'smoothstep'`.
- **Path:** cubic **bezier**, React Flow `type: "default"` (getBezierPath) with `curvature: 0.4` for an organic
  bow — *no orthogonal segments, no hard vertices*. Source/target handles chosen by the existing `pickHandles`
  shortest-path logic so the curve leaves the disc cleanly.
- **Terminator:** a **soft 3px dot** at the target (not the hard `ArrowClosed` marker), so the line resolves
  without an angular arrowhead — keeps the "no sharp vertices" promise end-to-end.
- **Weight/opacity:** `1.3px`, resting opacity per §2.3; `finances`/`converges_on` keep their existing thicker
  `1.8px` emphasis.

```css
/* PROPOSED — curvilinear edge treatment */
.flow-edge--curvilinear { stroke-width: 1.3px; stroke-linecap: round; }
.flow-edge--curvilinear .react-flow__edge-path { fill: none; }       /* bezier, no orthogonal joints */
.flow-edge--person-rest { opacity: .32; }                             /* quiet until person focused */
.flow-node--person:hover ~ .flow-edge--person-rest,
.flow-node--person.flow-node--selected ~ .flow-edge--person-rest { opacity: 1; }
```

---

## 4. Person modal — extend DetailPanel

Reuse `DetailPanel` (right-dock desktop / bottom-sheet mobile, PLE-146 — `flex: 0 0 400px` / `--radius-panel`
bottom sheet). A `person`-type node renders a **person variant** of the panel: same chrome, three person
sections inserted into the scroll body.

### 4.1 Header (reuses existing header anatomy)
- Tag pill **PERSON** in `--node-person` (existing type-keyed `.tag`); top border `--node-person`.
- H2 **name** (`--text-2xl`/`--fw-bold`); caption line = **role / affiliation** (`--text-md`/`--text-low`).
- Meta row: **primary thread chip(s)** (existing thread tokens) + **"First appearance · 20 Jan 2026"**
  (the anchor date, tabular-nums). Past/Today/Projected state chip applies as normal.

### 4.2 Relationship graphic (NEW — the hero element)
- A compact **radial mini-graph** at the top of the scroll body (~`360×220`): the person disc sits at the
  left/center; **all** connected nodes are chips at the ends of **curvilinear** edges radiating outward, each
  edge colored + labeled by its EdgeKind, each chip colored by the connected node's `--node-{type}`.
- Same curvilinear style as the canvas (§3) so the modal graphic and the live canvas are visually one language.
- Chips are **clickable** → close-and-navigate to that node (reuses the existing connection-navigation).
- If a person has many connections, the graphic **scrolls within its own frame** (never truncates silently —
  per the visual-quality bar; a "+N more" affordance reveals the rest).
- This satisfies the board's "full web of relationships … without requiring the user to leave the modal."

### 4.3 Interaction timeline (NEW)
- A **vertical, strictly chronological** list of the person's `relationships[]` (the index's dated touchpoints).
- Each row: **date badge** (`--text-xs`, tabular-nums, left rail) · **description** (`--text-md`, `--text-mid`)
  · **connected-node chips** (clickable, `--node-{type}`-keyed). Future-dated rows (e.g. June 23 Mayor meeting)
  get the **Projected** state chip — consistent with the canvas temporal language.
- Single-column, left-aligned date rail = scannable timeline (serial-position + Zeigarnik: the eye runs the
  spine top-to-bottom). Undated/loosely-dated touchpoints (e.g. Amy K. Cook "dates not yet detailed") sort last
  under a quiet "Undated" subhead — never dropped.

### 4.4 Footer + special cases
- Footer: existing **Source / Works Cited** line (citations carry over unchanged).
- **Amy K. Cook ↔ Amy Addington Smith:** each modal shows an **unconfirmed-identity note** (reuse the existing
  amber confidence-warning banner): *"Currently treated as distinct from Amy Addington Smith; not yet confirmed
  whether the same individual."* No dark pattern, just an honest provenance flag.
- **Bo Jett / Hayden Hanoch:** the board's required **modal note** ("a bank's willingness to finance … is an
  independent market signal") renders as a quiet pull-quote under the role line.
- **Christy Price:** "supporting participant" — same template, lighter (fewer rows); no special component.

### 4.5 Mobile (390×844)
- Bottom-sheet (existing `--radius-panel` sheet over dimmed graph). Order: header → relationship graphic
  (horizontally pannable, simplified to the strongest N edges with "+N more") → interaction timeline (stacked,
  date badge above description) → citations. Sheet is drag-to-dismiss + ✕ + backdrop-tap (the 4 dismiss paths
  from PLE-146). Targets ≥44px.

---

## 5. Acceptance criteria (for stage-④ visual-truth + the build child)

1. **Circle + icon:** person nodes render as a 72px disc with a `--node-person` ring and a person silhouette,
   visually distinct from Event/Project/Concept rectangles at 100% zoom; name+role caption below the disc.
2. **Single anchor:** exactly one node per person, moored at `initial_appearance_date` on the calendar axis, in
   the primary thread band; no duplicate person nodes at later dates; the live Today marker + past/projected wash
   are unaffected.
3. **Curvilinear edges:** every edge incident to a person node is a smooth bezier (no orthogonal segments, no
   hard arrowhead vertex); non-person edges keep smoothstep.
4. **Resting legibility:** person edges are quiet at rest and brighten on disc hover/select; the canvas stays
   readable with all 17 people present.
5. **Modal:** the person modal shows role/affiliation, a strictly-chronological dated interaction history with
   connected-node chips, AND an in-modal curvilinear relationship graphic of all connections; Amy×Amy
   unconfirmed-identity note present; bank market-signal note present; works-cited carries over.
6. **Tokens:** every value resolves to an existing `--space-*` / `--text-*` / `--node-*` / thread token or a
   PROPOSED token named in §2–§3 (flagged to the design-system owner). No inline one-offs.

## 6. System-level proposals (→ design-system owner)
- **New geometry tokens:** `--person-node-size`, `--person-node-ring`, `--person-glyph-opacity`,
  `--person-ring-rest`, `--person-fill`, `--person-halo` (§2.1).
- **New routing value** `curvilinear` on the edge model + `.flow-edge--curvilinear` treatment (§3). Reusable by
  any future "organic relationship" edge, not just people.
- **DetailPanel person variant** — additive sections (relationship graphic + interaction timeline); no change to
  the existing event/project/concept panel paths.
- **Schema (handled in build child / PLE-152):** `relationships[]` (date, description, connected_node_ids,
  connected_node_titles), `initial_appearance_date`, `threads[]`, `role`. PRD §7 update owned by the build child.

---

*Stage-④ visual-truth render @1440×900 + 390×844 is UXDesigner-owned after the build child ships. This spec is
the eng handoff: every rule maps to a token or a named PROPOSED token.*
