import { useMemo, useState, useCallback, useRef } from "react";
import { scaleTime } from "d3-scale";
import { area, curveBasis } from "d3-shape";
import type { TimelineData, TimelineNode, Edge, EdgeKind, TemporalState } from "../../data/types";
import { temporalStateFor, nodeAxisDate } from "../../lib/temporal";
import { backgroundCurveSamples, equipmentStepSeries } from "../../lib/demand-viz";

// ── Types ────────────────────────────────────────────────────────────────────

export type Orientation = "horizontal" | "vertical";

interface LayoutNode {
  node: TimelineNode;
  cx: number;
  cy: number;
  r: number;
  temporalState: TemporalState;
  effectiveDate: string;
}

interface LayoutEdge {
  edge: Edge;
  fromLayout: LayoutNode | undefined;
  toLayout: LayoutNode | undefined;
}

// ── Constants ────────────────────────────────────────────────────────────────

const CW_H = 1440;
const CH_H = 720;
const CW_V = 840;
const CH_V = 1200;

const MG = { top: 30, right: 55, bottom: 105, left: 65 };

const AXIS_Y = 440;    // horizontal: y of time axis
const AXIS_X = 270;    // vertical:   x of time axis
const NODE_R = 15;
const FOCAL_R = 22;    // Mayor (convergence focal)
const DEMAND_H = 160;  // max demand area height (horizontal)
const DEMAND_W = 110;  // max demand area width (vertical)
const TMAX = 12;       // months modeled

// Horizontal lanes (y positions): above then below axis
const LANES_H = [390, 325, 260, 195, 130, 505, 570] as const;
// priority: alternate above/below
const LANE_PRI_H = [0, 5, 1, 6, 2, 3, 4] as const;

// Vertical lanes (x positions): right then left of axis
const LANES_V = [340, 200, 405, 145, 470, 90, 535] as const;
const LANE_PRI_V = [0, 1, 2, 3, 4, 5, 6] as const;

const MIN_GAP_H = 155;  // min x-gap between nodes in same horizontal lane
const MIN_GAP_V = 50;   // min y-gap between nodes in same vertical lane

// ── Color tables (mirror CSS vars in timeline.css) ───────────────────────────

const NODE_COLORS: Record<string, string> = {
  person: "#6ea8ff",
  project: "#57e0a8",
  event: "#f59e0b",
  concept: "#c084fc",
};

const EDGE_COLORS: Record<EdgeKind, string> = {
  finances: "#f59e0b",
  converges_on: "#a78bfa",
  introduced: "#94a3b8",
  owns: "#6ea8ff",
  partners: "#4ade80",
  demonstrates: "#22d3ee",
  depends_on: "#fbbf24",
  other: "#6b7280",
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ── Helpers ──────────────────────────────────────────────────────────────────

function isoToDate(iso: string): Date {
  return new Date(iso + "T00:00:00Z");
}

function tMonthsToDate(tMonths: number): Date {
  const epoch = new Date("2026-01-01T00:00:00Z").getTime();
  return new Date(epoch + tMonths * 30.4375 * 86400000);
}

function effectiveDateFor(
  node: TimelineNode,
  edges: Edge[],
  nodeMap: Map<string, TimelineNode>,
  today: string,
): string {
  const axisDate = nodeAxisDate(node);
  if (axisDate) return axisDate;
  const connected: string[] = [];
  for (const e of edges) {
    const otherId = e.from === node.id ? e.to : e.to === node.id ? e.from : null;
    if (!otherId) continue;
    const other = nodeMap.get(otherId);
    if (!other) continue;
    const d = nodeAxisDate(other);
    if (d) connected.push(d);
  }
  return connected.length > 0 ? connected.sort()[0] : today;
}

function assignLanes(
  sorted: Array<{ id: string; pos: number }>,
  priority: readonly number[],
  minGap: number,
): Map<string, number> {
  const lastPos = new Array(priority.length).fill(-Infinity);
  const result = new Map<string, number>();
  for (const item of sorted) {
    let picked = -1;
    for (const li of priority) {
      if (item.pos - lastPos[li] >= minGap) {
        picked = li;
        break;
      }
    }
    if (picked === -1) {
      // All lanes blocked — fall into least-recently-used
      picked = priority.reduce((best, li) => lastPos[li] < lastPos[best] ? li : best, priority[0]);
    }
    result.set(item.id, picked);
    lastPos[picked] = item.pos;
  }
  return result;
}

function edgePath(x1: number, y1: number, x2: number, y2: number, isH: boolean, axisP: number): string {
  if (isH) {
    const sameH = (y1 < axisP) === (y2 < axisP);
    if (sameH) return `M${x1},${y1} C${x1},${(y1+y2)/2} ${x2},${(y1+y2)/2} ${x2},${y2}`;
    return `M${x1},${y1} C${x1},${axisP} ${x2},${axisP} ${x2},${y2}`;
  } else {
    const sameV = (x1 < axisP) === (x2 < axisP);
    if (sameV) return `M${x1},${y1} C${(x1+x2)/2},${y1} ${(x1+x2)/2},${y2} ${x2},${y2}`;
    return `M${x1},${y1} C${axisP},${y1} ${axisP},${y2} ${x2},${y2}`;
  }
}

// ── Layout computation ────────────────────────────────────────────────────────

function computeLayout(data: TimelineData, orientation: Orientation, today: string) {
  const isH = orientation === "horizontal";
  const W = isH ? CW_H : CW_V;
  const H = isH ? CH_H : CH_V;
  const axisPos = isH ? AXIS_Y : AXIS_X;

  const dateMin = new Date("2026-01-01T00:00:00Z");
  const dateMax = new Date("2027-01-01T00:00:00Z");

  const scale = isH
    ? scaleTime().domain([dateMin, dateMax]).range([MG.left, W - MG.right])
    : scaleTime().domain([dateMin, dateMax]).range([MG.top, H - MG.bottom]);

  const nodeMap = new Map(data.nodes.map((n) => [n.id, n]));

  // Compute effective dates
  const effDates = new Map(
    data.nodes.map((n) => [n.id, effectiveDateFor(n, data.edges, nodeMap, today)]),
  );

  // Sort nodes by effective date for greedy lane assignment
  const sorted = [...data.nodes]
    .map((n) => ({ id: n.id, pos: scale(isoToDate(effDates.get(n.id)!)) }))
    .sort((a, b) => a.pos - b.pos);

  const lanes = isH ? LANES_H : LANES_V;
  const priority = isH ? LANE_PRI_H : LANE_PRI_V;
  const minGap = isH ? MIN_GAP_H : MIN_GAP_V;
  const laneMap = assignLanes(sorted, priority, minGap);

  const nodeLayouts: LayoutNode[] = data.nodes.map((n) => {
    const pos = scale(isoToDate(effDates.get(n.id)!));
    const laneIdx = laneMap.get(n.id) ?? 0;
    const lanePos = lanes[laneIdx] ?? lanes[0];
    const r = n.id === "n-mayor-nichols" ? FOCAL_R : NODE_R;
    return {
      node: n,
      cx: isH ? pos : lanePos,
      cy: isH ? lanePos : pos,
      r,
      temporalState: temporalStateFor(n, today),
      effectiveDate: effDates.get(n.id)!,
    };
  });

  const nodeLayoutMap = new Map(nodeLayouts.map((nl) => [nl.node.id, nl]));

  const edgeLayouts: LayoutEdge[] = data.edges.map((e) => ({
    edge: e,
    fromLayout: nodeLayoutMap.get(e.from),
    toLayout: nodeLayoutMap.get(e.to),
  }));

  // Demand curve
  const model = data.demandModel;
  const demandSamples = backgroundCurveSamples(model, 0, TMAX);
  const demandPoints = demandSamples.map((p) => {
    const pos = scale(tMonthsToDate(p.tMonths));
    return {
      x: isH ? pos : AXIS_X + (p.value / 100) * DEMAND_W,
      y: isH ? AXIS_Y - (p.value / 100) * DEMAND_H : pos,
      baseline_x: AXIS_X,
      baseline_y: AXIS_Y,
    };
  });

  const nSteps = equipmentStepSeries(model, TMAX).map((s) => ({
    pos: scale(tMonthsToDate(s.tMonths)),
    machines: s.machines,
    demandFrac: demandSamples.find((p) => Math.abs(p.tMonths - s.tMonths) < 0.1)?.value ?? 0,
  }));

  // Axis ticks (monthly)
  const ticks = MONTHS.map((label, i) => ({
    label,
    pos: scale(new Date(`2026-${String(i + 1).padStart(2, "0")}-01T00:00:00Z`)),
  }));

  const todayPos = scale(isoToDate(today));

  return {
    W, H, axisPos, isH,
    nodeLayouts, edgeLayouts,
    demandPoints, nSteps, ticks, todayPos,
    scale,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  data: TimelineData;
  orientation: Orientation;
  today: string;
  focusNodeId: string | null;
  /** `originEl` is the SVG <g> that triggered the click — modal returns focus there (§4.3). */
  onNodeClick: (id: string, originEl: Element) => void;
  onOrientationToggle: () => void;
  /**
   * Hover-card seam (§4.3). Called with id + fixed screen coords on enter,
   * null/0/0 on leave. Consumed by App to render <HoverCard>.
   */
  onNodeHover?: (id: string | null, x: number, y: number) => void;
  /** When set, nodes not in this set are dimmed (search/filter). */
  matchedNodeIds?: Set<string> | null;
  /** When set, this node gets an extra presenter-step glow ring. */
  presenterStepId?: string | null;
  /** Hide the controls bar (presenter mode). */
  hideControls?: boolean;
}

export function TimelineRenderer({
  data,
  orientation,
  today,
  focusNodeId,
  onNodeClick,
  onOrientationToggle,
  onNodeHover,
  matchedNodeIds,
  presenterStepId,
  hideControls,
}: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [todayTooltipVisible, setTodayTooltipVisible] = useState(false);
  const [todayTooltipPos, setTodayTooltipPos] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  const layout = useMemo(
    () => computeLayout(data, orientation, today),
    [data, orientation, today],
  );

  const { W, H, axisPos, isH, nodeLayouts, edgeLayouts, demandPoints, nSteps, ticks, todayPos } = layout;

  // Connected node IDs for highlight/dim logic
  const activeId = hoveredId ?? focusNodeId;
  const connectedIds = useMemo(() => {
    if (!activeId) return null;
    const ids = new Set<string>([activeId]);
    for (const e of data.edges) {
      if (e.from === activeId) ids.add(e.to);
      if (e.to === activeId) ids.add(e.from);
    }
    return ids;
  }, [activeId, data.edges]);

  const nodeOpacity = useCallback(
    (id: string) => {
      // Search filter dimming takes precedence over hover highlight
      if (matchedNodeIds != null) {
        return matchedNodeIds.has(id) ? 1 : 0.08;
      }
      if (!connectedIds) return 1;
      return connectedIds.has(id) ? 1 : 0.12;
    },
    [connectedIds, matchedNodeIds],
  );

  const edgeOpacity = useCallback(
    (e: Edge) => {
      if (!connectedIds) return 0.5;
      return connectedIds.has(e.from) && connectedIds.has(e.to) ? 0.9 : 0.06;
    },
    [connectedIds],
  );

  const handleTodayMouseMove = useCallback(
    (e: React.MouseEvent<SVGLineElement>) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      setTodayTooltipPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top - 10,
      });
    },
    [],
  );

  // Build demand area path
  const demandAreaPath = useMemo(() => {
    if (demandPoints.length < 2) return "";
    const areaGen = isH
      ? area<{ x: number; y: number }>()
          .x((d) => d.x)
          .y0(AXIS_Y)
          .y1((d) => d.y)
          .curve(curveBasis)
      : area<{ x: number; y: number }>()
          .y((d) => d.y)
          .x0(AXIS_X)
          .x1((d) => d.x)
          .curve(curveBasis);
    return areaGen(demandPoints) ?? "";
  }, [demandPoints, isH]);

  const nodeColor = (n: TimelineNode) => NODE_COLORS[n.type] ?? "#94a3b8";

  const temporalOpacity = (nl: LayoutNode) => {
    if (nl.temporalState === "projected") return 0.42;
    return 1;
  };

  const isFocalNode = (id: string) => id === "n-mayor-nichols";

  // SVG marker (arrowhead) id for converges_on
  const ARROW_MARKER = "arrow-converges";
  const GLOW_FILTER = "mayor-glow";

  return (
    <div className="timeline-svg-wrapper" style={{ position: "relative" }}>
      {!hideControls && (
        <div className="timeline-controls">
          <span className="timeline-title">Pleet LLC · Strategic Timeline</span>
          <button
            className="btn-toggle"
            onClick={onOrientationToggle}
            aria-pressed={orientation === "vertical"}
            aria-label={`Switch to ${orientation === "horizontal" ? "vertical" : "horizontal"} layout`}
          >
            {orientation === "horizontal" ? "↕ Vertical" : "↔ Horizontal"}
          </button>
        </div>
      )}

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMin meet"
        className="timeline-svg"
        role="img"
        aria-label="Pleet strategic timeline"
        style={{ background: "transparent" }}
      >
        <defs>
          <marker
            id={ARROW_MARKER}
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="3.5"
            orient="auto"
          >
            <path d="M0,0 L0,7 L8,3.5 z" fill="#a78bfa" />
          </marker>
          <filter id={GLOW_FILTER} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient
            id="demand-grad"
            gradientUnits="userSpaceOnUse"
            x1={isH ? "0" : String(AXIS_X)}
            y1={isH ? String(AXIS_Y) : "0"}
            x2={isH ? "0" : String(AXIS_X + DEMAND_W)}
            y2={isH ? String(AXIS_Y - DEMAND_H) : "0"}
          >
            <stop offset="0%" stopColor="#6ea8ff" stopOpacity="0" />
            <stop offset="100%" stopColor="#6ea8ff" stopOpacity="0.18" />
          </linearGradient>
        </defs>

        {/* ── Demand background layer (§5.1/§6.1 — THEORETICAL) ── */}
        <g aria-label="Demand background layer (theoretical)">
          <path d={demandAreaPath} fill="url(#demand-grad)" stroke="none" />
          {/* N(t) step markers */}
          {nSteps.filter((s) => s.machines > 1).map((s) => {
            const stepX = isH ? s.pos : AXIS_X + (s.demandFrac / 100) * DEMAND_W + 12;
            const stepY = isH ? AXIS_Y - (s.demandFrac / 100) * DEMAND_H - 12 : s.pos;
            return (
              <g key={s.pos} transform={`translate(${stepX},${stepY})`}>
                <polygon points="-5,6 5,6 0,-4" fill="#57e0a8" opacity="0.7" />
                <text
                  x={isH ? 0 : 8}
                  y={isH ? -6 : 4}
                  textAnchor={isH ? "middle" : "start"}
                  className="demand-label"
                  aria-label={`${s.machines} machines needed`}
                >
                  N={s.machines}
                </text>
              </g>
            );
          })}
          <text
            x={isH ? W - MG.right - 4 : AXIS_X + DEMAND_W + 4}
            y={isH ? AXIS_Y - DEMAND_H - 4 : MG.top + 10}
            textAnchor={isH ? "end" : "start"}
            className="demand-label"
          >
            D(t) — theoretical/illustrative (§6)
          </text>
        </g>

        {/* ── Time axis ── */}
        <g aria-label="Time axis">
          {/* Main axis line */}
          {isH ? (
            <line
              x1={MG.left} y1={AXIS_Y} x2={W - MG.right} y2={AXIS_Y}
              stroke="rgba(255,255,255,0.25)" strokeWidth="1"
            />
          ) : (
            <line
              x1={AXIS_X} y1={MG.top} x2={AXIS_X} y2={H - MG.bottom}
              stroke="rgba(255,255,255,0.25)" strokeWidth="1"
            />
          )}
          {/* Month ticks */}
          {ticks.map(({ label, pos }) => (
            <g key={label}>
              {isH ? (
                <>
                  <line x1={pos} y1={AXIS_Y - 4} x2={pos} y2={AXIS_Y + 4} stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
                  <text x={pos} y={AXIS_Y + 18} textAnchor="middle" className="demand-label">{label}</text>
                </>
              ) : (
                <>
                  <line x1={AXIS_X - 4} y1={pos} x2={AXIS_X + 4} y2={pos} stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
                  <text x={AXIS_X - 8} y={pos + 4} textAnchor="end" className="demand-label">{label}</text>
                </>
              )}
            </g>
          ))}
          {/* Year label */}
          <text
            x={isH ? W / 2 : AXIS_X}
            y={isH ? AXIS_Y + 36 : H - MG.bottom + 20}
            textAnchor="middle"
            className="demand-label"
            style={{ fontSize: 13, fill: "rgba(174,182,198,0.8)" }}
          >
            2026
          </text>
        </g>

        {/* ── Edges ── */}
        <g aria-label="Relationships">
          {edgeLayouts.map(({ edge, fromLayout, toLayout }) => {
            if (!fromLayout || !toLayout) return null;
            const color = EDGE_COLORS[edge.kind] ?? "#6b7280";
            const isFinances = edge.kind === "finances";
            const isConverges = edge.kind === "converges_on";
            const path = edgePath(
              fromLayout.cx, fromLayout.cy,
              toLayout.cx, toLayout.cy,
              isH, axisPos,
            );
            return (
              <path
                key={edge.id}
                d={path}
                stroke={color}
                strokeWidth={isFinances || isConverges ? 2 : 1.5}
                strokeDasharray={isFinances ? "6 3" : undefined}
                fill="none"
                opacity={edgeOpacity(edge)}
                markerEnd={isConverges ? `url(#${ARROW_MARKER})` : undefined}
                aria-label={`${edge.kind} edge from ${fromLayout.node.title} to ${toLayout.node.title}`}
              />
            );
          })}
        </g>

        {/* ── Today marker ── */}
        <g aria-label={`Today: ${today}`}>
          {isH ? (
            <>
              {/* Projected overlay */}
              <rect
                x={todayPos}
                y={0}
                width={Math.max(0, W - MG.right - todayPos)}
                height={H}
                fill="rgba(255,255,255,0.025)"
                pointerEvents="none"
              />
              {/* The line */}
              <line
                x1={todayPos} y1={MG.top}
                x2={todayPos} y2={H - MG.bottom + 20}
                stroke="white"
                strokeWidth="2"
                className="today-line"
                style={{ cursor: "crosshair" }}
                onMouseEnter={() => setTodayTooltipVisible(true)}
                onMouseLeave={() => setTodayTooltipVisible(false)}
                onMouseMove={handleTodayMouseMove}
              />
              {/* Pulse dot at axis crossing */}
              <circle
                cx={todayPos}
                cy={AXIS_Y}
                r="5"
                fill="white"
                className="today-pulse"
              />
              {/* Label */}
              <text
                x={todayPos + 5}
                y={MG.top + 12}
                className="today-label"
                textAnchor="start"
              >
                Today
              </text>
              <text
                x={todayPos + 5}
                y={MG.top + 24}
                style={{ fontSize: 10, fill: "rgba(255,255,255,0.6)" }}
              >
                {today}
              </text>
            </>
          ) : (
            <>
              {/* Projected overlay */}
              <rect
                x={0}
                y={todayPos}
                width={W}
                height={Math.max(0, H - MG.bottom - todayPos)}
                fill="rgba(255,255,255,0.025)"
                pointerEvents="none"
              />
              <line
                x1={MG.left} y1={todayPos}
                x2={W - MG.right} y2={todayPos}
                stroke="white"
                strokeWidth="2"
                className="today-line"
                style={{ cursor: "crosshair" }}
                onMouseEnter={() => setTodayTooltipVisible(true)}
                onMouseLeave={() => setTodayTooltipVisible(false)}
                onMouseMove={handleTodayMouseMove}
              />
              <circle
                cx={AXIS_X}
                cy={todayPos}
                r="5"
                fill="white"
                className="today-pulse"
              />
              <text
                x={MG.left + 4}
                y={todayPos - 5}
                className="today-label"
              >
                Today · {today}
              </text>
            </>
          )}
        </g>

        {/* ── Nodes ── */}
        <g aria-label="Timeline nodes">
          {nodeLayouts.map((nl) => {
            const { node } = nl;
            const color = nodeColor(node);
            const opacity = temporalOpacity(nl) * nodeOpacity(node.id);
            const strokeDash = nl.temporalState === "projected" ? "4 2" : undefined;
            const isActive = node.id === activeId;
            const isFocal = isFocalNode(node.id);
            const isPresenterStep = presenterStepId === node.id;
            const labelX = isH ? nl.cx + nl.r + 5 : nl.cx + nl.r + 5;
            const labelY = isH ? nl.cy + 4 : nl.cy - 5;
            const stemX2 = isH ? nl.cx : AXIS_X;
            const stemY2 = isH ? AXIS_Y : nl.cy;

            return (
              <g
                key={node.id}
                opacity={opacity}
                style={{ cursor: "pointer" }}
                onMouseEnter={(e) => {
                  setHoveredId(node.id);
                  if (onNodeHover) {
                    const rect = (e.currentTarget as SVGGElement).getBoundingClientRect();
                    onNodeHover(node.id, rect.left + rect.width / 2, rect.top - 8);
                  }
                }}
                onMouseLeave={() => {
                  setHoveredId(null);
                  onNodeHover?.(null, 0, 0);
                }}
                onClick={(e) => onNodeClick(node.id, e.currentTarget)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onNodeClick(node.id, e.currentTarget);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`${node.type}: ${node.title}${node.confidence === "unconfirmed" ? " (unconfirmed)" : ""}`}
              >
                {/* Stem to axis */}
                <line
                  x1={nl.cx} y1={nl.cy}
                  x2={stemX2} y2={stemY2}
                  stroke="rgba(255,255,255,0.13)"
                  strokeWidth="1"
                  strokeDasharray={strokeDash}
                />
                {/* Glow + extra ring for focal node (Mayor) */}
                {isFocal && (
                  <circle
                    cx={nl.cx} cy={nl.cy}
                    r={nl.r + 6}
                    fill="none"
                    stroke="#a78bfa"
                    strokeWidth="1.5"
                    opacity={0.5}
                    filter={`url(#${GLOW_FILTER})`}
                  />
                )}
                {/* Presenter-step highlight ring */}
                {isPresenterStep && (
                  <circle
                    cx={nl.cx} cy={nl.cy}
                    r={nl.r + 10}
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    opacity={0.85}
                    filter={`url(#${GLOW_FILTER})`}
                    className="presenter-step-ring"
                  />
                )}
                {/* Main circle */}
                <circle
                  cx={nl.cx} cy={nl.cy}
                  r={nl.r}
                  fill={color}
                  fillOpacity={nl.temporalState === "projected" ? 0.35 : 0.85}
                  stroke={color}
                  strokeWidth={isActive ? 2.5 : 1.5}
                  strokeDasharray={strokeDash}
                  filter={isFocal ? `url(#${GLOW_FILTER})` : undefined}
                />
                {/* Unconfirmed hatch */}
                {node.confidence === "unconfirmed" && (
                  <circle
                    cx={nl.cx} cy={nl.cy}
                    r={nl.r - 4}
                    fill="none"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="1"
                    strokeDasharray="3 2"
                  />
                )}
                {/* Type icon or initials */}
                <text
                  x={nl.cx} y={nl.cy + 4}
                  textAnchor="middle"
                  style={{ fontSize: 10, fill: "#0a0c11", fontWeight: 700, pointerEvents: "none" }}
                >
                  {node.type[0].toUpperCase()}
                </text>
                {/* Label */}
                <text
                  x={labelX}
                  y={labelY}
                  className={node.confidence === "unconfirmed" ? "node-label node-label-unconfirmed" : "node-label"}
                  aria-hidden="true"
                >
                  {node.title.length > 28 ? node.title.slice(0, 26) + "…" : node.title}
                </text>
                {nl.temporalState === "projected" && (
                  <text
                    x={labelX}
                    y={labelY + 13}
                    style={{ fontSize: 9, fill: "rgba(174,182,198,0.6)", pointerEvents: "none" }}
                    aria-hidden="true"
                  >
                    Projected
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Today tooltip (HTML overlay) */}
      {todayTooltipVisible && (
        <div
          className="today-tooltip"
          style={{
            left: todayTooltipPos.x,
            top: todayTooltipPos.y,
            pointerEvents: "none",
          }}
          role="tooltip"
          aria-live="polite"
        >
          {today}
          {typeof window !== "undefined" && new URLSearchParams(window.location.search).get("asof") && (
            <span style={{ marginLeft: 6, opacity: 0.6, fontSize: 10 }}>(asof override)</span>
          )}
        </div>
      )}
    </div>
  );
}
