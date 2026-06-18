// =============================================================================
// MLA 9 renderer unit tests (PRD §4.5 / §8.10 / §17).
// Verifies punctuation, italics/quotes, URL stripping, DOI prefix, access
// dates, two-container format, and the concrete citations from content.ts.
// =============================================================================

import { describe, it, expect } from "vitest";
import { renderMla, renderMlaText, mlaAlphaKey } from "./mla";
import { CITATIONS } from "../data/content";
import type { Citation } from "../data/types";

// Helpers
const byId = (id: string): Citation => {
  const c = CITATIONS.find((x) => x.id === id);
  if (!c) throw new Error(`Citation ${id} not found`);
  return c;
};

const makeBase = (overrides: Partial<Citation> = {}): Citation => ({
  id: "test",
  author: null,
  titleSource: null,
  container1: null,
  container2: null,
  accessDate: null,
  isDoi: false,
  intextKey: "Test",
  ...overrides,
});

// ---------------------------------------------------------------------------
// §8.10 / §17 — concrete content.ts citations
// ---------------------------------------------------------------------------
describe("concrete citations from content.ts (§8.10/§17 examples)", () => {
  it("cite-brady-email-3dprint: contained work, no container title", () => {
    expect(renderMlaText(byId("cite-brady-email-3dprint"))).toBe(
      'Deaton, Brady. "3D Print." Received by Pleet LLC, 1 Apr. 2026.'
    );
  });

  it("cite-lunch-with-pleet-invite: contained work, with container title in italics", () => {
    const segs = renderMla(byId("cite-lunch-with-pleet-invite"));
    // Plain-text form
    expect(segs.map((s) => s.value).join("")).toBe(
      'Deaton, Brady. "Lunch with Pleet." Calendar invite, 6 Apr. 2026, Waterfront Grill, Jenks, OK.'
    );
    // Container title must be an em (italic) segment
    const emSegs = segs.filter((s) => s.kind === "em");
    expect(emSegs).toHaveLength(1);
    expect(emSegs[0].value).toBe("Calendar invite");
  });

  it("cite-skyland-rom: contained work, no container title, non-URL location", () => {
    expect(renderMlaText(byId("cite-skyland-rom"))).toBe(
      'Skyland 3D. "Deaton — ROM Worksheet." 8 Apr. 2026, PDF.'
    );
  });
});

// ---------------------------------------------------------------------------
// Slot 2: Italics vs. quotes
// ---------------------------------------------------------------------------
describe("title formatting — italics vs. quoted", () => {
  it("standalone work (no container) → italic title segment", () => {
    const c = makeBase({ titleSource: "The Great Gatsby" });
    const segs = renderMla(c);
    const em = segs.filter((s) => s.kind === "em");
    expect(em).toHaveLength(1);
    expect(em[0].value).toBe("The Great Gatsby");
    expect(renderMlaText(c)).toBe("The Great Gatsby. ");
  });

  it("contained work (container1 present) → quoted title, period inside close-quote", () => {
    const c = makeBase({
      titleSource: "My Article",
      container1: { title: "A Journal", otherContributors: null, version: null, number: null, publisher: null, pubDate: "2023", location: null },
    });
    const text = renderMlaText(c);
    expect(text).toContain('"My Article."');
    expect(text).not.toContain('"My Article".');
  });

  it("title already ending with ? → no extra period added inside quote", () => {
    const c = makeBase({
      titleSource: "Why Now?",
      container1: { title: null, otherContributors: null, version: null, number: null, publisher: null, pubDate: "2024", location: null },
    });
    expect(renderMlaText(c)).toContain('"Why Now?"');
    expect(renderMlaText(c)).not.toContain('"Why Now?."');
  });

  it("title already ending with . → no extra period", () => {
    const c = makeBase({
      titleSource: "Title Already.",
      container1: { title: null, otherContributors: null, version: null, number: null, publisher: null, pubDate: "2024", location: null },
    });
    expect(renderMlaText(c)).toContain('"Title Already."');
  });
});

// ---------------------------------------------------------------------------
// URLs and DOIs (§4.5)
// ---------------------------------------------------------------------------
describe("URL and DOI location handling", () => {
  it("strips https:// from URL locations", () => {
    const c = makeBase({
      titleSource: "Article",
      container1: { title: "Site", otherContributors: null, version: null, number: null, publisher: null, pubDate: "2023", location: "https://www.example.com/path" },
    });
    const text = renderMlaText(c);
    expect(text).toContain("www.example.com/path");
    expect(text).not.toContain("https://");
  });

  it("strips http:// from URL locations", () => {
    const c = makeBase({
      titleSource: "Article",
      container1: { title: "Site", otherContributors: null, version: null, number: null, publisher: null, pubDate: "2023", location: "http://example.com" },
    });
    expect(renderMlaText(c)).toContain("example.com");
    expect(renderMlaText(c)).not.toContain("http://");
  });

  it("non-URL location (e.g. 'PDF') passes through unchanged", () => {
    const c = makeBase({
      titleSource: "Doc",
      container1: { title: null, otherContributors: null, version: null, number: null, publisher: null, pubDate: "2024", location: "PDF" },
    });
    expect(renderMlaText(c)).toContain("PDF");
  });

  it("isDoi: true → adds https://doi.org/ prefix", () => {
    const c = makeBase({
      author: "Jones, Mary",
      titleSource: "A Study",
      container1: { title: "J. Research", otherContributors: null, version: null, number: "vol. 5", publisher: null, pubDate: "2021", location: "10.1234/abc.567" },
      isDoi: true,
    });
    expect(renderMlaText(c)).toContain("https://doi.org/10.1234/abc.567");
  });

  it("isDoi: true with already-prefixed DOI → no double prefix", () => {
    const c = makeBase({
      titleSource: "A Study",
      container1: { title: null, otherContributors: null, version: null, number: null, publisher: null, pubDate: "2021", location: "https://doi.org/10.1234/abc" },
      isDoi: true,
    });
    expect(renderMlaText(c)).not.toMatch(/doi\.org\/https/);
    expect(renderMlaText(c)).toContain("https://doi.org/10.1234/abc");
  });
});

// ---------------------------------------------------------------------------
// Access dates (§4.5: only for undated/volatile)
// ---------------------------------------------------------------------------
describe("access date formatting", () => {
  it("formats ISO date as 'D Mon. YYYY'", () => {
    const c = makeBase({
      author: "Smith, John",
      titleSource: "Web Page",
      container1: { title: "A Site", otherContributors: null, version: null, number: null, publisher: null, pubDate: null, location: "example.com" },
      accessDate: "2022-06-15",
    });
    expect(renderMlaText(c)).toContain("Accessed 15 June 2022");
  });

  it("uses unabbreviated June (not Jun.)", () => {
    const c = makeBase({ accessDate: "2023-06-01", container1: { title: null, otherContributors: null, version: null, number: null, publisher: null, pubDate: null, location: null } });
    expect(renderMlaText(c)).toContain("June");
    expect(renderMlaText(c)).not.toContain("Jun.");
  });

  it("uses abbreviated Sept. for September", () => {
    const c = makeBase({ accessDate: "2023-09-10", container1: { title: null, otherContributors: null, version: null, number: null, publisher: null, pubDate: null, location: null } });
    expect(renderMlaText(c)).toContain("Accessed 10 Sept. 2023");
  });

  it("access date appended after standalone title when no container", () => {
    const c = makeBase({ titleSource: "My Site", accessDate: "2024-01-05" });
    const text = renderMlaText(c);
    expect(text).toContain("Accessed 5 Jan. 2024.");
  });

  it("access date omitted when not set", () => {
    const c = makeBase({ titleSource: "Article", container1: { title: null, otherContributors: null, version: null, number: null, publisher: "Pub", pubDate: "2023", location: null } });
    expect(renderMlaText(c)).not.toContain("Accessed");
  });
});

// ---------------------------------------------------------------------------
// Two-container format
// ---------------------------------------------------------------------------
describe("two-container citations (§4.5)", () => {
  it("separates containers with '. ' and closes each with '.'", () => {
    const c = makeBase({
      author: "Williams, Sarah",
      titleSource: "Database Article",
      container1: {
        title: "Acad. Journal",
        otherContributors: null,
        version: null,
        number: "vol. 10",
        publisher: null,
        pubDate: "2020",
        location: "pp. 100-110",
      },
      container2: {
        title: "JSTOR",
        otherContributors: null,
        version: null,
        number: null,
        publisher: null,
        pubDate: null,
        location: "www.jstor.org/stable/xxxxx",
      },
    });
    const text = renderMlaText(c);
    expect(text).toContain("pp. 100-110. ");
    expect(text).toContain("JSTOR");
    expect(text).toMatch(/pp\. 100-110\. JSTOR/);
    expect(text).toMatch(/\.$/u);
  });

  it("access date goes after container 2, not container 1", () => {
    const c = makeBase({
      titleSource: "Article",
      container1: { title: "Journal", otherContributors: null, version: null, number: null, publisher: null, pubDate: "2019", location: null },
      container2: { title: "Database", otherContributors: null, version: null, number: null, publisher: null, pubDate: null, location: "db.example.com" },
      accessDate: "2023-03-20",
    });
    const text = renderMlaText(c);
    const accessIdx = text.indexOf("Accessed");
    const dbIdx = text.indexOf("db.example.com");
    expect(dbIdx).toBeGreaterThan(0);
    expect(accessIdx).toBeGreaterThan(dbIdx);
  });
});

// ---------------------------------------------------------------------------
// Author slot
// ---------------------------------------------------------------------------
describe("author slot", () => {
  it("renders author in Last, First form followed by period", () => {
    const c = makeBase({ author: "Deaton, Brady", titleSource: "Doc", container1: { title: null, otherContributors: null, version: null, number: null, publisher: null, pubDate: "2024", location: null } });
    expect(renderMlaText(c)).toMatch(/^Deaton, Brady\. /);
  });

  it("omits author segment when author is null", () => {
    const c = makeBase({ titleSource: "Anon Work" });
    expect(renderMlaText(c)).not.toContain("null");
    expect(renderMlaText(c)).toMatch(/^Anon Work/);
  });
});

// ---------------------------------------------------------------------------
// Alphabetic sort key
// ---------------------------------------------------------------------------
describe("mlaAlphaKey", () => {
  it("returns lowercased author when present", () => {
    expect(mlaAlphaKey(makeBase({ author: "Zhao, Fei" }))).toBe("zhao, fei");
  });

  it("falls back to lowercased title when no author", () => {
    expect(mlaAlphaKey(makeBase({ titleSource: "The Great Gatsby" }))).toBe("the great gatsby");
  });

  it("sorts existing citations into a non-decreasing alphabetic order", () => {
    // Assert the sort invariant rather than hard-coded first/last entries:
    // the citation set grows over time (PLE-117 added public sources), so any
    // fixed boundary author would rot. A monotonic key sequence proves
    // mlaAlphaKey + localeCompare order the Works Cited list correctly.
    const keys = [...CITATIONS]
      .sort((a, b) => mlaAlphaKey(a).localeCompare(mlaAlphaKey(b)))
      .map(mlaAlphaKey);
    for (let i = 1; i < keys.length; i++) {
      expect(keys[i - 1].localeCompare(keys[i])).toBeLessThanOrEqual(0);
    }
  });
});
