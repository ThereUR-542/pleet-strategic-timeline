import { useState, useCallback } from "react";
import TIMELINE_DATA from "./data/content";
import { resolveToday } from "./lib/temporal";
import { TimelineRenderer, type Orientation } from "./components/timeline/TimelineRenderer";
import { NodeModal } from "./components/NodeModal";
import { Legend } from "./components/legend/Legend";
import {
  CitationsPanel,
  CitationsProvider,
  useCitations,
} from "./components/citations";
import "./styles/timeline.css";

export function App() {
  return (
    <CitationsProvider>
      <TimelineApp />
    </CitationsProvider>
  );
}

function TimelineApp() {
  const today = resolveToday(typeof window !== "undefined" ? window.location.search : "");
  const { open: openCitations } = useCitations();

  const [orientation, setOrientation] = useState<Orientation>("horizontal");
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [openModalNodeId, setOpenModalNodeId] = useState<string | null>(null);

  const handleNodeClick = useCallback((id: string) => {
    setFocusNodeId(id);
    setOpenModalNodeId(id);
  }, []);

  const handleModalClose = useCallback(() => {
    setOpenModalNodeId(null);
  }, []);

  const handleOrientationToggle = useCallback(() => {
    setOrientation((o) => (o === "horizontal" ? "vertical" : "horizontal"));
  }, []);

  const openNode = openModalNodeId
    ? TIMELINE_DATA.nodes.find((n) => n.id === openModalNodeId)
    : null;

  return (
    <div className="timeline-view">
      <TimelineRenderer
        data={TIMELINE_DATA}
        orientation={orientation}
        today={today}
        focusNodeId={focusNodeId}
        onNodeClick={handleNodeClick}
        onOrientationToggle={handleOrientationToggle}
      />

      <Legend />

      <CitationsPanel
        citations={TIMELINE_DATA.citations}
        nodes={TIMELINE_DATA.nodes}
      />

      <div style={{ padding: "8px 20px", background: "rgba(10,12,17,0.6)", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: 16, alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "rgba(174,182,198,0.7)" }}>
          Demand model is theoretical / illustrative — not audited fact (§6).
        </span>
        <button
          onClick={() => openCitations()}
          style={{ marginLeft: "auto", fontSize: 11, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
        >
          Works Cited ({TIMELINE_DATA.citations.length})
        </button>
      </div>

      {openNode && (
        <NodeModal
          node={openNode}
          citations={TIMELINE_DATA.citations}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}
