---
# Copy this file to records/DOC-NNN.md and fill it in. Front-matter is structured so
# a future automated extractor can consume it unchanged.
docId: DOC-NNN
title: <short title of the document>
origin: <who supplied it — e.g. "Lawrence (board)", "Brady Deaton email">
docType: pdf | text | email | business-card | image | link | worksheet
received: YYYY-MM-DD          # date handed over
asset: <issue attachment id, inbox/ path, or asset URL — where the raw doc lives>
status: INTAKE | VERIFYING | APPLIED | ROUTED_TO_BOARD
---

# DOC-NNN — <title>

## 1. Summary
<2–4 lines: what this document is and why it matters to the timeline.>

## 2. Claims extracted
One row per discrete fact the document asserts. `Supersedes?` = does this change an
existing node value (yes) or add a new/unconfirmed one (no)?

| # | Claim (as the doc states it) | Candidate node id | Field | Proposed value | Supersedes current? |
|---|------------------------------|-------------------|-------|----------------|---------------------|
| 1 |                              | `n-...`           | date  |                | yes / no            |
| 2 |                              | `n-...`           | bodyMd|                |                     |

## 3. Verification (per ../source-ledger.md standard)
For each claim above, the verification outcome:

| Claim # | Outcome | Sources / basis | Notes |
|---------|---------|-----------------|-------|
| 1 | VERIFIED / PARTIAL / PRIMARY-ONLY / UNVERIFIED / DISCREPANCY | <≥2 independent for material claims; "primary: <doc>" for Lawrence's own> | |

> Standard: every researchable claim carries ≥1 verifiable source; material claims
> carry two independent sources. Lawrence's own docs are PRIMARY-ONLY (exempt from
> double-sourcing). A claim that **contradicts** existing build content is a
> DISCREPANCY → route to board, do not silently overwrite.

## 4. Fact-base actions
What gets changed in `src/data/content.ts` once verification clears:

- [ ] Add `Citation` `cite-<slug>` for this doc (MLA-9 slots).
- [ ] Add `MediaItem` (if a viewable asset) to node(s): `...`
- [ ] Edit node `n-...` field `...`: `<old>` → `<new>`; push `cite-<slug>` to `citationIds`.
- [ ] Set `confidence` on `n-...` → `confirmed` / `unconfirmed`.
- [ ] Append provenance row(s) to `../provenance-log.md`.

## 5. Open questions for the board (if any)
<Anything that must come from Lawrence — discrepancies, ambiguous names, etc.
Route via the issue thread, never silently resolve.>
