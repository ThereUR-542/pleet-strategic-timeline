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
  [key: string]: unknown;
}

function StageNodeImpl({ data, selected }: NodeProps) {
  const d = data as StageNodeData;
  const color = NODE_COLOR[d.type] ?? "#94a3b8";
  const meta = [NODE_TYPE_LABEL[d.type], threadLabel(d.thread), d.effectiveDate]
    .filter(Boolean)
    .join(" · ");

  const classes = [
    "flow-node",
    selected ? "flow-node--selected" : "",
    d.dimmed ? "flow-node--dimmed" : "",
    d.confidence === "unconfirmed" ? "flow-node--unconfirmed" : "",
    d.isFocal ? "flow-node--focal" : "",
    d.isHub ? "flow-node--hub" : "",
  ]
    .filter(Boolean)
    .join(" ");

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
        <div className="flow-node__meta">{meta}</div>
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
