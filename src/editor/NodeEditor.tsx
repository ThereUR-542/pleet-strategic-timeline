// =============================================================================
// Nodes tab of the visual editor (PLE-138). Master list (left) + a field form
// (right) so the board can create / edit / delete a TimelineNode without ever
// touching YAML. Every field in types.ts is a form control. Validation is the
// PLE-136 loader gate run live (validateNodes) against the sibling lanes +
// connections, so an UNSAFE DELETE — removing a node a connection still points
// to — surfaces as a dangling-endpoint error and blocks the save. On save the
// dev middleware preserves the on-disk meta and writes nodes.yaml.
// =============================================================================

import { useMemo, useState } from "react";
import type { Confidence, Edge, Lane, MediaItem, MediaKind, NodeType, TimelineNode } from "../data/types";
import type { LocatedError } from "../data/schema";
import { validateNodes } from "./validate";
import { saveNodes } from "./editorApi";
import { S } from "./styles";
import type { EditorMeta } from "./types";

const NODE_TYPES: NodeType[] = ["person", "project", "event", "concept"];
const CONFIDENCES: Confidence[] = ["confirmed", "unconfirmed"];
const MEDIA_KINDS: MediaKind[] = ["pdf", "image", "map", "video", "link"];

interface Props {
  nodes: TimelineNode[];
  setNodes: (next: TimelineNode[]) => void;
  lanes: Lane[];
  edges: Edge[];
  meta: EditorMeta;
}

function rowOf(field: string): number {
  const m = /^nodes\[(\d+)\]/.exec(field);
  return m ? Number(m[1]) : -1;
}

function blankNode(n: number, anchorDate: string, lanes: Lane[]): TimelineNode {
  return {
    id: `n-new-${n}`,
    type: "event",
    title: "New node",
    date: anchorDate,
    dateStart: null,
    dateEnd: null,
    thread: lanes[0]?.id ?? null,
    summary: "",
    bodyMd: "",
    demandScore: null,
    media: [],
    citationIds: [],
    confidence: "unconfirmed", // safe default — gated as "pending verification" (§12)
  };
}

export default function NodeEditor({ nodes, setNodes, lanes, edges, meta }: Props) {
  const [selId, setSelId] = useState<string | null>(nodes[0]?.id ?? null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const errors: LocatedError[] = useMemo(
    () => validateNodes(nodes, meta, lanes, edges),
    [nodes, meta, lanes, edges],
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
  // Anything not attributable to a node row (e.g. a connection left dangling by
  // an unsafe delete) — surfaced as a top banner so the board sees the cause.
  const otherErrors = useMemo(
    () => errors.filter((e) => e.file !== "nodes.yaml" || rowOf(e.field) === -1),
    [errors],
  );

  const selIndex = nodes.findIndex((n) => n.id === selId);
  const sel = selIndex >= 0 ? nodes[selIndex] : null;

  const patch = (p: Partial<TimelineNode>) =>
    setNodes(nodes.map((n, j) => (j === selIndex ? { ...n, ...p } : n)));
  const addNode = () => {
    const node = blankNode(nodes.length + 1, meta.anchorDate, lanes);
    setNodes([...nodes, node]);
    setSelId(node.id);
  };
  const delNode = () => {
    if (selIndex < 0) return;
    const next = nodes.filter((_, j) => j !== selIndex);
    setNodes(next);
    setSelId(next[Math.max(0, selIndex - 1)]?.id ?? null);
  };

  const canSave = errors.length === 0 && !saving;
  const onSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    const res = await saveNodes(nodes);
    setSaving(false);
    setSaveMsg(
      res.ok
        ? { ok: true, text: `Wrote public/data/nodes.yaml (${res.count} nodes). Commit & push to deploy; refresh reflects after Vercel.` }
        : { ok: false, text: res.message ?? `Save rejected (${res.status}). ${res.errors.length} located error(s) — see below.` },
    );
  };

  return (
    <>
      <header style={S.head}>
        <div>
          <h1 style={S.h1}>Nodes</h1>
          <p style={S.sub}>{nodes.length} nodes · writes <code>public/data/nodes.yaml</code></p>
        </div>
        <div style={{ textAlign: "right" }}>
          <button onClick={onSave} disabled={!canSave} style={canSave ? S.saveBtn : S.saveBtnOff}>
            {saving ? "Saving…" : "Save → nodes.yaml"}
          </button>
          {errors.length > 0 && (
            <p style={S.errCount}>{errors.length} validation error{errors.length === 1 ? "" : "s"} — fix before saving</p>
          )}
        </div>
      </header>

      {saveMsg && <p style={saveMsg.ok ? S.okBanner : S.errBanner}>{saveMsg.text}</p>}
      {otherErrors.length > 0 && (
        <div style={S.errBanner}>
          {otherErrors.map((e, i) => (
            <div key={i}>⚠ {e.file} {e.field}: {e.reason}</div>
          ))}
        </div>
      )}

      <div style={S.twoCol}>
        <div style={S.list}>
          {nodes.map((n, i) => {
            const bad = (errorsByRow.get(i) ?? []).length > 0;
            return (
              <div
                key={n.id + i}
                style={{ ...S.listItem, ...(n.id === selId ? S.listItemActive : {}), ...(bad ? { color: "#ff9b9b" } : {}) }}
                onClick={() => setSelId(n.id)}
              >
                <span>{bad ? "⚠ " : ""}{n.title || "(untitled)"}</span>
                <span style={S.listId}>{n.id}</span>
              </div>
            );
          })}
          <button style={S.addBtn} onClick={addNode}>+ Add node</button>
        </div>

        {sel ? (
          <div style={S.form}>
            <Field label="id"><input style={S.input} value={sel.id} onChange={(e) => patch({ id: e.target.value })} /></Field>
            <Field label="title"><input style={S.input} value={sel.title} onChange={(e) => patch({ title: e.target.value })} /></Field>
            <Field label="type">
              <select style={S.input} value={sel.type} onChange={(e) => {
                const type = e.target.value as NodeType;
                patch(type === "project" ? { type } : { type, demandScore: null });
              }}>
                {NODE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="thread / lane">
              <select style={S.input} value={sel.thread ?? ""} onChange={(e) => patch({ thread: e.target.value === "" ? null : (e.target.value as Lane["id"]) })}>
                <option value="">(none)</option>
                {lanes.map((l) => <option key={l.id} value={l.id}>{l.id} — {l.label}</option>)}
                {sel.thread && !lanes.some((l) => l.id === sel.thread) && <option value={sel.thread}>{sel.thread} (no lane!)</option>}
              </select>
            </Field>
            <Field label="date"><DateInput value={sel.date} onChange={(v) => patch({ date: v })} /></Field>
            <Field label="dateStart"><DateInput value={sel.dateStart} onChange={(v) => patch({ dateStart: v })} /></Field>
            <Field label="dateEnd"><DateInput value={sel.dateEnd} onChange={(v) => patch({ dateEnd: v })} /></Field>
            <Field label="confidence">
              <select style={S.input} value={sel.confidence} onChange={(e) => patch({ confidence: e.target.value as Confidence })}>
                {CONFIDENCES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            {sel.type === "project" && (
              <Field label="demandScore (0–100)">
                <input style={S.input} type="number" min={0} max={100} value={sel.demandScore ?? ""}
                  onChange={(e) => patch({ demandScore: e.target.value === "" ? null : Number(e.target.value) })} />
              </Field>
            )}
            <Field label="antecedent">
              <label style={S.checkRow}>
                <input type="checkbox" checked={!!sel.isAntecedent} onChange={(e) => patch({ isAntecedent: e.target.checked || undefined })} />
                <span style={S.sub}>ghost / predates its thread (PLE-120)</span>
              </label>
            </Field>

            <Field label="summary" full><input style={S.input} value={sel.summary} onChange={(e) => patch({ summary: e.target.value })} /></Field>
            <Field label="bodyMd (markdown)" full><textarea style={S.textarea} value={sel.bodyMd} onChange={(e) => patch({ bodyMd: e.target.value })} /></Field>
            <Field label="keyFacts (one per line)" full>
              <textarea style={S.textarea} value={(sel.keyFacts ?? []).join("\n")}
                onChange={(e) => {
                  const lines = e.target.value.split("\n").map((s) => s.trim()).filter(Boolean);
                  patch({ keyFacts: lines.length ? lines : undefined });
                }} />
            </Field>

            <Field label="citations" full>
              <div style={S.scrollBox}>
                {meta.citations.length === 0 && <span style={S.sub}>No citations in registry.</span>}
                {meta.citations.map((c) => (
                  <label key={c.id} style={{ ...S.checkRow, padding: "2px 0" }}>
                    <input type="checkbox" checked={sel.citationIds.includes(c.id)}
                      onChange={(e) => patch({
                        citationIds: e.target.checked
                          ? [...sel.citationIds, c.id]
                          : sel.citationIds.filter((x) => x !== c.id),
                      })} />
                    <span><span style={S.listId}>{c.id}</span> — {c.titleSource ?? c.author ?? c.intextKey}</span>
                  </label>
                ))}
              </div>
            </Field>

            <Field label="media" full>
              <MediaEditor media={sel.media} onChange={(media) => patch({ media })} citationIds={meta.citations.map((c) => c.id)} />
            </Field>

            <div style={S.fieldFull}>
              <button style={S.delBtn} onClick={delNode}>✕ Delete this node</button>
              {(errorsByRow.get(selIndex) ?? []).map((e, j) => (
                <div key={j} style={{ ...S.err, fontSize: 12, marginTop: 6 }}>⚠ {e.field.replace(/^nodes\[\d+\]\.?/, "") || "(node)"}: {e.reason}</div>
              ))}
            </div>
          </div>
        ) : (
          <div style={S.form}><p style={S.sub}>No node selected. Use “+ Add node”.</p></div>
        )}
      </div>
    </>
  );
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  if (full) {
    return (
      <div style={S.fieldFull}>
        <div style={{ ...S.fieldLabel, paddingTop: 0, marginBottom: 4 }}>{label}</div>
        {children}
      </div>
    );
  }
  return (
    <>
      <div style={S.fieldLabel}>{label}</div>
      <div>{children}</div>
    </>
  );
}

/** ISO date `YYYY-MM-DD` or null; native date picker with a clear button. */
function DateInput({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <input style={S.input} type="date" value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)} />
      {value && <button style={S.iconBtn} onClick={() => onChange(null)} title="clear">∅</button>}
    </div>
  );
}

function MediaEditor({
  media, onChange, citationIds,
}: {
  media: MediaItem[];
  onChange: (m: MediaItem[]) => void;
  citationIds: string[];
}) {
  const set = (i: number, p: Partial<MediaItem>) => onChange(media.map((m, j) => (j === i ? { ...m, ...p } : m)));
  const add = () => onChange([...media, { id: `m-new-${media.length + 1}`, kind: "link", src: "", caption: null, citationIds: [], opensExternal: true }]);
  const del = (i: number) => onChange(media.filter((_, j) => j !== i));
  return (
    <div style={{ ...S.scrollBox, maxHeight: 220 }}>
      {media.length === 0 && <span style={S.sub}>No media attached.</span>}
      {media.map((m, i) => (
        <div key={i} style={{ borderBottom: "1px solid #131a28", padding: "6px 0", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <input style={S.input} placeholder="id" value={m.id} onChange={(e) => set(i, { id: e.target.value })} />
          <select style={S.input} value={m.kind} onChange={(e) => set(i, { kind: e.target.value as MediaKind })}>
            {MEDIA_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <input style={{ ...S.input, gridColumn: "1 / -1" }} placeholder="src (url/embed)" value={m.src} onChange={(e) => set(i, { src: e.target.value })} />
          <input style={{ ...S.input, gridColumn: "1 / -1" }} placeholder="caption (optional)" value={m.caption ?? ""} onChange={(e) => set(i, { caption: e.target.value === "" ? null : e.target.value })} />
          <input style={S.input} placeholder="citationIds (comma)" value={m.citationIds.join(",")}
            onChange={(e) => set(i, { citationIds: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
            title={`known: ${citationIds.join(", ") || "(none)"}`} />
          <label style={S.checkRow}>
            <input type="checkbox" checked={m.opensExternal} onChange={(e) => set(i, { opensExternal: e.target.checked })} />
            <span style={S.sub}>opens external</span>
            <button style={{ ...S.delBtn, marginLeft: "auto" }} onClick={() => del(i)}>✕</button>
          </label>
        </div>
      ))}
      <button style={{ ...S.iconBtn, marginTop: 6 }} onClick={add}>+ media</button>
    </div>
  );
}
