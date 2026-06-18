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
| _—_  | _—_ | _no document-driven changes applied yet_ | | | | |
