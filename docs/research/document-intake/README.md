# Supplementary Document Intake (v1) — board PDFs/texts → fact-base updates

**Owner:** CTO (process) · **Consumer:** Research Lead (verification + ledger) · **Status:** v1 proposal — [PLE-113](/PLE/issues/PLE-113)

## What this solves

The board (Lawrence) will keep handing over **PDFs and other texts later** — emails,
worksheets, City of Tulsa housing docs, the Revenue Maximization Model, business
cards — that **supplement or correct** timeline facts and dates ("abnormalities").
This is the process that turns a dropped-in document into a **traceable** change to
the fact-base, with **provenance** (which doc changed which fact) recorded.

v1 is deliberately **lightweight and human-driven** — a *structured intake* the
research workstream consumes, **not** automated NLP. The data shapes are designed so
a later version can automate extraction without changing the format.

## The key insight — provenance already exists

The fact-base (`src/data/content.ts`) already has a provenance primitive, so **no
schema change is needed for v1**:

- A supplied document → a **`MediaItem`** (`kind: "pdf"` / `"image"` / `"link"`) on the node.
- Its bibliographic record → a **`Citation`** (MLA-9 slots) in the `CITATIONS` array.
- The node's **`citationIds`** join the fact to the document that backs it.
- The node's **`confidence`** flag gates anything not yet double-sourced.

So "which doc changed which fact" = node → `citationId` → doc, plus the append-only
**provenance log** below. We are giving the existing primitive a *front door*.

## The flow (5 steps)

```
 (1) DROP            (2) INTAKE             (3) VERIFY            (4) APPLY            (5) PROVENANCE
 board hands     →   research opens     →   double-source    →   edit content.ts  →  append a row to
 over a doc          an intake record       per ledger std       (node + citation     provenance-log.md
 (attach to          (copy the template)    (VERIFIED /          + media), flip       (doc → node.field →
 the issue or                               DISCREPANCY/…)       confidence           old → new → citeId)
 docs/research/                                                  as warranted
 inbox/)
```

1. **Drop.** The board submits a doc one of two ways:
   - **Preferred:** attach the file to a Paperclip issue (the intake issue, or [PLE-113](/PLE/issues/PLE-113)) — `POST /api/.../issues/{id}/attachments`. Attachments are durable and visible to cloud reviewers.
   - **Repo:** commit the file under `docs/research/inbox/` (small text/PDF only; large binaries go to the asset store / issue attachment).
   - The board does **not** need to format anything — handing over the raw doc is enough. Rule #1: an agent does the intake, never the human.
2. **Intake.** Research Lead (or CTO) copies `intake-template.md` to `records/DOC-NNN.md`, assigns the next `DOC-NNN` id, and fills what the doc says: origin, type, summary, and the **claims** it makes (each claim → candidate node + field + proposed value + whether it *supersedes* a current value).
3. **Verify.** Apply the existing ledger standard (`../source-ledger.md`): every researchable claim ≥1 source; material claims **two independent** sources. Primary sources (Lawrence's own docs) are exempt from double-sourcing but a *contradiction* with independent research is flagged `DISCREPANCY` and routed to the board — never silently overwritten.
4. **Apply.** Make the change in `src/data/content.ts`:
   - Edit the node field(s) (`date`, `title`, `bodyMd`, `keyFacts`, …).
   - Add a `Citation` for the doc and push its id onto the node's `citationIds`.
   - If the doc is a viewable asset, add a `MediaItem`.
   - Set `confidence`: `confirmed` only when the ledger standard is met (or it is a primary source); otherwise leave/move to `unconfirmed` so it renders "pending verification" (§12).
   - **Supersede, don't destroy:** when a doc corrects an existing value, the *old* value is preserved in the provenance log (step 5), so the change is auditable and reversible.
5. **Provenance.** Append one row per changed fact to `provenance-log.md`: `DOC-NNN → node-id.field → old → new → citationId → date → who`. This is the audit trail the acceptance criteria require.

## Roles

- **Board (Lawrence):** hands over the doc. Nothing else required.
- **Research Lead** (`agent://45fa239d-3c27-4e69-a022-6b7d60792b82`): owns intake records, verification, and the `source-ledger.md` standard this reuses.
- **CTO:** owns this process/format and routes discrepancies up to the board.
- **Backend/content:** applies the verified change to `content.ts` (or Research Lead does, since content is data not code — §7).

## What v1 is NOT (deferred to v2, gated on board demand)

- Automated PDF text extraction / NLP claim mining.
- An in-app upload widget on the timeline itself.
- Auto-writing `content.ts` from an intake record.

These are real follow-ups but **not** needed to satisfy PLE-113's acceptance criteria
(board can hand over a doc and have it traceably update the fact-base, with provenance
recorded). v1 meets both with the structured intake + provenance log above.

## Files in this directory

- `README.md` — this process.
- `intake-template.md` — copy per document into `records/DOC-NNN.md`.
- `provenance-log.md` — append-only audit trail of doc → fact changes.
- `records/` — one intake record per submitted document (`DOC-001.md`, …).
- `inbox/` — landing spot for small repo-committed source docs.
