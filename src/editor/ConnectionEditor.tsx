// =============================================================================
// Connections tab of the visual editor (PLE-137). Presentational: the shared
// EditorShell (PLE-138) owns bundle loading + cross-tab state and passes the
// edited edges + sibling nodes/lanes/meta in. Lets you create/edit/delete
// connections by picking from/to nodes + kind + label, runs the loader's own
// validators inline (validate.ts) so you can never save loader-invalid YAML, and
// POSTs to the dev middleware which re-validates + writes connections.yaml.
// =============================================================================

import { useMemo, useState } from "react";
import type { Edge, EdgeKind, Lane, TimelineNode } from "../data/types";
import type { LocatedError } from "../data/schema";
import { validateConnections } from "./validate";
import { saveConnections } from "./editorApi";
import { S } from "./styles";
import type { EditorMeta } from "./types";

const EDGE_KINDS: EdgeKind[] = [
  "introduced", "owns", "partners", "converges_on",
  "demonstrates", "depends_on", "finances", "other",
];

interface Props {
  edges: Edge[];
  setEdges: (next: Edge[]) => void;
  nodes: TimelineNode[];
  lanes: Lane[];
  meta: EditorMeta;
}

/** Pull the connections[] row index out of a located field path, or -1. */
function rowOf(field: string): number {
  const m = /^connections\[(\d+)\]/.exec(field);
  return m ? Number(m[1]) : -1;
}

export default function ConnectionEditor({ edges, setEdges, nodes, lanes, meta }: Props) {
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const data = useMemo(() => ({ ...meta, nodes }), [meta, nodes]);
  const errors: LocatedError[] = useMemo(
    () => validateConnections(edges, data, lanes),
    [edges, data, lanes],
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
    () => nodes.map((n) => ({ id: n.id, title: n.title })).sort((a, b) => a.id.localeCompare(b.id)),
    [nodes],
  );

  const setRow = (i: number, patch: Partial<Edge>) =>
    setEdges(edges.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const delRow = (i: number) => setEdges(edges.filter((_, j) => j !== i));
  const addRow = () =>
    setEdges([
      ...edges,
      { id: `e-new-${edges.length + 1}`, from: nodeOptions[0]?.id ?? "", to: nodeOptions[0]?.id ?? "", kind: "depends_on", label: null },
    ]);

  const canSave = errors.length === 0 && !saving;
  const onSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    const res = await saveConnections(edges);
    setSaving(false);
    setSaveMsg(
      res.ok
        ? { ok: true, text: `Wrote public/data/connections.yaml (${res.count} connections). Commit & push to deploy; refresh reflects after Vercel.` }
        : { ok: false, text: res.message ?? `Save rejected (${res.status}). ${res.errors.length} located error(s) — see above.` },
    );
  };

  return (
    <>
      <header style={S.head}>
        <div>
          <h1 style={S.h1}>Connections</h1>
          <p style={S.sub}>{edges.length} connections · writes <code>public/data/connections.yaml</code></p>
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

      {saveMsg && <p style={saveMsg.ok ? S.okBanner : S.errBanner}>{saveMsg.text}</p>}

      {(errorsByRow.get(-1) ?? []).map((e, i) => (
        <p key={i} style={S.err}>· {e.file} {e.field}: {e.reason}</p>
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
          {edges.map((r, i) => {
            const rowErrs = errorsByRow.get(i) ?? [];
            return (
              <tr key={i} style={rowErrs.length ? S.rowErr : undefined}>
                <td style={S.td}><input style={S.input} value={r.id} onChange={(e) => setRow(i, { id: e.target.value })} /></td>
                <td style={S.td}><NodeSelect value={r.from} options={nodeOptions} onChange={(v) => setRow(i, { from: v })} /></td>
                <td style={S.td}><NodeSelect value={r.to} options={nodeOptions} onChange={(v) => setRow(i, { to: v })} /></td>
                <td style={S.td}>
                  <select style={S.input} value={r.kind} onChange={(e) => setRow(i, { kind: e.target.value as EdgeKind })}>
                    {EDGE_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                </td>
                <td style={S.td}>
                  <input style={S.input} placeholder="(none)" value={r.label ?? ""}
                    onChange={(e) => setRow(i, { label: e.target.value === "" ? null : e.target.value })} />
                </td>
                <td style={S.td}><button style={S.delBtn} onClick={() => delRow(i)} aria-label={`Delete ${r.id}`}>✕</button></td>
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
    </>
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
      {options.map((o) => <option key={o.id} value={o.id}>{o.id} — {o.title}</option>)}
    </select>
  );
}
