// =============================================================================
// Visual connection editor (PLE-137) — DEV-ONLY repo-local authoring surface.
// -----------------------------------------------------------------------------
// Reached at /editor under `npm run dev` (App.tsx route, gated by import.meta.
// env.DEV). Loads the live bundle from the SAME PLE-136 loader, lets you
// create/edit/delete connections by picking from/to nodes + kind + label, runs
// the loader's own validators inline (validate.ts) so you can never save loader-
// invalid YAML, and POSTs to the dev middleware which re-validates and writes
// public/data/connections.yaml. Then: git commit/push → Vercel auto-deploy →
// refresh reflects (the PLE-135 fast-follow workflow).
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { loadTimelineBundle } from "../data/loader";
import type { Edge, EdgeKind, Lane, TimelineData } from "../data/types";
import type { LocatedError } from "../data/schema";
import { validateConnections } from "./validate";
import { saveConnections } from "./editorApi";

const EDGE_KINDS: EdgeKind[] = [
  "introduced", "owns", "partners", "converges_on",
  "demonstrates", "depends_on", "finances", "other",
];

/** Pull the connections[] row index out of a located field path, or -1. */
function rowOf(field: string): number {
  const m = /^connections\[(\d+)\]/.exec(field);
  return m ? Number(m[1]) : -1;
}

export default function ConnectionEditor() {
  const [data, setData] = useState<TimelineData | null>(null);
  const [lanes, setLanes] = useState<Lane[]>([]);
  const [rows, setRows] = useState<Edge[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    loadTimelineBundle().then(
      (b) => { setData(b.data); setLanes(b.lanes); setRows(b.data.edges.map((e) => ({ ...e }))); },
      (e) => setLoadErr(e?.message ?? String(e)),
    );
  }, []);

  const errors: LocatedError[] = useMemo(
    () => (data ? validateConnections(rows, data, lanes) : []),
    [rows, data, lanes],
  );
  const errorsByRow = useMemo(() => {
    const m = new Map<number, LocatedError[]>();
    for (const e of errors) {
      const r = rowOf(e.field);
      const list = m.get(r) ?? [];
      list.push(e);
      m.set(r, list);
    }
    return m;
  }, [errors]);

  const nodeOptions = useMemo(
    () =>
      (data?.nodes ?? [])
        .map((n) => ({ id: n.id, title: n.title }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    [data],
  );

  if (loadErr) return <Shell><p style={S.err}>Failed to load bundle: {loadErr}</p></Shell>;
  if (!data) return <Shell><p style={{ color: "#9fb" }}>Loading bundle…</p></Shell>;

  const setRow = (i: number, patch: Partial<Edge>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const delRow = (i: number) => setRows((rs) => rs.filter((_, j) => j !== i));
  const addRow = () =>
    setRows((rs) => [
      ...rs,
      { id: `e-new-${rs.length + 1}`, from: nodeOptions[0]?.id ?? "", to: nodeOptions[0]?.id ?? "", kind: "depends_on", label: null },
    ]);

  const canSave = errors.length === 0 && !saving;

  const onSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    const res = await saveConnections(rows);
    setSaving(false);
    if (res.ok) {
      setSaveMsg({ ok: true, text: `Wrote public/data/connections.yaml (${res.count} connections). Commit & push to deploy; refresh reflects after Vercel.` });
    } else {
      setSaveMsg({ ok: false, text: res.message ?? `Save rejected (${res.status}). ${res.errors.length} located error(s) — see above.` });
    }
  };

  return (
    <Shell>
      <header style={S.head}>
        <div>
          <h1 style={S.h1}>Connection editor</h1>
          <p style={S.sub}>
            {rows.length} connections · writes <code>public/data/connections.yaml</code> · dev-only (PLE-137)
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <button onClick={onSave} disabled={!canSave} style={canSave ? S.saveBtn : S.saveBtnOff}>
            {saving ? "Saving…" : "Save → connections.yaml"}
          </button>
          {errors.length > 0 && (
            <p style={S.errCount}>{errors.length} validation error{errors.length === 1 ? "" : "s"} — fix before saving</p>
          )}
        </div>
      </header>

      {saveMsg && (
        <p style={saveMsg.ok ? S.okBanner : S.errBanner}>{saveMsg.text}</p>
      )}

      {/* file-level (non-row) located errors */}
      {(errorsByRow.get(-1) ?? []).map((e, i) => (
        <p key={i} style={S.err}>· {e.field}: {e.reason}</p>
      ))}

      <table style={S.table}>
        <thead>
          <tr>
            <th style={S.th}>id</th>
            <th style={S.th}>from</th>
            <th style={S.th}>to</th>
            <th style={S.th}>kind</th>
            <th style={S.th}>label</th>
            <th style={S.th}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const rowErrs = errorsByRow.get(i) ?? [];
            return (
              <tr key={i} style={rowErrs.length ? S.rowErr : undefined}>
                <td style={S.td}>
                  <input style={S.input} value={r.id} onChange={(e) => setRow(i, { id: e.target.value })} />
                </td>
                <td style={S.td}>
                  <NodeSelect value={r.from} options={nodeOptions} onChange={(v) => setRow(i, { from: v })} />
                </td>
                <td style={S.td}>
                  <NodeSelect value={r.to} options={nodeOptions} onChange={(v) => setRow(i, { to: v })} />
                </td>
                <td style={S.td}>
                  <select style={S.input} value={r.kind} onChange={(e) => setRow(i, { kind: e.target.value as EdgeKind })}>
                    {EDGE_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                </td>
                <td style={S.td}>
                  <input
                    style={S.input}
                    placeholder="(none)"
                    value={r.label ?? ""}
                    onChange={(e) => setRow(i, { label: e.target.value === "" ? null : e.target.value })}
                  />
                </td>
                <td style={S.td}>
                  <button style={S.delBtn} onClick={() => delRow(i)} aria-label={`Delete ${r.id}`}>✕</button>
                </td>
                {rowErrs.length > 0 && (
                  <td colSpan={6} style={S.rowErrCell}>
                    {rowErrs.map((e, j) => <div key={j}>⚠ {e.field}: {e.reason}</div>)}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      <button style={S.addBtn} onClick={addRow}>+ Add connection</button>
    </Shell>
  );
}

function NodeSelect({
  value, options, onChange,
}: {
  value: string;
  options: { id: string; title: string }[];
  onChange: (v: string) => void;
}) {
  // Allow an unknown current value (so a dangling ref is visible + flagged).
  const known = options.some((o) => o.id === value);
  return (
    <select style={S.input} value={value} onChange={(e) => onChange(e.target.value)}>
      {!known && <option value={value}>{value || "(empty)"}</option>}
      {options.map((o) => (
        <option key={o.id} value={o.id}>{o.id} — {o.title}</option>
      ))}
    </select>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div style={S.shell}>{children}</div>;
}

// ── Minimal dark styling, consistent with the app's glass/dark palette. The
// design-first gate (UXDesigner) reviews this surface; kept utilitarian for v1.
const S: Record<string, React.CSSProperties> = {
  shell: { minHeight: "100vh", background: "#0b0f17", color: "#e8eef7", padding: "24px 28px", font: "14px/1.5 system-ui, sans-serif" },
  head: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 16 },
  h1: { margin: 0, fontSize: 20, fontWeight: 600 },
  sub: { margin: "4px 0 0", color: "#8aa0bd", fontSize: 12 },
  saveBtn: { background: "#2f6df6", color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 600, cursor: "pointer" },
  saveBtnOff: { background: "#1b2436", color: "#5a6b85", border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 600, cursor: "not-allowed" },
  errCount: { color: "#ff8a8a", fontSize: 12, margin: "6px 0 0" },
  okBanner: { background: "#103022", color: "#7ef0b0", padding: "10px 12px", borderRadius: 8, border: "1px solid #1f6b46" },
  errBanner: { background: "#321015", color: "#ff9b9b", padding: "10px 12px", borderRadius: 8, border: "1px solid #6b1f2a" },
  table: { width: "100%", borderCollapse: "collapse", marginTop: 8 },
  th: { textAlign: "left", color: "#8aa0bd", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, padding: "6px 8px", borderBottom: "1px solid #1b2436" },
  td: { padding: "6px 8px", verticalAlign: "top", borderBottom: "1px solid #131a28" },
  rowErr: { background: "#1c1014" },
  rowErrCell: { color: "#ff9b9b", fontSize: 12, padding: "0 8px 8px" },
  input: { width: "100%", background: "#0f1726", color: "#e8eef7", border: "1px solid #243049", borderRadius: 6, padding: "6px 8px", font: "13px system-ui, sans-serif", boxSizing: "border-box" },
  delBtn: { background: "transparent", color: "#ff8a8a", border: "1px solid #5a2730", borderRadius: 6, padding: "4px 8px", cursor: "pointer" },
  addBtn: { marginTop: 14, background: "#16203200", color: "#9fc3ff", border: "1px dashed #2f6df6", borderRadius: 8, padding: "10px 16px", cursor: "pointer" },
  err: { color: "#ff9b9b" },
};
