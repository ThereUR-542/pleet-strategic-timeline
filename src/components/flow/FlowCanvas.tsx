// =============================================================================
// FlowCanvas (PLE-92, v4) — node-graph on a real horizontal TIME AXIS. Board
// direction: "I want to SEE time — a line with tics, each node above or below
// its tick, to show the EVOLUTION." React Flow renders the solid icon-bearing
// nodes + relationship edges; a ViewportPortal draws the month-ticked axis,
// today marker, and a stem from every node down to its date — all panning and
// zooming together. Detail opens in a docked side panel; nothing is stacked.
// =============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  ViewportPortal,
  MarkerType,
  Position,
  useReactFlow,
  type Node,
  type Edge as RFEdge,
  type NodeMouseHandler,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { TimelineData } from "../../data/types";
import { temporalStateFor } from "../../lib/temporal";
import { computeTimelineLayout, NODE_H, type TimelineAxis } from "./layout";
import { StageNode, type StageNodeData } from "./StageNode";
import {
  NODE_COLOR,
  NODE_TYPE_LABEL,
  EDGE_COLOR,
  EDGE_KIND_LABEL,
} from "./flowTheme";

const FOCAL_ID = "n-mayor-nichols";
const NODE_TYPES = { stage: StageNode };

// PLE-97: the ≤760px breakpoint, mirrored exactly in flow.css's media query.
const MOBILE_BP = 760;
// Readable mount zoom on narrow viewports — a node (202px) paints at ~182px so
// its 11.5px title is legible, instead of fitView collapsing the wide time-axis
// into a sub-readable band. (PLE-97 §2.)
const MOBILE_MOUNT_ZOOM = 0.9;

/** True when the viewport is at/under the mobile breakpoint; updates on resize. */
function useIsMobile(): boolean {
  const query = `(max-width: ${MOBILE_BP}px)`;
  const [mobile, setMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(query);
    const onChange = () => setMobile(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return mobile;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

interface Props {
  data: TimelineData;
  today: string;
  selectedId: string | null;
  focusNodeId: string | null;
  matchedNodeIds: Set<string> | null;
  onNodeSelect: (id: string) => void;
  toolbar?: React.ReactNode;
  /** Presenter mode: hide the title + toolbar panels, keep the graph + legend. */
  compact?: boolean;
}

// ── The time axis, drawn in flow coordinates so it pans/zooms with the nodes ──
function TimelineAxisLayer({
  axis,
  half,
  stems,
}: {
  axis: TimelineAxis;
  half: number;
  stems: { cx: number; cy: number }[];
}) {
  const w = axis.xEnd - axis.xStart;
  const h = half * 2;
  const ox = axis.xStart;
  const oy = half; // local y of the axis line

  return (
    <svg
      width={w}
      height={h}
      style={{
        position: "absolute",
        left: axis.xStart,
        top: -half,
        pointerEvents: "none",
        overflow: "visible",
      }}
    >
      {/* projected (future) wash, right of today */}
      <rect
        x={axis.todayX - ox}
        y={0}
        width={Math.max(0, axis.xEnd - axis.todayX)}
        height={h}
        fill="rgba(110,168,255,0.035)"
      />
      {/* stems */}
      {stems.map((s, i) => {
        const x = s.cx - ox;
        const cardEdge = s.cy < 0 ? s.cy + NODE_H / 2 : s.cy - NODE_H / 2;
        const y1 = oy + Math.min(0, cardEdge);
        const y2 = oy + Math.max(0, cardEdge);
        return (
          <line
            key={i}
            x1={x}
            y1={y1}
            x2={x}
            y2={y2}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={1}
          />
        );
      })}
      {/* axis line */}
      <line x1={0} y1={oy} x2={w} y2={oy} stroke="rgba(255,255,255,0.32)" strokeWidth={1.5} />
      {/* month ticks + labels */}
      {axis.ticks.map((t, i) => {
        const x = t.x - ox;
        return (
          <g key={i}>
            <line x1={x} y1={oy - 6} x2={x} y2={oy + 6} stroke="rgba(255,255,255,0.4)" strokeWidth={1} />
            <text x={x} y={oy + 22} textAnchor="middle" fontSize={12} fill="#8b94a7">
              {t.label}
            </text>
            {t.sub && (
              <text x={x} y={oy + 38} textAnchor="middle" fontSize={11} fill="#6b7385" fontWeight={600}>
                {t.sub}
              </text>
            )}
          </g>
        );
      })}
      {/* node date dots on the axis */}
      {stems.map((s, i) => (
        <circle key={`d${i}`} cx={s.cx - ox} cy={oy} r={2.5} fill="#aeb6c6" />
      ))}
      {/* today marker */}
      <line
        x1={axis.todayX - ox}
        y1={0}
        x2={axis.todayX - ox}
        y2={h}
        stroke="#ffffff"
        strokeWidth={1.5}
        strokeDasharray="4 4"
        opacity={0.7}
      />
      <circle cx={axis.todayX - ox} cy={oy} r={4} fill="#ffffff" />
      <text x={axis.todayX - ox + 7} y={oy - 8} fontSize={11} fontWeight={700} fill="#ffffff">
        TODAY · {axis.today}
      </text>
    </svg>
  );
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
  const mobile = useIsMobile();
  // Legend docks to a collapsed disclosure chip on mobile (Progressive
  // Disclosure) so it stops eating graph space; always-open on desktop.
  const [legendOpen, setLegendOpen] = useState(false);

  const layout = useMemo(
    () => computeTimelineLayout(data.nodes, data.edges, today),
    [data, today],
  );
  const nodeById = useMemo(
    () => new Map(data.nodes.map((n) => [n.id, n])),
    [data.nodes],
  );
  const posById = useMemo(
    () => new Map(layout.nodes.map((p) => [p.id, p])),
    [layout],
  );

  const rfNodes: Node[] = useMemo(() => {
    return layout.nodes.map((p) => {
      const n = nodeById.get(p.id)!;
      const dimmed = matchedNodeIds != null && !matchedNodeIds.has(p.id);
      const nodeData: StageNodeData = {
        id: n.id,
        title: n.title,
        summary: n.summary,
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
        data: nodeData as unknown as Record<string, unknown>,
        selected: p.id === selectedId,
        draggable: false,
        connectable: false,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
    });
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
          markerEnd: { type: MarkerType.ArrowClosed, width: 15, height: 15, color },
          style: {
            stroke: color,
            strokeWidth: e.kind === "finances" || e.kind === "converges_on" ? 1.8 : 1.3,
            strokeDasharray: e.kind === "finances" ? "6 4" : undefined,
            opacity: dim ? 0.05 : 0.4,
          },
          labelStyle: { fill: "#cdd5e4", fontSize: 9.5, fontWeight: 500 },
          labelBgStyle: { fill: "#11141b", fillOpacity: 0.82 },
          labelBgPadding: [3, 2] as [number, number],
          labelBgBorderRadius: 4,
        };
      });
  }, [data.edges, posById, matchedNodeIds]);

  const stems = useMemo(
    () => layout.nodes.map((p) => ({ cx: p.cx, cy: p.cy })),
    [layout],
  );
  const half = layout.height / 2;

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_evt, node) => {
      if (node.type === "stage") onNodeSelect(node.id);
    },
    [onNodeSelect],
  );

  useEffect(() => {
    if (!focusNodeId) return;
    const p = posById.get(focusNodeId);
    if (!p) return;
    setCenter(p.cx, p.cy, { zoom: 1.1, duration: prefersReducedMotion() ? 0 : 600 });
  }, [focusNodeId, posById, setCenter]);

  // PLE-97: initial framing. Desktop fits the whole graph; mobile mounts at a
  // readable zoom centred on the focal/TODAY anchor and lets the user pan time,
  // instead of fitView() collapsing the wide axis into a sub-readable band.
  const didInit = useRef(false);
  const handleInit = useCallback(
    (instance: ReactFlowInstance) => {
      if (didInit.current) return;
      didInit.current = true;
      if (mobile) {
        const anchor = posById.get(FOCAL_ID);
        const ax = anchor ? anchor.cx : layout.axis.todayX;
        const ay = anchor ? anchor.cy : 0;
        instance.setCenter(ax, ay, { zoom: MOBILE_MOUNT_ZOOM, duration: 0 });
      } else {
        instance.fitView({ padding: 0.12 });
      }
    },
    [mobile, posById, layout.axis.todayX],
  );

  return (
    <ReactFlow
      nodes={rfNodes}
      edges={rfEdges}
      nodeTypes={NODE_TYPES}
      onNodeClick={handleNodeClick}
      onPaneClick={() => onNodeSelect("")}
      onInit={handleInit}
      fitViewOptions={{ padding: 0.12 }}
      minZoom={0.15}
      maxZoom={2.5}
      nodesDraggable={false}
      nodesConnectable={false}
      proOptions={{ hideAttribution: true }}
      className="flow-canvas"
    >
      <Background variant={BackgroundVariant.Dots} gap={30} size={1} color="#20262f" />
      <ViewportPortal>
        <TimelineAxisLayer axis={layout.axis} half={half} stems={stems} />
      </ViewportPortal>
      <Controls showInteractive={false} />
      {/* MiniMap is low value / high space-cost on a touch viewport — hide it. */}
      {!mobile && (
        <MiniMap
          pannable
          zoomable
          nodeColor={(n) => NODE_COLOR[(n.data as StageNodeData).type] ?? "#475569"}
          nodeStrokeWidth={0}
          maskColor="rgba(8,10,15,0.72)"
          className="flow-minimap"
        />
      )}

      {!compact && (
        <Panel position="top-left" className="flow-titlecard">
          <h1 className="flow-titlecard__title">Pleet LLC · Strategic Timeline</h1>
          <p className="flow-titlecard__sub">
            How the venture evolved — Jan 2026 → today → projected · click any node
          </p>
        </Panel>
      )}

      {!compact && (
        <Panel position="top-right" className="flow-toolbar">
          <button className="flow-btn" onClick={() => fitView({ padding: 0.12, duration: 400 })}>
            Fit
          </button>
          {toolbar}
        </Panel>
      )}

      {/* Legend: always-open columns on desktop; a collapsed "Legend" chip that
          opens a compact bottom sheet on mobile so it stops occluding the graph. */}
      <Panel position="bottom-left" className="flow-legend-dock">
        {mobile && !legendOpen ? (
          <button
            className="flow-legend-chip"
            onClick={() => setLegendOpen(true)}
            aria-expanded={false}
          >
            ⓘ Legend
          </button>
        ) : (
          <div className={`flow-legend${mobile ? " flow-legend--sheet" : ""}`}>
            {mobile && (
              <button
                className="flow-legend__close"
                onClick={() => setLegendOpen(false)}
                aria-label="Collapse legend"
              >
                ✕
              </button>
            )}
            <div className="flow-legend__col">
              <span className="flow-legend__head">Nodes</span>
              {(Object.keys(NODE_TYPE_LABEL) as Array<keyof typeof NODE_TYPE_LABEL>).map(
                (t) => (
                  <span key={t} className="flow-legend__row">
                    <span className="flow-legend__swatch" style={{ background: NODE_COLOR[t] }} />
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
                    <span className="flow-legend__line" style={{ background: EDGE_COLOR[k] }} />
                    {EDGE_KIND_LABEL[k]}
                  </span>
                ),
              )}
            </div>
          </div>
        )}
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
