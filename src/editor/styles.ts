// =============================================================================
// Shared editor chrome (PLE-137 + PLE-138). One dark/glass palette across the
// Nodes / Lanes / Connections tabs of the dev-only /editor surface, so the three
// authoring tools look like one tool (board directive: "the same editor surface,
// not a separate tool"). The connection editor (PLE-137) imports `S` + `Shell`
// from here too, so the surfaces can never visually drift.
// =============================================================================

import type { CSSProperties } from "react";

export const S: Record<string, CSSProperties> = {
  shell: { minHeight: "100vh", background: "#0b0f17", color: "#e8eef7", padding: "24px 28px", font: "14px/1.5 system-ui, sans-serif" },

  // Tab bar across the top of the shell.
  tabBar: { display: "flex", gap: 4, borderBottom: "1px solid #1b2436", marginBottom: 18 },
  tab: { background: "transparent", color: "#8aa0bd", border: "none", borderBottom: "2px solid transparent", padding: "10px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  tabActive: { color: "#e8eef7", borderBottom: "2px solid #2f6df6" },

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
  textarea: { width: "100%", background: "#0f1726", color: "#e8eef7", border: "1px solid #243049", borderRadius: 6, padding: "6px 8px", font: "13px system-ui, sans-serif", boxSizing: "border-box", minHeight: 72, resize: "vertical" },

  delBtn: { background: "transparent", color: "#ff8a8a", border: "1px solid #5a2730", borderRadius: 6, padding: "4px 8px", cursor: "pointer" },
  iconBtn: { background: "transparent", color: "#9fc3ff", border: "1px solid #243049", borderRadius: 6, padding: "2px 8px", cursor: "pointer", lineHeight: 1.4 },
  addBtn: { marginTop: 14, background: "transparent", color: "#9fc3ff", border: "1px dashed #2f6df6", borderRadius: 8, padding: "10px 16px", cursor: "pointer" },
  addBtnOff: { marginTop: 14, background: "transparent", color: "#5a6b85", border: "1px dashed #2c3850", borderRadius: 8, padding: "10px 16px", cursor: "not-allowed" },
  err: { color: "#ff9b9b" },

  // Master/detail node editor.
  twoCol: { display: "flex", gap: 20, alignItems: "flex-start" },
  list: { width: 300, flex: "0 0 300px", maxHeight: "72vh", overflowY: "auto", border: "1px solid #1b2436", borderRadius: 8 },
  listItem: { display: "flex", justifyContent: "space-between", gap: 8, padding: "8px 10px", borderBottom: "1px solid #131a28", cursor: "pointer", color: "#cdd9ec" },
  listItemActive: { background: "#16203a", color: "#fff" },
  listId: { color: "#6f86a8", fontSize: 11, fontFamily: "ui-monospace, monospace" },
  form: { flex: 1, minWidth: 0, display: "grid", gridTemplateColumns: "140px 1fr", gap: "10px 14px", alignItems: "start" },
  fieldLabel: { color: "#8aa0bd", fontSize: 12, paddingTop: 8 },
  fieldFull: { gridColumn: "1 / -1" },
  checkRow: { display: "flex", alignItems: "center", gap: 8 },
  scrollBox: { maxHeight: 160, overflowY: "auto", border: "1px solid #243049", borderRadius: 6, padding: "6px 8px", background: "#0f1726" },
  chip: { display: "inline-block", fontSize: 11, color: "#9fc3ff", background: "#13203a", border: "1px solid #243049", borderRadius: 999, padding: "1px 8px", marginRight: 6 },
};
