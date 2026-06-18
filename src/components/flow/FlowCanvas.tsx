// =============================================================================
// FlowCanvas (PLE-92) — the node-graph that replaces the rejected glassmorphic
// timeline. React Flow + a deterministic chronological stage layout (see
// layout.ts). Solid non-overlapping nodes, labeled arrow edges, pan/zoom, a
// header + legend panel, and click-to-open detail in a DOCKED side panel.
// Modeled on the reference Lawrence cited (https://zoho-map.vercel.app/).
// =============================================================================

import { useCallback, useEffect, useMemo } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  MarkerType,
  Position,
  useReactFlow,
  type Node,
  type Edge as RFEdge,
  type NodeProps,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { TimelineData } from "../../data/types";
import { temporalStateFor } from "../../lib/temporal";
import { computeFlowLayout, NODE_W } from "./layout";
import { StageNode, type StageNodeData } from "./StageNode";
import {
  NODE_COLOR,
  NODE_TYPE_LABEL,
  EDGE_COLOR,
  EDGE_KIND_LABEL,
} from "./flowTheme";

const FOCAL_ID = "n-mayor-nichols";

// ── Stage-column header node (non-interactive, sits above each column) ────────
function StageHeaderNode({ data }: NodeProps) {
  const d = data as { label: string; blurb: string };
  return (
    <div className="stage-header">
      <span className="stage-header__label">{d.label}</span>
      <span className="stage-header__blurb">{d.blurb}</span>
      <span className="stage-header__rule" aria-hidden="true" />
    </div>
  );
}

const NODE_TYPES = { stage: StageNode, stageHeader: StageHeaderNode };

interface Props {
  data: TimelineData;
  today: string;
  selectedId: string | null;
  focusNodeId: string | null;
  matchedNodeIds: Set<string> | null;
  onNodeSelect: (id: string) => void;
  /** Right-side toolbar slot (legend toggle, demand toggle, etc.). */
  toolbar?: React.ReactNode;
  /** Presenter mode: hide the title + toolbar panels, keep the graph + legend. */
  compact?: boolean;
}

function FlowCanvasInner({
  data,
  today,
  selectedId,
  focusNodeId,
  matchedNodeIds,
  onNodeSelect,
  toolbar,
  compact,
}: Props) {
  const { setCenter, fitView } = useReactFlow();

  const layout = useMemo(() => computeFlowLayout(data.nodes, data.edges), [data]);
  const nodeById = useMemo(
    () => new Map(data.nodes.map((n) => [n.id, n])),
    [data.nodes],
  );
  const posById = useMemo(
    () => new Map(layout.nodes.map((p) => [p.id, p])),
    [layout],
  );

  const rfNodes: Node[] = useMemo(() => {
    const headers: Node[] = layout.columns
      .filter((c) => c.count > 0)
      .map((c) => ({
        id: `stage-${c.stage}`,
        type: "stageHeader",
        position: { x: c.x, y: c.headerY },
        data: { label: c.label, blurb: c.blurb },
        draggable: false,
        selectable: false,
        connectable: false,
        focusable: false,
        width: NODE_W,
      }));

    const content: Node[] = layout.nodes.map((p) => {
      const n = nodeById.get(p.id)!;
      const dimmed = matchedNodeIds != null && !matchedNodeIds.has(p.id);
      const data: StageNodeData = {
        title: n.title,
        type: n.type,
        thread: n.thread,
        effectiveDate: p.effectiveDate,
        demandScore: n.demandScore,
        confidence: n.confidence,
        isToday: temporalStateFor(n, today) === "today",
        isFocal: n.id === FOCAL_ID,
        dimmed,
      };
      return {
        id: p.id,
        type: "stage",
        position: { x: p.x, y: p.y },
        data: data as unknown as Record<string, unknown>,
        selected: p.id === selectedId,
        draggable: false,
        connectable: false,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
    });

    return [...headers, ...content];
  }, [layout, nodeById, matchedNodeIds, today, selectedId]);

  const rfEdges: RFEdge[] = useMemo(() => {
    return data.edges
      .filter((e) => posById.has(e.from) && posById.has(e.to))
      .map((e) => {
        const color = EDGE_COLOR[e.kind] ?? "#6b7280";
        const dim =
          matchedNodeIds != null &&
          (!matchedNodeIds.has(e.from) || !matchedNodeIds.has(e.to));
        return {
          id: e.id,
          source: e.from,
          target: e.to,
          label: e.label ?? undefined,
          type: "default",
          animated: false,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 16,
            height: 16,
            color,
          },
          style: {
            stroke: color,
            strokeWidth: e.kind === "finances" || e.kind === "converges_on" ? 2 : 1.4,
            strokeDasharray: e.kind === "finances" ? "6 4" : undefined,
            opacity: dim ? 0.07 : 0.55,
          },
          labelStyle: { fill: "#cdd5e4", fontSize: 10, fontWeight: 500 },
          labelBgStyle: { fill: "#11141b", fillOpacity: 0.85 },
          labelBgPadding: [4, 2] as [number, number],
          labelBgBorderRadius: 4,
        };
      });
  }, [data.edges, posById, matchedNodeIds]);

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_evt, node) => {
      if (node.type === "stage") onNodeSelect(node.id);
    },
    [onNodeSelect],
  );

  // Presenter / focus → recenter on the focused node.
  useEffect(() => {
    if (!focusNodeId) return;
    const p = posById.get(focusNodeId);
    if (!p) return;
    setCenter(p.x + NODE_W / 2, p.y + 39, { zoom: 1.1, duration: 600 });
  }, [focusNodeId, posById, setCenter]);

  return (
    <ReactFlow
      nodes={rfNodes}
      edges={rfEdges}
      nodeTypes={NODE_TYPES}
      onNodeClick={handleNodeClick}
      onPaneClick={() => onNodeSelect("")}
      fitView
      fitViewOptions={{ padding: 0.18 }}
      minZoom={0.2}
      maxZoom={2.5}
      nodesDraggable={false}
      nodesConnectable={false}
      proOptions={{ hideAttribution: true }}
      className="flow-canvas"
    >
      <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="#252b38" />
      <Controls showInteractive={false} />
      <MiniMap
        pannable
        zoomable
        nodeColor={(n) =>
          n.type === "stage"
            ? NODE_COLOR[(n.data as StageNodeData).type] ?? "#475569"
            : "transparent"
        }
        nodeStrokeWidth={0}
        maskColor="rgba(8,10,15,0.72)"
        className="flow-minimap"
      />

      {!compact && (
        <Panel position="top-left" className="flow-titlecard">
          <h1 className="flow-titlecard__title">Pleet LLC · Strategic Flow</h1>
          <p className="flow-titlecard__sub">
            Intake → downstream · read-only · click any node for detail
          </p>
        </Panel>
      )}

      {!compact && (
        <Panel position="top-right" className="flow-toolbar">
          <button className="flow-btn" onClick={() => fitView({ padding: 0.18, duration: 400 })}>
            Fit
          </button>
          {toolbar}
        </Panel>
      )}

      <Panel position="bottom-left" className="flow-legend">
        <div className="flow-legend__col">
          <span className="flow-legend__head">Nodes</span>
          {(Object.keys(NODE_TYPE_LABEL) as Array<keyof typeof NODE_TYPE_LABEL>).map(
            (t) => (
              <span key={t} className="flow-legend__row">
                <span
                  className="flow-legend__swatch"
                  style={{ background: NODE_COLOR[t] }}
                />
                {NODE_TYPE_LABEL[t]}
              </span>
            ),
          )}
        </div>
        <div className="flow-legend__col">
          <span className="flow-legend__head">Edges</span>
          {(["converges_on", "finances", "partners", "depends_on", "introduced"] as const).map(
            (k) => (
              <span key={k} className="flow-legend__row">
                <span
                  className="flow-legend__line"
                  style={{
                    background: EDGE_COLOR[k],
                    ...(k === "finances"
                      ? { backgroundImage: "none", opacity: 1 }
                      : {}),
                  }}
                />
                {EDGE_KIND_LABEL[k]}
              </span>
            ),
          )}
        </div>
      </Panel>
    </ReactFlow>
  );
}

export function FlowCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

export type { Props as FlowCanvasProps };
