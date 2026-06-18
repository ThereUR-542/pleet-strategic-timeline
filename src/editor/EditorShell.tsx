// =============================================================================
// Visual editor shell (PLE-138) — DEV-ONLY, one surface, three tabs.
// -----------------------------------------------------------------------------
// Board directive (Lawrence, PLE-135): a non-technical editor for nodes, lanes
// AND connections, "the same editor surface, not a separate tool". This shell
// loads the live bundle once (the SAME PLE-136 loader), holds nodes / lanes /
// connections as cross-tab state, and mounts Nodes | Lanes | Connections under a
// tab bar. Each tab validates against its live siblings (so cross-file checks —
// unsafe deletes, dangling refs — are accurate before save) and persists via the
// PLE-137 dev middleware. Reached at /editor under `npm run dev` only.
// =============================================================================

import { useEffect, useState } from "react";
import { loadTimelineBundle } from "../data/loader";
import type { Edge, Lane, TimelineNode } from "../data/types";
import { S } from "./styles";
import type { EditorMeta } from "./types";
import NodeEditor from "./NodeEditor";
import LaneEditor from "./LaneEditor";
import ConnectionEditor from "./ConnectionEditor";

type Tab = "nodes" | "lanes" | "connections";
const TABS: { key: Tab; label: string }[] = [
  { key: "nodes", label: "Nodes" },
  { key: "lanes", label: "Lanes" },
  { key: "connections", label: "Connections" },
];

export default function EditorShell() {
  const [meta, setMeta] = useState<EditorMeta | null>(null);
  const [nodes, setNodes] = useState<TimelineNode[]>([]);
  const [lanes, setLanes] = useState<Lane[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("nodes");

  useEffect(() => {
    loadTimelineBundle().then(
      (b) => {
        setMeta({ anchorDate: b.data.anchorDate, demandModel: b.data.demandModel, citations: b.data.citations });
        setNodes(b.data.nodes.map((n) => ({ ...n })));
        setLanes(b.lanes.map((l) => ({ ...l })));
        setEdges(b.data.edges.map((e) => ({ ...e })));
      },
      (e) => setLoadErr(e?.message ?? String(e)),
    );
  }, []);

  return (
    <div style={S.shell}>
      <nav style={S.tabBar}>
        {TABS.map((t) => (
          <button
            key={t.key}
            style={{ ...S.tab, ...(tab === t.key ? S.tabActive : {}) }}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
        <span style={{ ...S.sub, marginLeft: "auto", alignSelf: "center" }}>
          dev-only authoring · push → Vercel → refresh (PLE-138)
        </span>
      </nav>

      {loadErr && <p style={S.err}>Failed to load bundle: {loadErr}</p>}
      {!loadErr && !meta && <p style={{ color: "#9fb" }}>Loading bundle…</p>}

      {meta && tab === "nodes" && (
        <NodeEditor nodes={nodes} setNodes={setNodes} lanes={lanes} edges={edges} meta={meta} />
      )}
      {meta && tab === "lanes" && (
        <LaneEditor lanes={lanes} setLanes={setLanes} nodes={nodes} edges={edges} meta={meta} />
      )}
      {meta && tab === "connections" && (
        <ConnectionEditor edges={edges} setEdges={setEdges} nodes={nodes} lanes={lanes} meta={meta} />
      )}
    </div>
  );
}
