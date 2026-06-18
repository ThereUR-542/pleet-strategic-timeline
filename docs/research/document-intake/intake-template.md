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
resolvesLedger: <ledger item(s) this doc closes/affects — e.g. "§D Savanna Schools", "§C1 SQ4D contact", "§D Revenue Maximization Model"; or "none — new fact". This is the two-way join: every doc that touches an open §C/§D item MUST name it here, and the ledger item gets updated in the same change (see §6).>
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
>
> **Material** = a claim that changes a node's identity, name, date, address, or
> `confidence` flag (anything a viewer would treat as fact). Cosmetic prose wording
> is non-material and needs only ≥1 source.
>
> **Primary-vs-VERIFIED supersede rule (the board's core rule):** a primary doc may
> freely **add** a fact or **supersede an unset/`unconfirmed` value**. But when a
> primary doc **contradicts an already-VERIFIED public claim** (ledger §A), that is a
> DISCREPANCY — route to the board, do **not** auto-supersede on primary status alone.
> "Supersedes current? = yes" in the table is a *proposal*, not a green light.

## 4. Fact-base actions
What gets changed in `src/data/content.ts` once verification clears:

- [ ] Add `Citation` `cite-<slug>` for this doc. Capture the **MLA-9 slots** in the
      same form the ledger uses: *Author/Originator · "Title of source" · Container ·
      Publisher · Date · Location (URL / archive / "primary: <asset>")*. For a primary
      doc with no public locator, set Location to the asset id (`bo-jett-card.png`, the
      issue attachment id, or `inbox/...`).
- [ ] Add `MediaItem` (if a viewable asset) to node(s): `...`
- [ ] Edit node `n-...` field `...`: `<old>` → `<new>`; push `cite-<slug>` to `citationIds`.
- [ ] Set `confidence` on `n-...` → `confirmed` / `unconfirmed`.
- [ ] Append provenance row(s) to `../provenance-log.md`.

## 5. Open questions for the board (if any)
<Anything that must come from Lawrence — discrepancies, ambiguous names, etc.
Route via the issue thread, never silently resolve.>

## 6. Ledger sync (close the loop)
If `resolvesLedger` names a §C (discrepancy) or §D (open gap) item, update
`../source-ledger.md` in the **same** change so the two stay consistent:

- [ ] §D gap resolved → move the item out of §D and record the now-confirmed fact
      (to §A if double-sourced, or §B if it rests on a primary doc).
- [ ] §C discrepancy resolved by the board → annotate the §C item RESOLVED with the
      `DOC-NNN` id and the board's decision; never delete the discrepancy history.
- [ ] New fact (`resolvesLedger: none`) → no ledger move needed; the citation +
      provenance row are the audit trail.
