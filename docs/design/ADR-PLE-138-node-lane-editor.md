# ADR PLE-138 — Visual editor for nodes + lanes (extends the PLE-137 surface)

**Status:** built, pending UXDesigner stage-④ visual-truth sign-off
**Board ask (Lawrence, PLE-135):** *"create an editor for the nodes itself and the
lanes … easier to update the chart instead of having to learn the yaml syntax."*

## Decision

Extend the existing PLE-137 connection editor into **one `/editor` surface with three
tabs — Nodes · Lanes · Connections** — not a second tool. A single `EditorShell`
loads the live bundle once (the same PLE-136 loader) and holds nodes / lanes /
connections as cross-tab state, so every tab validates against the *live* siblings
and an edit in one tab is immediately visible to another's validation.

- **Nodes** — master list + a field form covering every `TimelineNode` field in
  `types.ts` (id, type, title, date/range, thread/lane, summary, bodyMd, confidence,
  isAntecedent, keyFacts, demandScore [projects only], media, citation refs). No YAML.
- **Lanes** — table over the PLE-133 registry: id (one of the 9 thread keys), label,
  order (▲▼ reorder), chapter, color (live swatch), zLayer; add/edit/delete.
- **Connections** — the unchanged PLE-137 table, now a presentational tab.

## Validation parity (no path produces loader-invalid YAML)

Parity is **by construction**, not re-implementation: `validateNodes` / `validateLanes`
call the exact loader functions (`validateFile` + `assembleBundle` from
`src/data/schema.ts`) over the edited file plus its live siblings, and surface the
loader's own `LocatedError`s inline. The dev middleware (`scripts/editor-plugin.ts`,
`apply:"serve"` → never in prod) re-runs the identical gate server-side before writing
disk — defence in depth. Unsafe deletes are caught, not silently broken:

- delete a node a connection points to → `connections[i].from/to: dangling endpoint`
- delete a lane a node points to → `nodes[i].thread: thread "X" has no lane`
- duplicate node / lane / connection id, unknown citation ref, bad enum/shape

(`assembleBundle` gained a duplicate-lane-id check, since the registry is now editable.)

## Persistence (reuses the PLE-137 mechanism)

Each tab POSTs to the dev middleware (`/__editor/{nodes,lanes,connections}`), which
validates and writes the YAML **byte-compatibly with `scripts/gen-yaml.ts`** (shared
`serialize.ts`), then: git commit/push → Vercel auto-deploy → refresh reflects. The
nodes endpoint preserves the on-disk meta (anchorDate / §6 demandModel / citation
registry) so the board only ever edits the `nodes` array, never the model.

## Verification

- `npm test` 130 green (+12 PLE-138 parity/round-trip tests); `npm run build` green;
  `tsc --noEmit` clean.
- Live HTTP smoke against the dev endpoints: unsafe node delete → 422, unsafe lane
  delete → 422, bad enum → 422 (nothing written); valid round-trip → 200 with a
  **byte-identical** `git diff` on `public/data/` (serializers match the generator).
- Visual-truth renders @1440×900 + 390×844 for all three tabs:
  `docs/design/renders/ple138-{nodes,lanes,connections}-{desktop-1440,mobile-390}.png`.

## Open note for the UX gate

The Nodes form is desktop-first (two-column); on 390px the form column overflows the
master list. Acceptable for a dev-only authoring tool the board drives on desktop —
flag if the gate wants a stacked mobile layout.
