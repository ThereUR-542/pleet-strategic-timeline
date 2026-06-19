// =============================================================================
// Person data model (PLE-152/PLE-154): Master Person–Relationship Index v1.0.
// Asserts the committed YAML carries the enriched `person` profile correctly
// (single-anchor, dated relationships, resolved connectedNodeIds), the explicit
// Master-Index requirements (Amy distinct identities, Christy lighter, Tony
// added, carried verification flags), and that the new referential guards in
// assembleBundle fire on bad data.
// =============================================================================

import { describe, it, expect } from "vitest";
import { parse as parseYaml } from "yaml";
import nodesYaml from "../../public/data/nodes.yaml?raw";
import lanesYaml from "../../public/data/lanes.yaml?raw";
import connectionsYaml from "../../public/data/connections.yaml?raw";
import {
  assembleBundle,
  connectionsFileSchema,
  lanesFileSchema,
  nodesFileSchema,
  validateFile,
} from "./schema";
import type { TimelineNode } from "./types";

const nodesDoc = validateFile("nodes.yaml", nodesFileSchema, parseYaml(nodesYaml));
const lanesDoc = validateFile("lanes.yaml", lanesFileSchema, parseYaml(lanesYaml));
const connectionsDoc = validateFile("connections.yaml", connectionsFileSchema, parseYaml(connectionsYaml));
const bundle = assembleBundle(nodesDoc, lanesDoc, connectionsDoc);

const byId = new Map(bundle.data.nodes.map((n) => [n.id, n]));
const nodeIds = new Set(bundle.data.nodes.map((n) => n.id));
const personsWithProfile = bundle.data.nodes.filter((n) => n.person);

describe("Person profiles — Master Index v1.0 ingest (PLE-154)", () => {
  it("ingests all 17 index people as person nodes carrying a profile", () => {
    // 15 enriched existing + 2 net-new (Tony Winters, Christy Price).
    expect(personsWithProfile.length).toBe(17);
    expect(personsWithProfile.every((n) => n.type === "person")).toBe(true);
  });

  it("added the two net-new index people additively", () => {
    expect(byId.has("n-tony-winters")).toBe(true);
    expect(byId.has("n-christy-price")).toBe(true);
  });

  it("every relationship's connectedNodeIds resolve to a real node (single-anchor model)", () => {
    for (const n of personsWithProfile) {
      for (const r of n.person!.relationships) {
        for (const cid of r.connectedNodeIds) {
          expect(nodeIds.has(cid), `${n.id} → ${cid}`).toBe(true);
        }
        // titles always carry the human labels (>= ids; may include node-less items).
        expect(r.connectedNodeTitles.length).toBeGreaterThanOrEqual(r.connectedNodeIds.length);
      }
    }
  });

  it("anchors each person at most once via initialAppearanceDate (no duplicate later nodes)", () => {
    const names = personsWithProfile.map((n) => n.person!.name);
    expect(new Set(names).size).toBe(names.length); // each named person appears exactly once
    for (const n of personsWithProfile) {
      const d = n.person!.initialAppearanceDate;
      if (d !== null) expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("keeps Amy K. Cook (BancFirst) and Amy Addington Smith as two separate nodes, each flagged unconfirmed-identity", () => {
    const cook = byId.get("n-amy-bancfirst") as TimelineNode;
    const smith = byId.get("n-amy-addington-smith") as TimelineNode;
    expect(cook.id).not.toBe(smith.id);
    expect(cook.person!.note).toMatch(/separate individuals pending confirmation/i);
    expect(smith.person!.note).toMatch(/separate individuals pending confirmation/i);
  });

  it("carries open verification flags as notes without resolving them", () => {
    // Cherokee Nation $40M (1 Architecture / Nick Denison) stays flagged.
    expect((byId.get("n-nick-denison") as TimelineNode).person!.note).toMatch(/\$40M/i);
    // Amy K. Cook meeting dates stay flagged.
    expect((byId.get("n-amy-bancfirst") as TimelineNode).person!.note).toMatch(/flagged for confirmation/i);
  });

  it("keeps Christy Price as a lighter supporting-participant entry", () => {
    const christy = byId.get("n-christy-price") as TimelineNode;
    expect(christy.person!.role).toMatch(/supporting participant/i);
    expect(christy.person!.relationships.length).toBeLessThanOrEqual(3);
  });

  it("carries the required bank-financing modal note on Bo Jett and Hayden Hanoch", () => {
    for (const id of ["n-bo-jett", "n-hayden-hanoch"]) {
      expect((byId.get(id) as TimelineNode).person!.note).toMatch(/independent market signal/i);
    }
  });
});

describe("Person referential guards (PLE-154)", () => {
  it("rejects a person profile on a non-person node", () => {
    const doc = parseYaml(nodesYaml) as { nodes: Record<string, unknown>[] };
    const concept = doc.nodes.find((n) => n.type === "concept")!;
    concept.person = {
      name: "X", role: "Y", initialAppearanceDate: null,
      threads: [], modalGraphic: null, note: null, relationships: [],
    };
    const nDoc = nodesFileSchema.parse(doc);
    expect(() => assembleBundle(nDoc, lanesDoc, connectionsDoc)).toThrow(/non-person node/);
  });

  it("catches a dangling connectedNodeId in a relationship", () => {
    const doc = parseYaml(nodesYaml) as { nodes: Record<string, any>[] };
    const person = doc.nodes.find((n) => n.id === "n-bo-jett")!;
    person.person.relationships[0].connectedNodeIds.push("n-does-not-exist");
    const nDoc = nodesFileSchema.parse(doc);
    expect(() => assembleBundle(nDoc, lanesDoc, connectionsDoc)).toThrow(/unknown node id "n-does-not-exist"/);
  });
});
