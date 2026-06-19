# PRD §7 — Data Model addendum: Person nodes (Master Person–Relationship Index v1.0)

**Ticket:** [PLE-154](/PLE/issues/PLE-154) (parent [PLE-152](/PLE/issues/PLE-152)) · **Stage:** ② data foundation
**Canonical contract:** `src/data/types.ts` (the README-designated §7 home) + `src/data/schema.ts` (zod loader).
**Origin:** Board's *Master Person–Relationship Index v1.0* (2026-06-18), 17 named people.

This addendum formally defines the **Person** extension to the §7 data model. It is **additive**: the existing
`TimelineNode` shape, all non-person nodes, and the live "Today" marker are unchanged. `person` is an **optional**
sub-object on a node — absent on every Event/Project/Concept and on non-index persons (Lawrence Gene, Mayor Nichols).

---

## 7.x.1 The `person` node type

A node with `type: "person"` MAY carry an enriched `person` profile. The profile is the actor's identity plus the
**full, dated relationship history** ingested from the Master Index. The lane-assignment field `thread` (singular)
is retained for band placement; `person.threads` (array) is the complete set of threads the actor participates in.

```yaml
- id: n-kayla-lee
  type: person
  title: "Kayla Lee, NCARB — Founder & Architect, Lee Simon Design"   # existing fields untouched
  date: null            # left null in the data layer; render child (PLE-155) anchors via person.initialAppearanceDate
  thread: foundational  # lane band
  # …existing summary / bodyMd / media / citationIds / confidence…
  person:
    name: "Kayla Lee, NCARB"
    role: "Founder & Architect, Lee Simon Design"
    initialAppearanceDate: 2026-01-20      # the timeline ANCHOR (first interaction w/ Lawrence Gene / Pleet LLC)
    threads: [foundational, major_projects, strategic_relationships, media_brand]
    modalGraphic: null                     # ref to the in-modal relationship graphic; null until PLE-155 generates it
    note: null                             # carried verification / identity flags (NOT resolved here)
    relationships:
      - date: 2026-01-20
        scheduled: false                   # true for future/scheduled touchpoints (e.g. 23 Jun Mayor meeting)
        description: "First meeting with Lawrence Gene; conceptual origin of Pleet LLC."
        connectedNodeIds: [n-kayla-first-meeting]      # resolved to REAL node ids only (loader-validated)
        connectedNodeTitles: ["First meeting with Kayla Lee, NCARB"]   # human labels; may include node-less items
```

## 7.x.2 Single-anchor (initial appearance) behavior — **critical**

A person appears on the timeline **exactly once**, moored to `initialAppearanceDate` (their first interaction with
Lawrence Gene / Pleet LLC). **No duplicate person nodes at later dates.** Every subsequent meeting, introduction,
or connection is a `relationships[]` entry — drawn by the render child as an **edge radiating from the single
anchored node**, never a new node.

- `initialAppearanceDate` MAY be `null` when the first-interaction date is not in the record (e.g. Amy K. Cook —
  meeting dates flagged for confirmation; Timothy C. Janak — ongoing General Counsel / Oswego owner). The render
  child treats null-anchored persons as undated (slotted last), consistent with existing undated-node behavior.
- **Anchoring is non-destructive:** the data layer leaves top-level `date` as-is (`null` for persons today) so
  current rendering and the live Today marker are unchanged. The render/modal child ([PLE-155](/PLE/issues/PLE-155))
  owns turning `initialAppearanceDate` into the on-axis x-position.

## 7.x.3 Enriched relationship-history structure

`person.relationships[]` is an ordered list of dated touchpoints. Each entry:

| field                 | type            | notes |
| --------------------- | --------------- | ----- |
| `date`                | ISO 8601 \| null | interaction date; null when undated/unspecified |
| `scheduled`           | boolean         | true for future/scheduled interactions |
| `description`         | string          | one-line human description |
| `connectedNodeIds`    | string[]        | resolved to **real existing node ids** — loader rejects danglers |
| `connectedNodeTitles` | string[]        | human labels; carries items that have no node of their own |

**Referential integrity (loader-enforced, `assembleBundle`):** a `person` profile on a non-person node is rejected;
any `connectedNodeIds` entry that does not resolve to a real node is a located `TimelineDataError` — same guard class
as dangling edge endpoints and unknown citation ids.

## 7.x.4 Field-name mapping (index snake_case ↔ YAML/TS camelCase)

The Master Index uses snake_case; the YAML/TS contract uses camelCase to match the codebase's direct YAML→TS
passthrough (cf. `dateStart`, `citationIds`, `opensExternal`). Equivalences:

| Master Index            | YAML / TS               |
| ----------------------- | ----------------------- |
| `name`                  | `name`                  |
| `role`                  | `role`                  |
| `initial_appearance_date` | `initialAppearanceDate` |
| `threads`               | `threads`               |
| `relationships[].date`  | `relationships[].date`  |
| `relationships[].description` | `relationships[].description` |
| `connected_node_ids`    | `connectedNodeIds`      |
| `connected_node_titles` | `connectedNodeTitles`   |
| `modal_graphic`         | `modalGraphic`          |

## 7.x.5 Curvilinear-edge requirement

All relationship edges connected to Person nodes MUST render as **smooth curvilinear curves** (organic, no sharp
angles / orthogonal routing). This is a render contract owned by the build child ([PLE-155](/PLE/issues/PLE-155));
it is recorded here as a formal §7 requirement so the data model and renderer stay in agreement. Edge **kinds** are
unchanged (`EdgeKind` union); curvilinear is a **routing dimension** applied to edges incident to person nodes.

## 7.x.6 Master-Index ingest notes (v1.0)

- **17 people** ingested: 15 enriched existing person nodes + **2 net-new** (`n-tony-winters`, `n-christy-price`).
  Excluded per scope: Scott Rackers, David Marshall; Lawrence Gene is the central figure (not an entry).
- **Amy K. Cook (BancFirst)** (`n-amy-bancfirst`) and **Amy Addington Smith** (`n-amy-addington-smith`) remain
  **two separate nodes**; each `note` records that it is unconfirmed whether they are the same individual.
- **Christy Price** (`n-christy-price`) is a lighter "supporting participant" entry.
- **Carried open flags (NOT resolved here):** Cherokee Nation $40M via 1 Architecture (on `n-nick-denison.note`);
  Amy K. Cook meeting dates (on `n-amy-bancfirst.note`). These stay flagged per the source ledger.
- **Financial Interest thread** now spans three banks: IBC (Bo Jett), Gateway (Hayden Hanoch), BancFirst (Amy K. Cook).
