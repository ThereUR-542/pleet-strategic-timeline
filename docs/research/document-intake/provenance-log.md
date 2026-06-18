# Fact-base Provenance Log

**Append-only.** One row per fact changed by a supplied document. This is the audit
trail required by [PLE-113](/PLE/issues/PLE-113): *which document changed which fact*.
Old values are preserved here so every supersede is reversible and auditable. Never
delete or rewrite a row — correct with a new row.

Columns:
- **Date** — when the change was applied to `src/data/content.ts`.
- **Doc** — intake record id (`DOC-NNN`, see `records/`).
- **Node.field** — what was changed (e.g. `n-mayor-nichols.bodyMd`).
- **Old → New** — prior value → new value (summarize long prose).
- **Citation** — `citationId` added to the node's `citationIds`.
- **Confidence** — resulting `confidence` flag.
- **By** — who applied it.

| Date | Doc | Node.field | Old → New | Citation | Confidence | By |
|------|-----|------------|-----------|----------|------------|----|
| 2026-06-18 | DOC-001 | `n-aiman-hussain.confidence` | `unconfirmed` → `confirmed` | _(cite-sq4d-mpsa pending PLE-117)_ | confirmed | CTO |
| 2026-06-18 | DOC-001 | `n-aiman-hussain.title` | "Aiman Hussein — SQ4D contact (affiliation unverified)" → "Aiman Hussein — VP of Operations, SQ4D" | _pending PLE-117_ | confirmed | CTO |
| 2026-06-18 | DOC-001 / DOC-004 | `n-aiman-hussain.bodyMd` | "SQ4D Inc., 400 David Court, Calverton NY; Alquist 3D conflation; no contract asserted" → "VP of Operations, SQ4D, LLC (NY); Alquist conflation resolved; spelling Hussein" (entity Inc.→LLC; Calverton address removed — was Skydive Long Island) | _pending PLE-117_ | confirmed | CTO |
| 2026-06-18 | DOC-001 | `n-sq4d-contact.confidence` | `unconfirmed` → `confirmed` | _pending PLE-117_ | confirmed | CTO |
| 2026-06-18 | DOC-001 / DOC-004 | `n-sq4d-contact.bodyMd` | "SQ4D Inc. … Calverton NY … intentionally TBD / aspirational; no contract asserted" → "VP of Operations, SQ4D, LLC; executed Master Purchase & Services Agreement; equipment purchase contracted (acquisition cost \$1,289,784.34); broader deployment forward-looking" | _pending PLE-117_ | confirmed | CTO |

> Note on dates: confidence/wording supersedes above were applied to `src/data/content.ts` in commit `3f24571` (PLE-109); this log backfills the audit rows per the PLE-113 intake process. The `Citation` column is left _pending_ because formal MLA-9 `Citation`/`citationIds` wiring is owned by [PLE-117](/PLE/issues/PLE-117) (Engineering Lead) — DOC-001..006 records name the intended `cite-*` slugs. DOC-002/003/005/006 added no node-value supersede (corroborating / new-fact / provenance-only) and therefore have no row here; see their records for the §B5 ledger sync.
