// =============================================================================
// Node icons (PLE-92, v4). Board direction: "the nodes are without icons."
// Every node now carries an icon. Priority: a researched org logo (see
// entityLogos.ts), else a crisp category glyph inferred from the node's type +
// title/thread keywords, else a colored person/initials avatar. Inline SVG so
// icons stay sharp and dependency-free; logos degrade gracefully to the glyph.
// =============================================================================

import { useState } from "react";
import type { NodeType } from "../../data/types";
import { logoForNode } from "./entityLogos";

type Category =
  | "person"
  | "bank"
  | "gov"
  | "architecture"
  | "media"
  | "print"
  | "school"
  | "airport"
  | "project"
  | "event"
  | "concept";

interface IconNode {
  id: string;
  title: string;
  type: NodeType;
  thread: string | null;
  summary: string;
}

function categoryFor(node: Omit<IconNode, "id">): Category {
  const t = `${node.title} ${node.thread ?? ""} ${node.summary}`.toLowerCase();
  if (/bank|lending|ibc|bancfirst|gateway|financ/.test(t)) return "bank";
  if (/mayor|city council|city of tulsa|rezoning|housing authority/.test(t)) return "gov";
  if (/architect|ncarb|lee simon|design \+ construction/.test(t)) return "architecture";
  if (/white wolf|pleet tv|media|creative|video|brand/.test(t)) return "media";
  if (/3d print|print|sq4d|skyland|manufactur|printer|equipment/.test(t)) return "print";
  if (/school|savanna|enrollment|bond|ossba|concept art/.test(t)) return "school";
  if (/airport|hangar|aviation/.test(t)) return "airport";
  if (node.type === "person") return "person";
  if (node.type === "project") return "project";
  if (node.type === "concept") return "concept";
  return "event";
}

/** 18×18 line glyphs on a 24 viewBox, drawn in currentColor. */
const GLYPH: Record<Category, JSX.Element> = {
  person: (
    <>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5.5 19c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
    </>
  ),
  bank: (
    <>
      <path d="M3 9.5 12 4l9 5.5" />
      <path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8" />
      <path d="M3.5 20.5h17" />
    </>
  ),
  gov: (
    <>
      <path d="M3 9.5 12 4l9 5.5" />
      <path d="M5 10v7.5M12 10v7.5M19 10v7.5" />
      <path d="M3.5 20.5h17M4 17.5h16" />
    </>
  ),
  architecture: (
    <>
      <path d="M5 4v13l7 3 7-3" />
      <path d="M5 17 12 8l7 9" />
      <path d="M12 4v4" />
    </>
  ),
  media: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="M10 9.5l5 2.5-5 2.5z" />
    </>
  ),
  print: (
    <>
      <path d="M7 9V4h10v5" />
      <rect x="4.5" y="9" width="15" height="7" rx="1.5" />
      <path d="M7 14h10v6H7z" />
    </>
  ),
  school: (
    <>
      <path d="M12 5 3 9l9 4 9-4z" />
      <path d="M7 11v4.5c0 1.4 2.6 2.5 5 2.5s5-1.1 5-2.5V11" />
    </>
  ),
  airport: (
    <>
      <path d="M3 14l18-5-3 9-4-3-2 3-1-4z" />
    </>
  ),
  project: (
    <>
      <rect x="5" y="4" width="14" height="16" rx="1.5" />
      <path d="M8.5 8h2M13.5 8h2M8.5 12h2M13.5 12h2M8.5 16h2M13.5 16h2" />
    </>
  ),
  event: (
    <>
      <rect x="4.5" y="5.5" width="15" height="14" rx="2" />
      <path d="M4.5 9.5h15M8.5 4v3M15.5 4v3" />
    </>
  ),
  concept: (
    <>
      <path d="M9 16.5h6M9.7 19h4.6" />
      <path d="M12 3.5a5.5 5.5 0 0 1 3.4 9.8c-.7.6-1 1-1 1.7H9.6c0-.7-.3-1.1-1-1.7A5.5 5.5 0 0 1 12 3.5z" />
    </>
  ),
};

interface Props {
  node: IconNode;
  /** Accent color (matches the node type bar). */
  color: string;
}

export function NodeIcon({ node, color }: Props) {
  const logo = logoForNode(node.id);
  const [logoFailed, setLogoFailed] = useState(false);

  if (logo && !logoFailed) {
    return (
      <span className="flow-node__icon flow-node__icon--logo">
        <img
          src={logo}
          alt=""
          loading="lazy"
          onError={() => setLogoFailed(true)}
          width={20}
          height={20}
        />
      </span>
    );
  }

  const cat = categoryFor(node);
  return (
    <span
      className="flow-node__icon"
      style={{ color, ["--icon-accent" as string]: color }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        {GLYPH[cat]}
      </svg>
    </span>
  );
}

/** Exposed for the legend / tests. */
export { categoryFor };
export type { Category };
