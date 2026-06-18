// =============================================================================
// Shared inline-markdown renderer (§4.4). Bold (`**…**`) + external links
// `[text](url)`. External links always get rel="noopener noreferrer"
// target="_blank" (§4.4/§11 — reverse-tabnabbing). Used by the modal AND the
// flow-graph detail side panel so both render body copy identically.
// =============================================================================

import type { ReactNode } from "react";
import { externalLinkProps } from "./links";

/** Parse inline markdown: bold (`**…**`) and external links `[text](url)`. */
export function renderInline(text: string): ReactNode {
  const linkRe = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  const nodes: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = linkRe.exec(text)) !== null) {
    if (m.index > last) {
      nodes.push(...splitBold(text.slice(last, m.index), nodes.length));
    }
    nodes.push(
      <a key={m.index} {...externalLinkProps(m[2])}>
        {m[1]}
      </a>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    nodes.push(...splitBold(text.slice(last), nodes.length));
  }

  return nodes.length ? nodes : text;
}

function splitBold(text: string, baseKey: number): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={baseKey + i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}
