// =============================================================================
// Lanes tab of the visual editor (PLE-138). Create / edit / delete / reorder the
// swim-lane registry (PLE-133 model: id/label/order/chapter/color/zLayer) with
// no YAML. `id` is one of the 9 canonical thread keys, so "add lane" offers only
// the unused ones. Reorder is ▲▼ (swaps `order`). Validation is the PLE-136
// loader gate run live (validateLanes) against the sibling nodes + connections,
// so an UNSAFE DELETE — removing a lane a node still points to — surfaces as
// `nodes[i].thread has no lane` and blocks the save.
// =============================================================================

import { useMemo, useState } from "react";
import type { Edge, Lane, TimelineNode } from "../data/types";
import type { LocatedError } from "../data/schema";
import { validateLanes } from "./validate";
import { saveLanes } from "./editorApi";
import { S } from "./styles";
import { THREADS, type EditorMeta } from "./types";

interface Props {
  lanes: Lane[];
  setLanes: (next: Lane[]) => void;
  nodes: TimelineNode[];
  edges: Edge[];
  meta: EditorMeta;
}

function rowOf(field: string): number {
  const m = /^lanes\[(\d+)\]/.exec(field);
  return m ? Number(m[1]) : -1;
}

export default function LaneEditor({ lanes, setLanes, nodes, edges, meta }: Props) {
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const errors: LocatedError[] = useMemo(
    () => validateLanes(lanes, meta, nodes, edges),
    [lanes, meta, nodes, edges],
  );
  const errorsByRow = useMemo(() => {
    const m = new Map<number, LocatedError[]>();
    for (const e of errors) {
      const r = e.file === "lanes.yaml" ? rowOf(e.field) : -1;
      (m.get(r) ?? m.set(r, []).get(r)!).push(e);
    }
    return m;
  }, [errors]);
  // Errors caused in OTHER files by a lane edit (e.g. a node orphaned by a lane
  // delete) — shown in a banner so the cause is explicit.
  const otherErrors = useMemo(() => errors.filter((e) => e.file !== "lanes.yaml"), [errors]);

  const usedIds = new Set(lanes.map((l) => l.id));
  const freeThread = THREADS.find((t) => !usedIds.has(t));

  const set = (i: number, p: Partial<Lane>) => setLanes(lanes.map((l, j) => (j === i ? { ...l, ...p } : l)));
  const del = (i: number) => setLanes(lanes.filter((_, j) => j !== i));
  const add = () => {
    if (!freeThread) return;
    const order = lanes.reduce((mx, l) => Math.max(mx, l.order), -1) + 1;
    setLanes([...lanes, { id: freeThread, label: freeThread, order, chapter: "growth", color: `var(--thread-${freeThread})`, zLayer: 0 }]);
  };
  // ▲▼ swap the `order` values of two adjacent (by order) lanes.
  const move = (i: number, dir: -1 | 1) => {
    const sorted = [...lanes].sort((a, b) => a.order - b.order);
    const pos = sorted.findIndex((l) => l.id === lanes[i].id);
    const swap = sorted[pos + dir];
    if (!swap) return;
    const a = sorted[pos].order;
    setLanes(lanes.map((l) =>
      l.id === sorted[pos].id ? { ...l, order: swap.order } : l.id === swap.id ? { ...l, order: a } : l,
    ));
  };

  // Display order follows `order`, but edits write back to the original index.
  const display = useMemo(
    () => lanes.map((l, i) => ({ l, i })).sort((a, b) => a.l.order - b.l.order),
    [lanes],
  );

  const canSave = errors.length === 0 && !saving;
  const onSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    const res = await saveLanes(lanes);
    setSaving(false);
    setSaveMsg(
      res.ok
        ? { ok: true, text: `Wrote public/data/lanes.yaml (${res.count} lanes). Commit & push to deploy; refresh reflects after Vercel.` }
        : { ok: false, text: res.message ?? `Save rejected (${res.status}). ${res.errors.length} located error(s) — see below.` },
    );
  };

  return (
    <>
      <header style={S.head}>
        <div>
          <h1 style={S.h1}>Lanes</h1>
          <p style={S.sub}>{lanes.length} lanes · writes <code>public/data/lanes.yaml</code></p>
        </div>
        <div style={{ textAlign: "right" }}>
          <button onClick={onSave} disabled={!canSave} style={canSave ? S.saveBtn : S.saveBtnOff}>
            {saving ? "Saving…" : "Save → lanes.yaml"}
          </button>
          {errors.length > 0 && (
            <p style={S.errCount}>{errors.length} validation error{errors.length === 1 ? "" : "s"} — fix before saving</p>
          )}
        </div>
      </header>

      {saveMsg && <p style={saveMsg.ok ? S.okBanner : S.errBanner}>{saveMsg.text}</p>}
      {otherErrors.length > 0 && (
        <div style={S.errBanner}>
          {otherErrors.map((e, i) => <div key={i}>⚠ {e.file} {e.field}: {e.reason}</div>)}
        </div>
      )}

      <table style={S.table}>
        <thead>
          <tr>
            <th style={S.th}>order</th>
            <th style={S.th}>id (thread)</th>
            <th style={S.th}>label</th>
            <th style={S.th}>chapter</th>
            <th style={S.th}>color</th>
            <th style={S.th}>zLayer</th>
            <th style={S.th}></th>
          </tr>
        </thead>
        <tbody>
          {display.map(({ l, i }, pos) => {
            const rowErrs = errorsByRow.get(i) ?? [];
            return (
              <tr key={l.id + i} style={rowErrs.length ? S.rowErr : undefined}>
                <td style={S.td}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 18 }}>{l.order}</span>
                    <button style={S.iconBtn} disabled={pos === 0} onClick={() => move(i, -1)} aria-label="move up">▲</button>
                    <button style={S.iconBtn} disabled={pos === display.length - 1} onClick={() => move(i, 1)} aria-label="move down">▼</button>
                  </div>
                </td>
                <td style={S.td}>
                  <select style={S.input} value={l.id} onChange={(e) => set(i, { id: e.target.value as Lane["id"] })}>
                    {THREADS.map((t) => <option key={t} value={t} disabled={t !== l.id && usedIds.has(t)}>{t}</option>)}
                  </select>
                </td>
                <td style={S.td}><input style={S.input} value={l.label} onChange={(e) => set(i, { label: e.target.value })} /></td>
                <td style={S.td}><input style={S.input} value={l.chapter} onChange={(e) => set(i, { chapter: e.target.value })} /></td>
                <td style={S.td}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 14, height: 14, borderRadius: 3, background: l.color, border: "1px solid #2c3850", flex: "0 0 14px" }} />
                    <input style={S.input} value={l.color} onChange={(e) => set(i, { color: e.target.value })} />
                  </div>
                </td>
                <td style={S.td}><input style={{ ...S.input, width: 64 }} type="number" min={0} value={l.zLayer} onChange={(e) => set(i, { zLayer: Number(e.target.value) })} /></td>
                <td style={S.td}><button style={S.delBtn} onClick={() => del(i)} aria-label={`Delete ${l.id}`}>✕</button></td>
                {rowErrs.length > 0 && (
                  <td colSpan={7} style={S.rowErrCell}>
                    {rowErrs.map((e, j) => <div key={j}>⚠ {e.field}: {e.reason}</div>)}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      <button style={freeThread ? S.addBtn : S.addBtnOff} onClick={add} disabled={!freeThread}>
        {freeThread ? `+ Add lane (${freeThread})` : "All 9 threads have a lane"}
      </button>
    </>
  );
}
