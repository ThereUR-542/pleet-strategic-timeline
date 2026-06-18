// =============================================================================
// Graceful data-failure screen (PLE-136 scope 3 — board requirement).
// -----------------------------------------------------------------------------
// When the YAML content fails to load/parse/validate, the app renders THIS
// instead of a blank/white screen: a clear, board-grade panel that names the
// FILE, the FIELD, and the REASON for every problem, plus a Retry. Styling is
// inline-token so it works even if the stylesheets are the thing that loaded
// fine but the data did not.
// =============================================================================

import type { LocatedError } from "../data/schema";
import { TimelineDataError } from "../data/schema";

function asLocated(error: unknown): { summary: string; rows: LocatedError[] } {
  if (error instanceof TimelineDataError) {
    return { summary: error.message, rows: error.errors };
  }
  const msg = error instanceof Error ? error.message : String(error);
  return { summary: "Failed to load timeline content", rows: [{ file: "nodes.yaml", field: "(unknown)", reason: msg }] };
}

export function DataErrorScreen({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { summary, rows } = asLocated(error);
  return (
    <div role="alert" style={S.wrap}>
      <div style={S.card}>
        <div style={S.badge}>Content failed to load</div>
        <h1 style={S.h1}>The timeline data could not be loaded</h1>
        <p style={S.lead}>{summary}</p>
        <ul style={S.list}>
          {rows.map((r, i) => (
            <li key={i} style={S.row}>
              <code style={S.file}>{r.file}</code>
              <code style={S.field}>{r.field}</code>
              <span style={S.reason}>{r.reason}</span>
            </li>
          ))}
        </ul>
        <p style={S.hint}>
          Fix the field above in the corresponding <code>data/*.yaml</code> file,
          commit &amp; push (Vercel redeploys), then reload.
        </p>
        {onRetry && (
          <button type="button" onClick={onRetry} style={S.btn}>
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

/** Lightweight loading state shown while the YAML is fetched. */
export function DataLoadingScreen() {
  return (
    <div style={S.wrap} aria-busy="true">
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
      <div style={{ ...S.card, textAlign: "center" }}>
        <div style={S.spinner} aria-hidden="true" />
        <p style={S.lead}>Loading timeline…</p>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: "100vh", display: "grid", placeItems: "center", padding: 24,
    background: "radial-gradient(1200px 800px at 50% -10%, #16233b 0%, #0b1120 60%, #070b14 100%)",
    color: "#e2e8f0", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  },
  card: {
    maxWidth: 760, width: "100%", padding: "28px 32px", borderRadius: 16,
    background: "rgba(20,28,46,0.72)", border: "1px solid rgba(148,163,184,0.22)",
    boxShadow: "0 24px 60px rgba(0,0,0,0.45)", backdropFilter: "blur(12px)",
  },
  badge: {
    display: "inline-block", fontSize: 12, fontWeight: 600, letterSpacing: 0.4,
    color: "#fca5a5", background: "rgba(248,113,113,0.12)",
    border: "1px solid rgba(248,113,113,0.35)", borderRadius: 999, padding: "4px 12px",
  },
  h1: { fontSize: 22, margin: "14px 0 6px", color: "#f1f5f9" },
  lead: { margin: "0 0 16px", color: "#cbd5e1", fontSize: 15 },
  list: { listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 },
  row: {
    display: "grid", gridTemplateColumns: "minmax(120px,auto) minmax(120px,auto) 1fr",
    gap: 12, alignItems: "baseline", padding: "10px 12px", borderRadius: 10,
    background: "rgba(2,6,23,0.5)", border: "1px solid rgba(148,163,184,0.14)",
  },
  file: { color: "#fbbf24", fontSize: 13 },
  field: { color: "#7dd3fc", fontSize: 13 },
  reason: { color: "#e2e8f0", fontSize: 13 },
  hint: { marginTop: 18, color: "#94a3b8", fontSize: 13 },
  btn: {
    marginTop: 16, padding: "9px 18px", borderRadius: 10, cursor: "pointer",
    color: "#0b1120", background: "#38bdf8", border: "none", fontWeight: 600, fontSize: 14,
  },
  spinner: {
    width: 36, height: 36, margin: "0 auto 14px", borderRadius: "50%",
    border: "3px solid rgba(148,163,184,0.25)", borderTopColor: "#38bdf8",
    animation: "spin 0.8s linear infinite",
  },
};
