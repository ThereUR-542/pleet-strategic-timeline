import { useEffect, useRef, useState } from "react";
import type { MediaItem } from "../../data/types";
import { externalLinkProps } from "../../lib/links";

interface Props {
  item: MediaItem;
}

/**
 * Inline PDF.js viewer (§4.4). Lazy-loads pdfjs-dist so it doesn't bloat
 * the main bundle. Falls back to a direct-open link on error.
 */
export function PdfViewer({ item }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfDocRef = useRef<any>(null);

  // Load document
  useEffect(() => {
    let cancelled = false;
    setError(null);
    setNumPages(0);
    setPage(1);

    import("pdfjs-dist")
      .then(async (pdfjsLib) => {
        // Point the worker at the bundled file via Vite's asset URL resolution
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
            "pdfjs-dist/build/pdf.worker.min.mjs",
            import.meta.url,
          ).href;
        }
        try {
          const task = pdfjsLib.getDocument({ url: item.src });
          const doc = await task.promise;
          if (cancelled) return;
          pdfDocRef.current = doc;
          setNumPages(doc.numPages);
        } catch {
          if (!cancelled) setError("Could not load PDF.");
        }
      })
      .catch(() => {
        if (!cancelled) setError("PDF.js unavailable.");
      });

    return () => {
      cancelled = true;
    };
  }, [item.src]);

  // Render page to canvas
  useEffect(() => {
    const doc = pdfDocRef.current;
    if (!doc || !canvasRef.current || numPages === 0) return;

    let cancelled = false;
    doc.getPage(page).then(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (pdfPage: any) => {
        if (cancelled || !canvasRef.current) return;
        const viewport = pdfPage.getViewport({ scale: 1.4 });
        const canvas = canvasRef.current;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        pdfPage.render({ canvasContext: ctx, viewport });
      },
      () => {
        if (!cancelled) setError("Could not render page.");
      },
    );

    return () => {
      cancelled = true;
    };
  }, [page, numPages]);

  if (error) {
    return (
      <div className="media-pdf-error">
        {error}{" "}
        <a {...externalLinkProps(item.src)}>Open PDF in new tab</a>
      </div>
    );
  }

  return (
    <div className="media-pdf-viewer">
      <canvas ref={canvasRef} className="media-pdf-canvas" aria-label={item.caption ?? "PDF document"} />
      {numPages === 0 && (
        <div className="media-pdf-loading">Loading PDF…</div>
      )}
      {numPages > 1 && (
        <div className="media-gallery-controls">
          <button
            className="media-gallery-btn"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            aria-label="Previous page"
          >
            ‹
          </button>
          <span className="media-gallery-counter">
            Page {page} / {numPages}
          </span>
          <button
            className="media-gallery-btn"
            onClick={() => setPage((p) => Math.min(numPages, p + 1))}
            disabled={page === numPages}
            aria-label="Next page"
          >
            ›
          </button>
        </div>
      )}
      {item.caption && (
        <p className="media-gallery-caption">{item.caption}</p>
      )}
    </div>
  );
}
