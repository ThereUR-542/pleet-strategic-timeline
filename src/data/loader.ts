// =============================================================================
// Runtime YAML loader (PLE-136 scope 3 + 4).
// -----------------------------------------------------------------------------
// The app loads its content from THREE static YAML assets served from /data/
// (public/data/*.yaml), fetched at RUNTIME — not inlined at build time. Tradeoff
// (documented per the issue):
//
//   • Runtime fetch (chosen): a plain page refresh re-pulls the deployed YAML,
//     so a `git push` → Vercel redeploy is reflected on the next refresh with
//     no rebuild of the consuming bundle. It also lets a future visual editor
//     write connections.yaml and have it picked up. Cost: one async load + a
//     loading state. We fetch with `cache: "no-cache"` so the browser always
//     revalidates against the freshly-deployed file (304 when unchanged).
//   • Build-time inline (rejected): zero async, but every content edit needs a
//     full app rebuild and the bytes get baked into the hashed JS bundle.
//
// Any failure — network/404, YAML syntax, schema, or cross-file reference — is
// surfaced as a `TimelineDataError` with located (file + field + reason) detail
// so the UI shows a precise error instead of a blank screen.
// =============================================================================

import { parse as parseYaml, YAMLParseError } from "yaml";
import type { TimelineBundle } from "./types";
import {
  TimelineDataError,
  assembleBundle,
  connectionsFileSchema,
  lanesFileSchema,
  nodesFileSchema,
  validateFile,
  type DataFile,
} from "./schema";

/** Where the YAML assets live relative to the deployed site root. */
export const DATA_BASE = "/data";

async function fetchAndParse(file: DataFile): Promise<unknown> {
  const url = `${DATA_BASE}/${file}`;
  let res: Response;
  try {
    // no-cache → always revalidate so a refresh reflects the deployed file.
    res = await fetch(url, { cache: "no-cache" });
  } catch (e) {
    throw new TimelineDataError(`Could not load ${file}`, [
      { file, field: "(network)", reason: `fetch failed: ${(e as Error).message}` },
    ]);
  }
  if (!res.ok) {
    throw new TimelineDataError(`Could not load ${file}`, [
      { file, field: "(network)", reason: `HTTP ${res.status} ${res.statusText} for ${url}` },
    ]);
  }
  const text = await res.text();
  try {
    return parseYaml(text);
  } catch (e) {
    const reason =
      e instanceof YAMLParseError
        ? `${e.message}${e.linePos ? ` (line ${e.linePos[0].line}, col ${e.linePos[0].col})` : ""}`
        : (e as Error).message;
    throw new TimelineDataError(`${file} is not valid YAML`, [
      { file, field: "(syntax)", reason },
    ]);
  }
}

/**
 * Load, validate and assemble the full timeline bundle from the three YAML
 * files. Resolves to a typed `TimelineBundle`; rejects with `TimelineDataError`
 * (located) on any problem. Files are fetched in parallel; validation is
 * per-file then cross-file referential.
 */
export async function loadTimelineBundle(): Promise<TimelineBundle> {
  const [nodesRaw, lanesRaw, connectionsRaw] = await Promise.all([
    fetchAndParse("nodes.yaml"),
    fetchAndParse("lanes.yaml"),
    fetchAndParse("connections.yaml"),
  ]);

  const nodesDoc = validateFile("nodes.yaml", nodesFileSchema, nodesRaw);
  const lanesDoc = validateFile("lanes.yaml", lanesFileSchema, lanesRaw);
  const connectionsDoc = validateFile("connections.yaml", connectionsFileSchema, connectionsRaw);

  return assembleBundle(nodesDoc, lanesDoc, connectionsDoc);
}
