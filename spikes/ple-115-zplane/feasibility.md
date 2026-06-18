# PLE-115 — Z-plane (3D rotation) feasibility & approach

**Status:** Feasibility proven with a working spike. Awaiting board direction on ambition level before integrated build. Integration coordinates with [PLE-114](/PLE/issues/PLE-114) (zoned/octopus layout).

## The headline finding
Adding a Z-plane is **feasible without throwing away the existing graph**. I built a throwaway CSS-3D spike using our *actual* node-card markup and SVG edge substrate (the same DOM React Flow renders) and rotated the whole flow in 3D, lifting each story-thread onto its own depth layer. Real perspective foreshortening, cards stay legible, edges rotate rigidly with the nodes. See attached `zplane-desktop.png` / `zplane-mobile.png`.

## The architectural principle (the most important call)
**Z must be a separable transform layer applied *over* whatever (x, y) the layout engine emits — never baked into the layout math.** The spike consumes (x, y) as opaque inputs and only adds depth. This is what lets us honor the issue's warning: [PLE-114](/PLE/issues/PLE-114) is about to change X/Y (zoned swim-lanes + octopus orthogonal routing), and the Z layer rides on top of either the current lanes or the new zoned layout unchanged. **Depth is a property we map a *semantic variable* onto** — in the spike that's *story thread* (each thread = one Z layer, so crossing edges separate into parallel planes). Other candidates: confidence (confirmed in front / unconfirmed receded), node type, or demand score.

## Approaches evaluated

| | **A. CSS 3D transforms** (recommended for v1) | **B. react-three-fiber / three.js** | **C. Hybrid (2D authoritative + r3f "3D mode")** |
|---|---|---|---|
| Reuse of existing node/edge model | **Full** — same DOM cards, same SVG edges, same layout engine | None — reimplement cards (drei `<Html>` or meshes), edges, axis, detail-panel anchoring | Partial — maintain two renderers off one data model |
| Interaction fidelity | Good while near-flat; DOM hit-testing degrades at steep tilt | Full free-orbit camera, true depth picking, lighting | Best-of-both but double the surface area |
| Perf (incl. mobile) | Compositor-accelerated, cheap; fine on mobile | WebGL overhead; mobile risk; new bundle weight | Carries B's cost when active |
| Effort to board-blessable prototype | **Low — already done** | High (renderer migration) | Highest |
| Ceiling | Rotatable "card-stack in space"; not volumetric free-fly | True volumetric 3D, orbit, fly-through | Both, at maintenance cost |

## Recommendation
**Ship v1 as Approach A (CSS 3D transforms).** It directly reuses our node/edge model and the DetailPanel/temporal work already landed, it's the fastest path to a board-blessable interactive rotation, and it degrades safely on mobile. Keep **Approach B (three.js) as a deliberate v2** *only if* the board wants full free-orbit / fly-through / volumetric depth — that's a renderer migration we should scope separately, not smuggle into v1.

## Risks & mitigations
- **Hit-testing at steep angles (A):** DOM click accuracy drops past ~45° tilt. Mitigate: clamp tilt, snap-to-flat for interaction, or overlay an invisible flat pick-plane.
- **Text legibility at angle:** steep rotation skews labels. Mitigate: clamp tilt range; optional billboarding of titles.
- **Mobile (390px):** spike shows the graph cramps and controls crowd the viewport (consistent with [PLE-97](/PLE/issues/PLE-97)). Mitigate: flatter default tilt, collapsed/docked rotation control, gentler perspective.
- **Overlays (timeline axis SVG, DetailPanel, legend):** must stay as a fixed 2D HUD, NOT rotate with the plane, or they break. Spike keeps the control panel as a fixed HUD to prove this.
- **Layout churn (PLE-114):** mitigated by the separable-Z principle above — integration waits for PLE-114's spec so we don't anchor depth to lane math that's changing.

## Proposed path after board blessing
1. Board picks ambition level (A vs B) — pending `ask_user_questions` on this issue.
2. UX gate: [@UXDesigner](agent://98cd3725-154a-4a4f-9a94-d3ae022b0143) sets the visual direction for depth (which semantic variable maps to Z, tilt range, default pose) — folds into the [PLE-114](/PLE/issues/PLE-114) spec so X/Y/Z are designed together.
3. Eng integrates the chosen approach behind a "3D" toggle on the real graph, consuming layout-emitted (x, y).
4. Visual-truth render @ 1440×900 + 390×844; board review.
