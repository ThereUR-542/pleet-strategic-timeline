// =============================================================================
// FlowCanvas (PLE-121, stage-③) — the board-accepted ZONED chapter-column
// layout + octopus orthogonal routing, built on the PLE-92 time-axis graph.
//
//   - Desktop: React Flow renders the solid nodes + orthogonal (`smoothstep`)
//     octopus edges. A ViewportPortal draws, beneath them, the 5 tinted chapter
//     ZONE columns (with headers), thread SUB-CONTAINERS, and the PLE-92 month
//     axis + Today marker — all panning/zooming together.
//   - Mobile (≤760px, PLE-97): the 5 columns can't coexist, so the canvas
//     collapses to stacked chapter BANDS with a chapter pager, horizontal node
//     rails, and "→ hub" tentacle chips for cross-zone edges (spec §6).
//   - Detail opens in the docked side panel (PLE-102); nothing is stacked.
//   - Layout emits (x, y) only; the Z-plane build (PLE-115) rides on top.
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
  useReactFlow,
  useViewport,
  type Node,
  type Edge as RFEdge,
  type NodeMouseHandler,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { TimelineData } from "../../data/types";
import { temporalStateFor } from "../../lib/temporal";
import {
  computeTimelineLayout,
  NODE_H,
  type FlowLayout,
  type TimelineAxis,
  type ZoneBand,
  type SubContainer,
} from "./layout";
import { StageNode, type StageNodeData } from "./StageNode";
import {
  NODE_COLOR,
  NODE_TYPE_LABEL,
  EDGE_COLOR,
  EDGE_KIND_LABEL,
} from "./flowTheme";

const FOCAL_ID = "n-mayor-nichols";
const NODE_TYPES = { stage: StageNode };
/** A `concept` node with this many converging edges renders as an octopus hub. */
const HUB_MIN_INDEGREE = 3;

// PLE-97: the ≤760px breakpoint, mirrored exactly in flow.css's media query.
const MOBILE_BP = 760;
const MOBILE_MOUNT_ZOOM = 0.9;
// PLE-133: the even lattice is intentionally WIDE (board: "big TV"). Fitting the
// whole thing on mount renders nodes unreadable, so we mount at a readable zoom
// anchored on the focal node and let pan + the Fit button reveal the full lattice.
const DESKTOP_MOUNT_ZOOM = 0.62;

// ── Z-plane depth (PLE-115 §10) ──────────────────────────────────────────────
// §10.2: which semantic variable maps to Z → story `thread`. Threads cluster
// into chapter-aligned depth strata (mirrors spec §1's dominant-thread grouping)
// so co-chapter threads sit near each other in depth. `concept` hubs are pinned
// to z=0 (§10.8 #10) so converging tentacles meet on the base plane.
const THREAD_Z_LAYER: Record<string, number> = {
  foundational: 0,
  growth: 1,
  strategic_relationships: 1,
  media_brand: 1,
  savanna: 2,
  oswego: 3,
  major_projects: 3,
  manufacturing: 4,
  financial_interest: 4,
};
function threadZLayer(thread: string | null, isHub: boolean): number {
  if (isHub) return 0;
  return thread ? THREAD_Z_LAYER[thread] ?? 0 : 0;
}

// §10.4 desktop tilt clamps (interaction constants, not visual tokens).
const TILT = { rxMin: -32, rxMax: 8, ryMin: -35, ryMax: 35 };
const POSE_FLAT = { rx: 0, ry: 0 };
const POSE_TILT = { rx: -18, ry: 22 }; // default on toggle-on (mirrors tokens)
const POSE_SIDE = { rx: -10, ry: 34 };
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

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

// ── SUBSTRATE: zone tint columns + thread sub-containers (PLE-125 §10.6 — these
//    TILT with the pane in 3D mode; rendered via ViewportPortal under the nodes).
//    The chapter HEADERS were lifted out to the fixed frame (ZoneHeaderLayer). ──
function ZoneSubstrateLayer({
  zones,
  subgroups,
}: {
  zones: ZoneBand[];
  subgroups: SubContainer[];
}) {
  return (
    <div className="flow-zone-layer" aria-hidden="true">
      {zones.map((z) => (
        <div
          key={z.key}
          className={`flow-zone${z.index % 2 === 1 ? " flow-zone--alt" : ""}`}
          style={{ left: z.x, top: 0, width: z.width, height: z.height }}
        />
      ))}
      {subgroups.map((s) => (
        <div
          key={s.id}
          className="flow-subgroup"
          style={{
            left: s.x,
            top: s.y,
            width: s.width,
            height: s.height,
            ["--th" as string]: `var(--thread-${s.thread})`,
          }}
        >
          <span className="flow-subgroup__tag">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── The PLE-92 time axis, preserved BENEATH the zones (top-origin flow coords) ─
function TimelineAxisLayer({
  axis,
  width,
  height,
  stems,
}: {
  axis: TimelineAxis;
  width: number;
  height: number;
  stems: { cx: number; cy: number; ghost?: boolean }[];
}) {
  const oy = axis.y;
  return (
    <svg
      width={width}
      height={height}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        pointerEvents: "none",
        overflow: "visible",
      }}
    >
      {/* projected (future) wash, right of today */}
      <rect
        x={axis.todayX}
        y={0}
        width={Math.max(0, axis.xEnd - axis.todayX)}
        height={height}
        fill="rgba(110,168,255,0.025)"
      />
      {/* stems: node card → its date tick on the axis */}
      {stems.map((s, i) => (
        <line
          key={i}
          x1={s.cx}
          y1={s.cy + NODE_H / 2}
          x2={s.cx}
          y2={oy}
          stroke="rgba(255,255,255,0.10)"
          strokeWidth={1}
        />
      ))}
      {/* axis line */}
      <line x1={0} y1={oy} x2={width} y2={oy} stroke="rgba(255,255,255,0.30)" strokeWidth={1.5} />
      {/* month ticks + labels */}
      {axis.ticks.map((t, i) => (
        <g key={i}>
          <line x1={t.x} y1={oy - 5} x2={t.x} y2={oy + 5} stroke="rgba(255,255,255,0.4)" strokeWidth={1} />
          <text x={t.x} y={oy + 20} textAnchor="middle" fontSize={11} fill="#8b94a7">
            {t.label}
          </text>
          {t.sub && (
            <text x={t.x} y={oy + 35} textAnchor="middle" fontSize={10} fill="#6b7385" fontWeight={600}>
              {t.sub}
            </text>
          )}
        </g>
      ))}
      {/* node date dots on the axis — ghost nodes get a hollow/dotted dot (§4) */}
      {stems.map((s, i) =>
        s.ghost ? (
          <circle
            key={`d${i}`}
            cx={s.cx}
            cy={oy}
            r={3}
            fill="#0c0f15"
            stroke="#a9b2c6"
            strokeWidth={1.4}
            strokeDasharray="1.5 1.5"
          />
        ) : (
          <circle key={`d${i}`} cx={s.cx} cy={oy} r={2.5} fill="#aeb6c6" />
        ),
      )}
      {/* today marker */}
      <line
        x1={axis.todayX}
        y1={0}
        x2={axis.todayX}
        y2={height}
        stroke="#ffffff"
        strokeWidth={1.5}
        strokeDasharray="4 4"
        opacity={0.6}
      />
      <circle cx={axis.todayX} cy={oy} r={4} fill="#ffffff" />
      <text x={axis.todayX + 7} y={oy - 8} fontSize={11} fontWeight={700} fill="#ffffff">
        TODAY · {axis.today}
      </text>
    </svg>
  );
}

// ── Zone/chapter HEADER strip (PLE-125 §10.6 — the "what chapter" labels, lifted
//    out of the rotating substrate into the fixed frame so they read flat in 3D).
function ZoneHeaderLayer({ zones }: { zones: ZoneBand[] }) {
  return (
    <div className="flow-zone-layer" aria-hidden="true">
      {zones.map((z) => (
        <div
          key={z.key}
          className="flow-zone__head flow-zone__head--fixed"
          style={{ left: z.x, top: 0, width: z.width, right: "auto" }}
        >
          <span className="flow-zone__kicker">{z.kicker}</span>
          <span className="flow-zone__title">{z.title}</span>
          <span className="flow-zone__range">{z.rangeLabel}</span>
        </div>
      ))}
    </div>
  );
}

// ── FIXED reference frame (PLE-125 §10.6, CTO deviation #1 fix) ───────────────
// The PLE-92 time axis (month ticks, Today marker, stems) + the zone/chapter
// header strip are the "WHEN/WHAT" reading frame — the board's #1 concern. They
// ride the live React Flow viewport transform (translate + zoom) so they stay
// pinned to the content, but they live OUTSIDE .react-flow__pane and so NEVER
// pick up the §10.4 rotateX/rotateY. Result: in 3D mode only the substrate
// (tints/nodes/edges/sub-containers) tilts; the axis stays flat-readable. In
// flat mode the transform exactly mirrors the viewport, so the render is
// unchanged from v1.
function FixedFrame({
  axis,
  width,
  height,
  stems,
  zones,
}: {
  axis: TimelineAxis;
  width: number;
  height: number;
  stems: { cx: number; cy: number; ghost?: boolean }[];
  zones: ZoneBand[];
}) {
  const { x, y, zoom } = useViewport();
  return (
    <div className="flow-fixedframe" aria-hidden="true">
      <div
        className="flow-fixedframe__inner"
        style={{ transform: `translate(${x}px, ${y}px) scale(${zoom})` }}
      >
        <ZoneHeaderLayer zones={zones} />
        <TimelineAxisLayer axis={axis} width={width} height={height} stems={stems} />
      </div>
    </div>
  );
}

/** Octopus handle selection: pick the source/target sides that shorten the run. */
function pickHandles(
  ps: { cx: number; cy: number },
  pt: { cx: number; cy: number },
  srcHub: boolean,
  tgtHub: boolean,
): { sourceHandle: string; targetHandle: string } {
  const dx = pt.cx - ps.cx;
  const dy = pt.cy - ps.cy;
  const vertical = Math.abs(dy) > Math.abs(dx);
  const sourceHandle = srcHub && vertical ? (dy > 0 ? "sb" : "st") : dx >= 0 ? "sr" : "sl";
  const targetHandle = tgtHub && vertical ? (dy > 0 ? "tt" : "tb") : dx >= 0 ? "tl" : "tr";
  return { sourceHandle, targetHandle };
}

// ── Mobile (PLE-97 + spec §6): stacked chapter bands, pager, rails, hub chips ─
function MobileBands({
  data,
  layout,
  selectedId,
  hubIds,
  onNodeSelect,
}: {
  data: TimelineData;
  layout: FlowLayout;
  selectedId: string | null;
  hubIds: Set<string>;
  onNodeSelect: (id: string) => void;
}) {
  const nodeById = useMemo(
    () => new Map(data.nodes.map((n) => [n.id, n])),
    [data.nodes],
  );
  const posById = useMemo(
    () => new Map(layout.nodes.map((p) => [p.id, p])),
    [layout.nodes],
  );

  // Nodes grouped by chapter, in chronological order within each band.
  const byChapter = useMemo(() => {
    const groups: string[][] = layout.zones.map(() => []);
    const ordered = [...layout.nodes].sort((a, b) => a.cx - b.cx);
    for (const p of ordered) groups[p.chapter]?.push(p.id);
    return groups;
  }, [layout.nodes, layout.zones]);

  // Cross-zone tentacles into a hub → "→ hub" chips on the source's band.
  const chipsByChapter = useMemo(() => {
    const chips: { label: string; chapter: number }[][] = layout.zones.map(() => []);
    for (const e of data.edges) {
      const ps = posById.get(e.from);
      const pt = posById.get(e.to);
      if (!ps || !pt || ps.chapter === pt.chapter) continue;
      if (!hubIds.has(e.to)) continue;
      const hub = nodeById.get(e.to);
      const src = nodeById.get(e.from);
      if (!hub || !src) continue;
      chips[ps.chapter].push({
        label: `${shortTitle(src.title)} → ${shortTitle(hub.title)} (${layout.zones[pt.chapter].kicker})`,
        chapter: ps.chapter,
      });
    }
    return chips;
  }, [data.edges, posById, nodeById, hubIds, layout.zones]);

  const activeChapter = selectedId ? posById.get(selectedId)?.chapter ?? -1 : -1;

  return (
    <div className="flow-mbands">
      <div className="flow-mbands__topbar">
        <span className="flow-mbands__t">Strategic Timeline</span>
        <span className="flow-mbands__nav">
          {layout.zones.length} chapters ▾
        </span>
      </div>
      <div className="flow-mbands__scroll">
        {layout.zones.map((z, ci) => {
          const ids = byChapter[ci] ?? [];
          if (ids.length === 0) return null;
          const isActive = ci === activeChapter;
          return (
            <section
              key={z.key}
              className={`flow-mband${ci % 2 === 1 ? " flow-mband--alt" : ""}${isActive ? " flow-mband--active" : ""}`}
            >
              <header className="flow-mband__head">
                <div className="flow-mband__kicker">
                  {z.kicker}{isActive ? " · active" : ""}
                </div>
                <div className="flow-mband__title">{z.title}</div>
                <div className="flow-mband__range">{z.rangeLabel}</div>
              </header>
              <div className="flow-mband__rail">
                {ids.map((id) => {
                  const n = nodeById.get(id)!;
                  const p = posById.get(id)!;
                  const color = NODE_COLOR[n.type] ?? "#94a3b8";
                  const sel = id === selectedId;
                  return (
                    <button
                      key={id}
                      className={`flow-mnode${sel ? " flow-mnode--sel" : ""}${hubIds.has(id) ? " flow-mnode--hub" : ""}${n.isAntecedent ? " flow-mnode--antecedent" : ""}`}
                      style={{ ["--type" as string]: color }}
                      onClick={() => onNodeSelect(id)}
                    >
                      <span className="flow-mnode__kind">
                        {n.isAntecedent && (
                          <span className="meta-antecedent meta-antecedent--m">
                            <span className="gly" aria-hidden="true" />
                            antecedent
                          </span>
                        )}
                        {NODE_TYPE_LABEL[n.type]}{hubIds.has(id) ? " · hub" : ""}
                      </span>
                      <span className="flow-mnode__ttl">{n.title}</span>
                      {p.effectiveDate && (
                        <span className="flow-mnode__meta">{p.effectiveDate}</span>
                      )}
                    </button>
                  );
                })}
              </div>
              {chipsByChapter[ci]?.map((c, i) => (
                <div key={i} className="flow-mtent">⌁ {c.label}</div>
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function shortTitle(t: string): string {
  const cut = t.split(/[—(]/)[0].trim();
  return cut.length > 28 ? cut.slice(0, 27) + "…" : cut;
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

  // Z-plane 3D depth (PLE-115 §10): opt-in MODE over a flat default (§10.1).
  // `zMode` off ⇒ exact 2D; `pose` holds the clamped tilt while on.
  const [zMode, setZMode] = useState(false);
  const [pose, setPose] = useState(POSE_TILT);
  const setTilt = useCallback(
    (rx: number, ry: number) =>
      setPose({
        rx: clamp(rx, TILT.rxMin, TILT.rxMax),
        ry: clamp(ry, TILT.ryMin, TILT.ryMax),
      }),
    [],
  );

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

  // Octopus hubs: `concept` nodes that ≥3 edges converge on (in-degree).
  const hubIds = useMemo(() => {
    const inDeg = new Map<string, number>();
    for (const e of data.edges) {
      if (!posById.has(e.from) || !posById.has(e.to)) continue;
      inDeg.set(e.to, (inDeg.get(e.to) ?? 0) + 1);
    }
    const hubs = new Set<string>();
    for (const n of data.nodes) {
      if (n.type === "concept" && (inDeg.get(n.id) ?? 0) >= HUB_MIN_INDEGREE) {
        hubs.add(n.id);
      }
    }
    return hubs;
  }, [data.edges, data.nodes, posById]);

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
        isHub: hubIds.has(n.id),
        zLayer: threadZLayer(n.thread, hubIds.has(n.id)),
        dimmed,
        isAntecedent: n.isAntecedent === true,
      };
      return {
        id: p.id,
        type: "stage",
        position: { x: p.x, y: p.y },
        data: nodeData as unknown as Record<string, unknown>,
        selected: p.id === selectedId,
        draggable: false,
        connectable: false,
      };
    });
  }, [layout, nodeById, matchedNodeIds, today, selectedId, hubIds]);

  const rfEdges: RFEdge[] = useMemo(() => {
    return data.edges
      .filter((e) => posById.has(e.from) && posById.has(e.to))
      .map((e) => {
        const color = EDGE_COLOR[e.kind] ?? "#6b7280";
        const dim =
          matchedNodeIds != null &&
          (!matchedNodeIds.has(e.from) || !matchedNodeIds.has(e.to));
        const ps = posById.get(e.from)!;
        const pt = posById.get(e.to)!;
        const { sourceHandle, targetHandle } = pickHandles(
          ps,
          pt,
          hubIds.has(e.from),
          hubIds.has(e.to),
        );
        // PLE-120 §4 ghost connector: an `other` edge OUT OF an antecedent node
        // (fail → intro "motivated") renders as a soft violet dotted line with an
        // open chevron arrowhead — matching the ghost register, softer than depends_on.
        const isGhost = e.kind === "other" && nodeById.get(e.from)?.isAntecedent === true;
        if (isGhost) {
          return {
            id: e.id,
            source: e.from,
            target: e.to,
            sourceHandle,
            targetHandle,
            label: e.label ?? undefined,
            type: "smoothstep",
            pathOptions: { borderRadius: 8 },
            markerEnd: { type: MarkerType.Arrow, width: 16, height: 16, color: "#a78bfa" },
            style: {
              stroke: "#a78bfa",
              strokeWidth: 1.4,
              strokeDasharray: "2 3",
              opacity: dim ? 0.05 : 0.6,
            },
            labelStyle: { fill: "#c5b6f4", fontSize: 9.5, fontWeight: 500 },
            labelBgStyle: { fill: "#11141b", fillOpacity: 0.82 },
            labelBgPadding: [3, 2] as [number, number],
            labelBgBorderRadius: 4,
          };
        }
        return {
          id: e.id,
          source: e.from,
          target: e.to,
          sourceHandle,
          targetHandle,
          label: e.label ?? undefined,
          // Octopus: orthogonal (elbow) segments with softened corners (§3.1).
          type: "smoothstep",
          pathOptions: { borderRadius: 8 },
          markerEnd: { type: MarkerType.ArrowClosed, width: 15, height: 15, color },
          style: {
            stroke: color,
            strokeWidth: e.kind === "finances" || e.kind === "converges_on" ? 1.8 : 1.3,
            strokeDasharray: e.kind === "finances" ? "6 4" : undefined,
            opacity: dim ? 0.05 : 0.42,
          },
          labelStyle: { fill: "#cdd5e4", fontSize: 9.5, fontWeight: 500 },
          labelBgStyle: { fill: "#11141b", fillOpacity: 0.82 },
          labelBgPadding: [3, 2] as [number, number],
          labelBgBorderRadius: 4,
        };
      });
  }, [data.edges, posById, matchedNodeIds, hubIds, nodeById]);

  const stems = useMemo(
    () =>
      layout.nodes.map((p) => ({
        cx: p.cx,
        cy: p.cy,
        // PLE-120 §4: antecedent nodes get a hollow/dotted ghost dot on the axis.
        ghost: nodeById.get(p.id)?.isAntecedent === true,
      })),
    [layout, nodeById],
  );

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_evt, node) => {
      if (node.type === "stage") onNodeSelect(node.id);
    },
    [onNodeSelect],
  );

  useEffect(() => {
    if (!focusNodeId || mobile) return;
    const p = posById.get(focusNodeId);
    if (!p) return;
    setCenter(p.cx, p.cy, { zoom: 1.1, duration: prefersReducedMotion() ? 0 : 600 });
  }, [focusNodeId, posById, setCenter, mobile]);

  const didInit = useRef(false);
  const handleInit = useCallback(
    (instance: ReactFlowInstance) => {
      if (didInit.current) return;
      didInit.current = true;
      const wantFit =
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).has("fit");
      const anchor = posById.get(FOCAL_ID);
      if (wantFit) {
        instance.fitView({ padding: 0.08 });
      } else if (anchor) {
        instance.setCenter(anchor.cx, anchor.cy, {
          zoom: mobile ? MOBILE_MOUNT_ZOOM : DESKTOP_MOUNT_ZOOM,
          duration: 0,
        });
      } else {
        instance.fitView({ padding: 0.1 });
      }
    },
    [mobile, posById],
  );

  // Mobile: the 5 columns can't coexist (PLE-97) → stacked chapter bands.
  if (mobile) {
    return (
      <MobileBands
        data={data}
        layout={layout}
        selectedId={selectedId}
        hubIds={hubIds}
        onNodeSelect={onNodeSelect}
      />
    );
  }

  return (
    <ReactFlow
      nodes={rfNodes}
      edges={rfEdges}
      nodeTypes={NODE_TYPES}
      onNodeClick={handleNodeClick}
      onPaneClick={() => onNodeSelect("")}
      onInit={handleInit}
      fitViewOptions={{ padding: 0.1 }}
      minZoom={0.1}
      maxZoom={2.5}
      nodesDraggable={false}
      nodesConnectable={false}
      proOptions={{ hideAttribution: true }}
      className={`flow-canvas${zMode ? " flow-canvas--zmode" : ""}`}
      style={
        zMode
          ? ({
              ["--zp-rx"]: `${pose.rx}deg`,
              ["--zp-ry"]: `${pose.ry}deg`,
            } as React.CSSProperties)
          : undefined
      }
    >
      <Background variant={BackgroundVariant.Dots} gap={30} size={1} color="#20262f" />
      {/* Substrate (tilts in 3D, §10.6): zone tints + thread sub-containers. */}
      <ViewportPortal>
        <ZoneSubstrateLayer zones={layout.zones} subgroups={layout.subgroups} />
      </ViewportPortal>
      {/* Fixed reading frame (never tilts, §10.6): time axis + chapter headers. */}
      <FixedFrame
        axis={layout.axis}
        width={layout.width}
        height={layout.height}
        stems={stems}
        zones={layout.zones}
      />
      <Controls showInteractive={false} />
      <MiniMap
        pannable
        zoomable
        nodeColor={(n) => NODE_COLOR[(n.data as StageNodeData).type] ?? "#475569"}
        nodeStrokeWidth={0}
        maskColor="rgba(8,10,15,0.72)"
        className="flow-minimap"
      />

      {!compact && (
        <Panel position="top-left" className="flow-titlecard">
          <h1 className="flow-titlecard__title">Pleet LLC · Strategic Timeline</h1>
          <p className="flow-titlecard__sub">
            Five chapters along the time axis — Jan 2026 → today → projected · click any node
          </p>
        </Panel>
      )}

      {!compact && (
        <Panel position="top-right" className="flow-toolbar">
          <button className="flow-btn" onClick={() => fitView({ padding: 0.1, duration: 400 })}>
            Fit
          </button>
          {toolbar}
        </Panel>
      )}

      {/* Z-plane 3D-depth control (PLE-115 §10). A fixed HUD — never rotates
          (§10.6). Toggle engages 3D; presets + slider rotate within §10.4 clamps;
          "Flat" snaps to 0°/0° (§10.8 #11). Off restores exact 2D (§10.8 #9). */}
      {!compact && (
        <Panel position="top-right" className="flow-zctl-dock">
          <div className="flow-zctl">
            <button
              className={`flow-zctl__btn flow-zctl__toggle${zMode ? " flow-zctl__btn--on" : ""}`}
              aria-pressed={zMode}
              onClick={() => setZMode((v) => !v)}
              title="Rotate the timeline into the Z-plane — depth encodes story thread"
            >
              {zMode ? "◳ 3D depth · On" : "◳ 3D depth · Off"}
            </button>
            {zMode && (
              <>
                <div className="flow-zctl__row" role="group" aria-label="Depth pose presets">
                  <button className="flow-zctl__btn" onClick={() => setTilt(POSE_FLAT.rx, POSE_FLAT.ry)}>
                    Flat
                  </button>
                  <button className="flow-zctl__btn" onClick={() => setTilt(POSE_TILT.rx, POSE_TILT.ry)}>
                    Tilt
                  </button>
                  <button className="flow-zctl__btn" onClick={() => setTilt(POSE_SIDE.rx, POSE_SIDE.ry)}>
                    Side
                  </button>
                </div>
                <div className="flow-zctl__row">
                  <input
                    className="flow-zctl__slider"
                    type="range"
                    min={TILT.ryMin}
                    max={TILT.ryMax}
                    value={pose.ry}
                    aria-label="Rotate timeline around the vertical axis"
                    onChange={(e) => setTilt(pose.rx, Number(e.target.value))}
                  />
                </div>
                <span className="flow-zctl__hint">Depth = story thread · slider rotates</span>
              </>
            )}
          </div>
        </Panel>
      )}

      <Panel position="bottom-left" className="flow-legend-dock">
        <div className="flow-legend">
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
            {(["converges_on", "finances", "depends_on", "partners", "introduced"] as const).map(
              (k) => (
                <span key={k} className="flow-legend__row">
                  <span className="flow-legend__line" style={{ background: EDGE_COLOR[k] }} />
                  {EDGE_KIND_LABEL[k]}
                </span>
              ),
            )}
          </div>
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
