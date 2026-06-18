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
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={classes}
      style={{ ["--node-accent" as string]: color }}
      title={d.title}
    >
      <Handle type="target" position={Position.Left} className="flow-handle" />
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
      <Handle type="source" position={Position.Right} className="flow-handle" />
    </div>
  );
}

export const StageNode = memo(StageNodeImpl);
