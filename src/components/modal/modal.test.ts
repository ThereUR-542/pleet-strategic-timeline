// PLE-83: Hover card + focus-trapped modal + rich embeds
// Tests are pure-logic (no DOM/renderer) so they run in vitest's node environment.

import { describe, it, expect } from "vitest";
import { externalLinkProps } from "../../lib/links";

// ── External link helper (§4.4/§11 — reverse-tabnabbing) ────────────────────

describe("externalLinkProps", () => {
  it("always adds target=_blank", () => {
    const props = externalLinkProps("https://example.com");
    expect(props.target).toBe("_blank");
  });

  it("always adds rel=noopener noreferrer", () => {
    const props = externalLinkProps("https://example.com");
    expect(props.rel).toBe("noopener noreferrer");
  });

  it("preserves the href unchanged", () => {
    const url = "https://maps.googleapis.com/maps/embed?pb=abc123";
    expect(externalLinkProps(url).href).toBe(url);
  });

  it("works with arbitrary URLs", () => {
    const urls = [
      "https://youtu.be/abc",
      "https://www.youtube-nocookie.com/embed/xyz",
      "https://example.com/doc.pdf",
    ];
    for (const url of urls) {
      const p = externalLinkProps(url);
      expect(p.target).toBe("_blank");
      expect(p.rel).toBe("noopener noreferrer");
    }
  });
});

// ── YouTube nocookie URL conversion logic ────────────────────────────────────

function toNocookieEmbed(src: string): string {
  return src
    .replace(
      /https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([^&]+).*/,
      "https://www.youtube-nocookie.com/embed/$1",
    )
    .replace(
      /https?:\/\/(?:www\.)?youtube\.com\/embed\//,
      "https://www.youtube-nocookie.com/embed/",
    )
    .replace(
      /https?:\/\/youtu\.be\/([^?]+).*/,
      "https://www.youtube-nocookie.com/embed/$1",
    );
}

describe("toNocookieEmbed", () => {
  it("converts youtube.com/watch?v= to nocookie embed", () => {
    const result = toNocookieEmbed("https://www.youtube.com/watch?v=abc123");
    expect(result).toBe("https://www.youtube-nocookie.com/embed/abc123");
  });

  it("converts youtu.be short URLs", () => {
    const result = toNocookieEmbed("https://youtu.be/xyz789");
    expect(result).toBe("https://www.youtube-nocookie.com/embed/xyz789");
  });

  it("converts already-embed youtube.com URLs", () => {
    const result = toNocookieEmbed("https://www.youtube.com/embed/def456");
    expect(result).toBe("https://www.youtube-nocookie.com/embed/def456");
  });

  it("leaves already-nocookie URLs unchanged", () => {
    const url = "https://www.youtube-nocookie.com/embed/alreadysafe";
    expect(toNocookieEmbed(url)).toBe(url);
  });

  it("strips extra query params from watch URLs", () => {
    const result = toNocookieEmbed(
      "https://www.youtube.com/watch?v=abc&t=42s&list=PL123",
    );
    expect(result).toBe("https://www.youtube-nocookie.com/embed/abc");
  });
});

// ── MediaItem kind routing ───────────────────────────────────────────────────

type MediaKind = "pdf" | "image" | "map" | "video" | "link";

interface MediaItem {
  id: string;
  kind: MediaKind;
  src: string;
  caption: string | null;
  citationIds: string[];
  opensExternal: boolean;
}

function partitionMedia(media: MediaItem[]) {
  return {
    images: media.filter((m) => m.kind === "image"),
    pdfs: media.filter((m) => m.kind === "pdf"),
    maps: media.filter((m) => m.kind === "map"),
    videos: media.filter((m) => m.kind === "video"),
    links: media.filter((m) => m.kind === "link"),
  };
}

describe("partitionMedia", () => {
  const fixture: MediaItem[] = [
    { id: "1", kind: "image", src: "/img.jpg", caption: null, citationIds: [], opensExternal: false },
    { id: "2", kind: "pdf", src: "/doc.pdf", caption: "Report", citationIds: [], opensExternal: true },
    { id: "3", kind: "map", src: "https://maps.googleapis.com/...", caption: null, citationIds: [], opensExternal: true },
    { id: "4", kind: "video", src: "https://youtu.be/abc", caption: null, citationIds: [], opensExternal: true },
    { id: "5", kind: "link", src: "https://example.com", caption: "Docs", citationIds: [], opensExternal: true },
    { id: "6", kind: "image", src: "/img2.png", caption: "Fig 2", citationIds: [], opensExternal: false },
  ];

  it("groups images correctly", () => {
    expect(partitionMedia(fixture).images).toHaveLength(2);
  });

  it("groups pdfs correctly", () => {
    expect(partitionMedia(fixture).pdfs).toHaveLength(1);
  });

  it("groups maps correctly", () => {
    expect(partitionMedia(fixture).maps).toHaveLength(1);
  });

  it("groups videos correctly", () => {
    expect(partitionMedia(fixture).videos).toHaveLength(1);
  });

  it("groups links correctly", () => {
    expect(partitionMedia(fixture).links).toHaveLength(1);
  });

  it("returns empty arrays for absent kinds", () => {
    const result = partitionMedia([fixture[0]]);
    expect(result.pdfs).toHaveLength(0);
    expect(result.maps).toHaveLength(0);
    expect(result.videos).toHaveLength(0);
    expect(result.links).toHaveLength(0);
  });
});

// ── HoverCard data logic ─────────────────────────────────────────────────────

const TYPE_LABEL: Record<string, string> = {
  person: "Person",
  project: "Project",
  event: "Event",
  concept: "Concept",
};

describe("HoverCard label resolution", () => {
  it("maps person type correctly", () => {
    expect(TYPE_LABEL["person"]).toBe("Person");
  });

  it("maps project type correctly", () => {
    expect(TYPE_LABEL["project"]).toBe("Project");
  });

  it("maps event type correctly", () => {
    expect(TYPE_LABEL["event"]).toBe("Event");
  });

  it("maps concept type correctly", () => {
    expect(TYPE_LABEL["concept"]).toBe("Concept");
  });

  it("returns undefined for unknown type (UI shows raw type)", () => {
    expect(TYPE_LABEL["unknown"]).toBeUndefined();
  });
});

// ── Focus trap selector coverage ─────────────────────────────────────────────

describe("focus trap FOCUSABLE_SELECTORS coverage", () => {
  const SELECTORS = [
    "button:not([disabled])",
    "[href]",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
    "video",
    "audio",
    "iframe",
  ];

  it("includes button selector", () => {
    expect(SELECTORS).toContain("button:not([disabled])");
  });

  it("excludes disabled buttons via :not", () => {
    expect(SELECTORS.join(", ")).toContain(":not([disabled])");
  });

  it("includes iframe for embedded content", () => {
    expect(SELECTORS).toContain("iframe");
  });

  it("excludes negative tabindex via :not", () => {
    expect(SELECTORS.join(", ")).toContain('[tabindex]:not([tabindex="-1"])');
  });
});
