// =============================================================================
// Canonical swim-lane registry (PLE-133 lanes / PLE-136 content-as-data).
// -----------------------------------------------------------------------------
// One entry per `Thread`. This is the TypeScript source of truth that the
// generator (`scripts/gen-yaml.mjs`) serialises to `public/data/lanes.yaml`;
// at runtime the app loads + validates that YAML instead (src/data/loader.ts).
// Editing a lane (label, order, colour, chapter, depth) is a content change to
// lanes.yaml — no rebuild required.
//
// `order` is the story / band order (ascending = top→bottom), mirroring the
// chapter→thread flatten in `components/flow/layout.ts` (CHAPTERS). `zLayer`
// mirrors THREAD_Z_LAYER (PLE-115 §10.2). `color` is a CSS var defined in
// styles/timeline.css. These are kept in lockstep by `loader.test.ts`.
// =============================================================================

import type { Lane } from "./types";

export const LANES: Lane[] = [
  { id: "foundational",            label: "Foundational",           order: 0, chapter: "foundations",   color: "var(--thread-foundational)",            zLayer: 0 },
  { id: "growth",                  label: "Growth",                 order: 1, chapter: "growth",         color: "var(--thread-growth)",                  zLayer: 1 },
  { id: "strategic_relationships", label: "Strategic Relationships", order: 2, chapter: "growth",        color: "var(--thread-strategic-relationships)", zLayer: 1 },
  { id: "media_brand",             label: "Media & Brand",          order: 3, chapter: "growth",         color: "var(--thread-media-brand)",             zLayer: 1 },
  { id: "savanna",                 label: "Savanna",                order: 4, chapter: "savanna",        color: "var(--thread-savanna)",                 zLayer: 2 },
  { id: "oswego",                  label: "Oswego",                 order: 5, chapter: "oswego",         color: "var(--thread-oswego)",                  zLayer: 3 },
  { id: "major_projects",          label: "Major Projects",         order: 6, chapter: "oswego",         color: "var(--thread-major-projects)",          zLayer: 3 },
  { id: "manufacturing",           label: "Manufacturing",          order: 7, chapter: "manufacturing",  color: "var(--thread-manufacturing)",           zLayer: 4 },
  { id: "financial_interest",      label: "Financial Interest",     order: 8, chapter: "manufacturing",  color: "var(--thread-financial-interest)",      zLayer: 4 },
];

export default LANES;
