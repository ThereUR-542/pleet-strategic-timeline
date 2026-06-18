---
docId: DOC-EXAMPLE
title: "(WORKED EXAMPLE — not a real submission) Tulsa mayor confirmation packet"
origin: "Illustrative — based on ledger §A1 public sources"
docType: pdf
received: 2026-06-18
asset: docs/research/inbox/ (none — example only)
status: APPLIED
---

# DOC-EXAMPLE — Worked example of the intake flow

> This is a **teaching example**, not a real board submission. It shows what a filled
> record looks like end-to-end, reusing the already-verified Mayor Nichols case from
> `../source-ledger.md` §A1. Real records start at `DOC-001`.

## 1. Summary
A packet confirming Tulsa's current mayor. The build's `n-mayor-nichols` node was
gated "Official title pending verification (§12)". This doc resolves the abnormality.

## 2. Claims extracted

| # | Claim (as the doc states it) | Candidate node id | Field | Proposed value | Supersedes current? |
|---|------------------------------|-------------------|-------|----------------|---------------------|
| 1 | Monroe Nichols IV is the 41st Mayor of Tulsa | `n-mayor-nichols` | bodyMd / title | "Mayor Monroe Nichols IV — 41st Mayor of Tulsa (took office Dec 2, 2024)" | yes |
| 2 | Sworn in 2 Dec 2024 | `n-mayor-nichols` | date | 2024-12-02 | yes (was unset) |

## 3. Verification (per ../source-ledger.md standard)

| Claim # | Outcome | Sources / basis | Notes |
|---------|---------|-----------------|-------|
| 1 | VERIFIED | City of Tulsa press release (2 Dec 2024) + PBS NewsHour (Nov 2024); FOX23 corroboration | Two independent reputable sources → material claim cleared |
| 2 | VERIFIED | same | |

## 4. Fact-base actions

- [x] Add `Citation` `cite-tulsa-mayor-press` + `cite-pbs-tulsa-mayor` (MLA-9 slots).
- [x] Edit `n-mayor-nichols.bodyMd`: remove "Official title pending verification (§12)"; set body to confirmed title + date.
- [x] Push both citation ids to `n-mayor-nichols.citationIds`.
- [x] Set `confidence` on `n-mayor-nichols` → `confirmed` (was `unconfirmed`).
- [x] Append provenance rows to `../provenance-log.md`.

## 5. Open questions for the board
None — fully public and double-sourced.
