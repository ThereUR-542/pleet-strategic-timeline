// =============================================================================
// Custom React Flow node (PLE-92, v4). A solid, self-contained card — never
// translucent, never layered. Now with an ICON (researched org logo, else a
// category glyph), a color accent by type, title, one-line meta, and small
// badges for THEORETICAL demand score (§5.2) / unconfirmed status (§12).
// =============================================================================

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { Confidence, NodeType } from "../../data/types";
import { NODE_COLOR, NODE_TYPE_LABEL, threadLabel } from "./flowTheme";
import { NodeIcon } from "./flowIcons";

export interface StageNodeData {
  id: string;
  title: string;
  summary: string;
  type: NodeType;
  thread: string | null;
  effectiveDate: string | null;
  demandScore: number | null;
  confidence: Confidence;
  isToday: boolean;
  isFocal: boolean;
  /** Octopus convergence point: a `concept` node with ≥3 converging edges. */
  isHub: boolean;
  /** Z-plane depth layer (PLE-115 §10.2): thread→integer; hubs pinned to 0.
   *  Only consumed in 3D mode via the `--node-z` var; ignored in flat 2D. */
  zLayer: number;
  /** Dimmed by the search filter (still visible, just receded). */
  dimmed: boolean;
  /** Ghost / antecedent (PLE-120/PLE-127): predates its own thread; renders
   *  faded + dotted + an inline "antecedent" meta chip. Orthogonal to confidence. */
  isAntecedent: boolean;
  /** PLE-155 person node: short name + role for the caption rendered BELOW the
   *  disc (the full title overflows a 72px circle). Populated for `type:"person"`. */
  personName?: string;
  personRole?: string;
  [key: string]: unknown;
}

/** Head-and-shoulders silhouette (currentColor) — the color-independent
 *  "this is a person" cue inside the disc (spec §2.1, WCAG shape-not-just-hue). */
function PersonGlyph() {
  return (
    <svg
      className="person-glyph"
      viewBox="0 0 24 24"
      width={30}
      height={30}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8.5" r="3.6" />
      <path d="M5.5 19.5c0-3.7 2.9-6.2 6.5-6.2s6.5 2.5 6.5 6.2" />
    </svg>
  );
}

function StageNodeImpl({ data, selected }: NodeProps) {
  const d = data as StageNodeData;
  const color = NODE_COLOR[d.type] ?? "#94a3b8";
  const meta = [NODE_TYPE_LABEL[d.type], threadLabel(d.thread), d.effectiveDate]
    .filter(Boolean)
    .join(" · ");

  const isPerson = d.type === "person";
  const classes = [
    "flow-node",
    isPerson ? "flow-node--person" : "",
    selected ? "flow-node--selected" : "",
    d.dimmed ? "flow-node--dimmed" : "",
    d.confidence === "unconfirmed" ? "flow-node--unconfirmed" : "",
    d.isFocal ? "flow-node--focal" : "",
    d.isHub ? "flow-node--hub" : "",
    d.isAntecedent ? "flow-node--antecedent" : "",
  ]
    .filter(Boolean)
    .join(" ");

  // ── Person node (PLE-155 §2): a 72px DISC + silhouette, name/role caption
  //    BELOW the disc — a distinct register from the Event/Project/Concept cards.
  //    Side handles only (left/right) so curvilinear relationship edges leave the
  //    disc cleanly; the disc is positioned disc-centered in FlowCanvas. ──
  if (isPerson) {
    return (
      <div
        className={classes}
        style={{ ["--node-accent" as string]: color }}
        title={d.title}
      >
        <Handle id="tl" type="target" position={Position.Left} className="flow-handle" />
        <Handle id="sl" type="source" position={Position.Left} className="flow-handle" />
        <Handle id="tr" type="target" position={Position.Right} className="flow-handle" />
        <Handle id="sr" type="source" position={Position.Right} className="flow-handle" />
        <span className="person-disc" aria-hidden="true">
          <PersonGlyph />
        </span>
        <div className="person-caption">
          <b>{d.personName || d.title}</b>
          {d.personRole && <span>{d.personRole}</span>}
        </div>
        {d.isToday && (
          <span className="person-today" title="Today">TODAY</span>
        )}
      </div>
    );
  }

  // Octopus routing (PLE-121 §3): every node carries source+target handles on
  // left & right; `concept` hubs add top & bottom so converging tentacles can
  // reach from any direction. Handle ids are sided ("sl"/"tl"=source/target
  // left, etc.) and selected per-edge in FlowCanvas to minimise path length.
  const isHub = d.isHub;

  return (
    <div
      className={classes}
      style={{
        ["--node-accent" as string]: color,
        // Z-plane depth lift (PLE-115 §10.2). Read only under .flow-canvas--zmode;
        // a flat 2D canvas ignores it entirely.
        ["--node-z" as string]: `calc(var(--zplane-layer-gap) * ${d.zLayer ?? 0})`,
      }}
      title={d.title}
    >
      <Handle id="tl" type="target" position={Position.Left} className="flow-handle" />
      <Handle id="sl" type="source" position={Position.Left} className="flow-handle" />
      <Handle id="tr" type="target" position={Position.Right} className="flow-handle" />
      <Handle id="sr" type="source" position={Position.Right} className="flow-handle" />
      {isHub && (
        <>
          <Handle id="tt" type="target" position={Position.Top} className="flow-handle" />
          <Handle id="st" type="source" position={Position.Top} className="flow-handle" />
          <Handle id="tb" type="target" position={Position.Bottom} className="flow-handle" />
          <Handle id="sb" type="source" position={Position.Bottom} className="flow-handle" />
        </>
      )}
      <span className="flow-node__bar" aria-hidden="true" />
      <NodeIcon
        node={{ id: d.id, title: d.title, type: d.type, thread: d.thread, summary: d.summary }}
        color={color}
      />
      <div className="flow-node__body">
        <div className="flow-node__title">{d.title}</div>
        <div className="flow-node__meta">
          {d.isAntecedent && (
            <span className="meta-antecedent" title="Antecedent — predates its own thread (PLE-120)">
              <span className="gly" aria-hidden="true" />
              antecedent
            </span>
          )}
          <span className="meta-text">{meta}</span>
        </div>
      </div>
      <div className="flow-node__badges">
        {d.isToday && <span className="flow-badge flow-badge--today">TODAY</span>}
        {d.demandScore !== null && (
          <span className="flow-badge flow-badge--demand" title="THEORETICAL demand score (§6)">
            D {d.demandScore}
          </span>
        )}
        {d.confidence === "unconfirmed" && (
          <span className="flow-badge flow-badge--pending" title="Pending verification (§12)">
            pending
          </span>
        )}
      </div>
    </div>
  );
}

export const StageNode = memo(StageNodeImpl);
