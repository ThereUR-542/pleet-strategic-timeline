// =============================================================================
// Node detail — DOCKED side panel (PLE-92 / PLE-102, per the PLE-101 spec).
// Sits in its OWN column beside the canvas on desktop (the canvas resizes to
// make room); on mobile it's a bottom sheet over a dimmed/blurred graph. Nothing
// is ever stacked over a live, busy graph. Esc / ✕ / scrim-tap close.
//
// Anatomy (PLE-101 §3): type-keyed top border → tag pill → title → meta + state
// chip → status chips → description → KEY FACTS → CONNECTIONS → media → footer
// source line. All spacing/type from PLE-99 tokens; all color from flowTheme.
// =============================================================================

import { useEffect, useMemo, useRef } from "react";
import type { CSSProperties } from "react";
import type {
  Edge,
  IsoDate,
  PersonProfile,
  TimelineNode,
  Citation,
} from "../../data/types";
import { renderMla } from "../../lib/mla";
import { externalLinkProps } from "../../lib/links";
import { renderInline } from "../../lib/inlineMarkdown";
import { temporalStateFor } from "../../lib/temporal";
import { MediaEmbed } from "../modal/MediaEmbed";
import type { PersonConnection } from "./personGraph";
import {
  NODE_COLOR,
  NODE_TYPE_LABEL,
  EDGE_COLOR,
  EDGE_KIND_LABEL,
  threadLabel,
} from "./flowTheme";

interface Props {
  node: TimelineNode;
  citations: Citation[];
  /** All edges — used to derive the Connections row (PLE-101 §3.2). */
  edges: Edge[];
  /** All nodes — to resolve connected node titles. */
  nodes: TimelineNode[];
  /** "Today" anchor for the temporal-state chip (§4.7). */
  today: IsoDate;
  onClose: () => void;
  /** PLE-155: jump to another node (relationship-graphic / timeline chips). */
  onNavigate?: (id: string) => void;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** `2026-06-17` → `Jun 17, 2026`. Pure string parse (no Date/locale). */
function formatDate(iso: IsoDate): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const [, y, mo, d] = m;
  return `${MONTHS[Number(mo) - 1]} ${Number(d)}, ${y}`;
}

/** Human "when" line: single date, or a `start – end` range. */
function formatWhen(node: TimelineNode): string | null {
  if (node.date) return formatDate(node.date);
  if (node.dateStart && node.dateEnd)
    return `${formatDate(node.dateStart)} – ${formatDate(node.dateEnd)}`;
  return node.dateStart ?? node.dateEnd ? formatDate((node.dateStart ?? node.dateEnd)!) : null;
}

const STATE_LABEL = { past: "Past", today: "Today", projected: "Projected" } as const;

/**
 * Key facts. Curated `node.keyFacts` win; otherwise derive a scannable fallback
 * from existing fields (PLE-101 §4.5 — derived fallback is acceptable for v1).
 * Demand + connections have their own surfaces, so they're excluded here.
 */
function deriveKeyFacts(node: TimelineNode): string[] {
  if (node.keyFacts && node.keyFacts.length) return node.keyFacts.slice(0, 6);
  const when = formatWhen(node);
  const candidates = [
    `Type: ${NODE_TYPE_LABEL[node.type]}`,
    node.thread ? `Thread: ${threadLabel(node.thread)}` : null,
    when ? `When: ${when}` : null,
    node.summary ? `Summary: ${node.summary}` : null,
    `Confidence: ${node.confidence === "confirmed" ? "Confirmed — cited" : "Pending verification (§12)"}`,
  ];
  return candidates.filter((f): f is string => Boolean(f)).slice(0, 6);
}

/** Split `"Key: value"` for styling; plain strings render as value-only. */
function splitFact(fact: string): { key: string | null; value: string } {
  const i = fact.indexOf(": ");
  if (i === -1) return { key: null, value: fact };
  return { key: fact.slice(0, i), value: fact.slice(i + 2) };
}

// ── PLE-155 Person modal ──────────────────────────────────────────────────────

/** All unique connections across a person's relationships (deduped, node-resolved
 *  when possible) for the relationship graphic. Node-backed entries are clickable. */
function resolveConnections(
  person: PersonProfile,
  byId: Map<string, TimelineNode>,
): PersonConnection[] {
  const out: PersonConnection[] = [];
  const seen = new Set<string>();
  for (const rel of person.relationships) {
    rel.connectedNodeIds.forEach((cid) => {
      if (seen.has(cid)) return;
      seen.add(cid);
      const cn = byId.get(cid);
      out.push({
        id: cn ? cid : null,
        title: cn ? cn.title : cid,
        color: cn ? NODE_COLOR[cn.type] ?? "#6ea8ff" : "#6ea8ff",
      });
    });
    // Titles beyond the resolved ids are labels with no node of their own.
    rel.connectedNodeTitles.slice(rel.connectedNodeIds.length).forEach((t) => {
      if (seen.has(t)) return;
      seen.add(t);
      out.push({ id: null, title: t, color: "#6b7280" });
    });
  }
  return out;
}

const GRAPHIC_MAX = 12;

/**
 * In-modal relationship graphic (§4.2): a radial mini-graph with the person disc
 * anchored at left and every connection on a CURVILINEAR bezier radiating out —
 * the same visual language as the canvas. Node-backed chips navigate on click.
 * Curve strokes use literal hex (SVG attrs don't resolve CSS vars — spec GOTCHA).
 */
function PersonRelationshipGraphic({
  name,
  connections,
  onNavigate,
}: {
  name: string;
  connections: PersonConnection[];
  onNavigate?: (id: string) => void;
}) {
  const shown = connections.slice(0, GRAPHIC_MAX);
  const overflow = connections.length - shown.length;
  const rowStep = 34;
  const padY = 18;
  const H = Math.max(150, padY * 2 + shown.length * rowStep);
  const W = 340;
  const discCx = 38;
  const discCy = H / 2;
  const endX = 150;
  const yFor = (i: number) => padY + i * rowStep + rowStep / 2;

  return (
    <div className="person-graphic" role="group" aria-label={`${name} — relationship graphic`}>
      <div className="person-graphic__scroll" style={{ height: H }}>
        <svg
          className="person-graphic__svg"
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          aria-hidden="true"
        >
          {shown.map((_c, i) => {
            const y = yFor(i);
            return (
              <path
                key={i}
                d={`M ${discCx} ${discCy} C ${discCx + 64} ${discCy}, ${endX - 56} ${y}, ${endX} ${y}`}
                fill="none"
                stroke="#6ea8ff"
                strokeWidth={1.4}
                strokeOpacity={0.55}
                strokeLinecap="round"
              />
            );
          })}
          {shown.map((_c, i) => (
            <circle key={`e${i}`} cx={endX} cy={yFor(i)} r={3} fill="#6ea8ff" />
          ))}
          {/* anchor disc */}
          <circle cx={discCx} cy={discCy} r={18} fill="rgba(20,26,38,0.95)" stroke="#6ea8ff" strokeWidth={2} />
          <circle cx={discCx} cy={discCy - 4} r={4} fill="#6ea8ff" fillOpacity={0.7} />
          <path
            d={`M ${discCx - 7} ${discCy + 8} a 7 7 0 0 1 14 0`}
            fill="#6ea8ff"
            fillOpacity={0.7}
          />
        </svg>
        {shown.map((c, i) => {
          const top = yFor(i) - 13;
          const clickable = c.id != null && onNavigate;
          const className = `person-graphic__chip${clickable ? " person-graphic__chip--link" : ""}`;
          const style = { left: endX + 10, top, "--ck": c.color } as CSSProperties;
          return clickable ? (
            <button key={i} className={className} style={style} onClick={() => onNavigate!(c.id!)}>
              <span className="person-graphic__dot" aria-hidden="true" />
              {c.title}
            </button>
          ) : (
            <span key={i} className={className} style={style}>
              <span className="person-graphic__dot" aria-hidden="true" />
              {c.title}
            </span>
          );
        })}
      </div>
      {overflow > 0 && (
        <p className="person-graphic__more">+{overflow} more connection{overflow > 1 ? "s" : ""} — see timeline below</p>
      )}
    </div>
  );
}

/** Chronological interaction history (§4.3): dated rows (undated last), each with
 *  a date badge, optional Projected chip, description, and clickable node chips. */
function PersonTimeline({
  person,
  byId,
  today,
  onNavigate,
}: {
  person: PersonProfile;
  byId: Map<string, TimelineNode>;
  today: IsoDate;
  onNavigate?: (id: string) => void;
}) {
  const rows = useMemo(() => {
    return [...person.relationships].sort((a, b) => {
      if (a.date && b.date) return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
      if (a.date) return -1;
      if (b.date) return 1;
      return 0;
    });
  }, [person.relationships]);

  return (
    <ol className="person-timeline">
      {rows.map((rel, i) => {
        const projected = rel.date != null && rel.date > today;
        return (
          <li key={i} className="person-timeline__row">
            <div className="person-timeline__rail">
              <span className="person-timeline__date">
                {rel.date ? formatDate(rel.date) : "Undated"}
              </span>
              {(rel.scheduled || projected) && (
                <span className="person-timeline__chip">Projected</span>
              )}
            </div>
            <div className="person-timeline__body">
              <p className="person-timeline__desc">{rel.description}</p>
              <div className="person-timeline__conns">
                {rel.connectedNodeIds.map((cid, j) => {
                  const cn = byId.get(cid);
                  if (!cn) return null;
                  const color = NODE_COLOR[cn.type] ?? "#6ea8ff";
                  return onNavigate ? (
                    <button
                      key={j}
                      className="person-timeline__conn person-timeline__conn--link"
                      style={{ "--ck": color } as CSSProperties}
                      onClick={() => onNavigate(cid)}
                    >
                      <span className="person-graphic__dot" aria-hidden="true" />
                      {cn.title}
                    </button>
                  ) : (
                    <span
                      key={j}
                      className="person-timeline__conn"
                      style={{ "--ck": color } as CSSProperties}
                    >
                      <span className="person-graphic__dot" aria-hidden="true" />
                      {cn.title}
                    </span>
                  );
                })}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function DetailPanel({ node, citations, edges, nodes, today, onClose, onNavigate }: Props) {
  const citesRef = useRef<HTMLDivElement>(null);
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const person = node.person ?? null;
  const personConnections = useMemo(
    () => (person ? resolveConnections(person, byId) : []),
    [person, byId],
  );
  const personWhen = person
    ? person.initialAppearanceDate
      ? `First appearance · ${formatDate(person.initialAppearanceDate)}`
      : "First appearance · not yet dated"
    : null;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const color = NODE_COLOR[node.type] ?? "#94a3b8";
  const nodeCitations = citations.filter((c) => node.citationIds.includes(c.id));
  const paragraphs = node.bodyMd
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const tagText = [NODE_TYPE_LABEL[node.type], threadLabel(node.thread)]
    .filter(Boolean)
    .join(" · ");
  const when = formatWhen(node);
  const state = temporalStateFor(node, today);
  const facts = deriveKeyFacts(node);

  // Connections: edges touching this node, with the other end's title + relation
  // word (colored by EdgeKind). Outgoing → arrow, incoming ← arrow (§3.2).
  const connections = useMemo(() => {
    const byId = new Map(nodes.map((n) => [n.id, n]));
    return edges
      .filter((e) => e.from === node.id || e.to === node.id)
      .map((e) => {
        const outgoing = e.from === node.id;
        const other = byId.get(outgoing ? e.to : e.from);
        if (!other) return null;
        return {
          id: e.id,
          kind: e.kind,
          rel: EDGE_KIND_LABEL[e.kind],
          arrow: outgoing ? "→" : "←",
          title: other.title,
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .slice(0, 8);
  }, [edges, nodes, node.id]);

  const primaryCite = nodeCitations[0];

  return (
    <aside
      className="detail-panel"
      role="complementary"
      aria-label={`Details: ${node.title}`}
      style={{ "--type": color } as CSSProperties}
    >
      <span className="detail-panel__grabber" aria-hidden="true" />
      <header className="detail-panel__head">
        <span className="detail-panel__tag">
          <span className="detail-panel__tag-dot" aria-hidden="true" />
          {tagText}
        </span>
        <h2 className="detail-panel__title">{person ? person.name : node.title}</h2>
        {person && person.role && (
          <p className="detail-panel__role">{person.role}</p>
        )}
        <p className="detail-panel__meta">
          {(person ? personWhen : when) && (
            <span className="detail-panel__date">{person ? personWhen : when}</span>
          )}
          <span className={`detail-panel__state detail-panel__state--${state}`}>
            {STATE_LABEL[state]}
          </span>
        </p>
        <button
          className="detail-panel__close"
          onClick={onClose}
          aria-label="Close details"
          title="Close (Esc)"
        >
          ✕
        </button>
      </header>

      <div className="detail-panel__scroll">
        {/* PLE-155 §4.4: carried identity / market-signal note (Amy×Amy
            unconfirmed-same, bank-financing signal) — honest provenance flag. */}
        {person?.note && (
          <div className="detail-panel__note" role="note">
            {person.note}
          </div>
        )}

        {node.confidence === "unconfirmed" && (
          <div className="detail-panel__note" role="note">
            Pending verification (§12) — treat as illustrative
          </div>
        )}

        {/* PLE-155 §4.2: the hero element — in-modal curvilinear relationship
            graphic of ALL connections radiating from the single anchor. */}
        {person && personConnections.length > 0 && (
          <>
            <p className="detail-panel__section-label">Relationship graphic</p>
            <PersonRelationshipGraphic
              name={person.name}
              connections={personConnections}
              onNavigate={onNavigate}
            />
          </>
        )}

        {/* PLE-155 §4.3: full chronological dated interaction history. */}
        {person && person.relationships.length > 0 && (
          <>
            <p className="detail-panel__section-label">Interaction history</p>
            <PersonTimeline
              person={person}
              byId={byId}
              today={today}
              onNavigate={onNavigate}
            />
          </>
        )}

        {node.demandScore !== null && (
          <div className="detail-panel__demand">
            THEORETICAL demand score: {node.demandScore}/100 (§5.2/§6.2 — illustrative)
          </div>
        )}

        <div className="detail-panel__body">
          {paragraphs.map((p, i) => (
            <p key={i}>{renderInline(p)}</p>
          ))}
        </div>

        {facts.length > 0 && (
          <>
            <p className="detail-panel__section-label">Key facts</p>
            <ul className="detail-panel__facts">
              {facts.map((fact, i) => {
                const { key, value } = splitFact(fact);
                return (
                  <li key={i}>
                    <span>
                      {key && <span className="detail-panel__fact-key">{key}: </span>}
                      <span className="detail-panel__fact-value">{value}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {!person && connections.length > 0 && (
          <>
            <p className="detail-panel__section-label">Connections</p>
            <div className="detail-panel__conns">
              {connections.map((c) => (
                <span
                  key={c.id}
                  className="detail-panel__conn"
                  style={{ "--ek": EDGE_COLOR[c.kind] } as CSSProperties}
                >
                  <span className="detail-panel__conn-rel">
                    {c.rel} {c.arrow}
                  </span>{" "}
                  {c.title}
                </span>
              ))}
            </div>
          </>
        )}

        <MediaEmbed media={node.media} />

        {nodeCitations.length > 0 && (
          <div className="detail-panel__cites" ref={citesRef}>
            <h3>Works Cited</h3>
            <ol>
              {nodeCitations.map((c) => (
                <li key={c.id}>
                  {renderMla(c).map((seg, i) =>
                    seg.kind === "em" ? (
                      <em key={i}>{seg.value}</em>
                    ) : seg.kind === "link" ? (
                      <a key={i} className="detail-panel__cite-link" {...externalLinkProps(seg.href)}>
                        {seg.value}
                      </a>
                    ) : (
                      <span key={i}>{seg.value}</span>
                    ),
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {nodeCitations.length > 0 && (
        <footer className="detail-panel__foot">
          Source: {primaryCite.intextKey} ·{" "}
          <button
            type="button"
            className="detail-panel__foot-link"
            onClick={() =>
              citesRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
            }
          >
            Works Cited ({nodeCitations.length})
          </button>
        </footer>
      )}
    </aside>
  );
}
