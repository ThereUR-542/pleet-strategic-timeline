import { useState, useCallback, useEffect, useRef } from "react";
import type { MediaItem } from "../../data/types";
import { externalLinkProps } from "../../lib/links";

interface Props {
  items: MediaItem[];
}

/**
 * Swipeable image gallery with keyboard arrow navigation and lazy loading (§4.4).
 */
export function ImageGallery({ items }: Props) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const next = useCallback(
    () => setIndex((i) => Math.min(items.length - 1, i + 1)),
    [items.length],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [prev, next]);

  const item = items[index];
  if (!item) return null;

  const imgEl = (
    <img
      src={item.src}
      alt={item.caption ?? ""}
      loading="lazy"
      className="media-gallery-img"
    />
  );

  return (
    <div className="media-gallery">
      <div
        className="media-gallery-viewport"
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchStartX.current;
          if (dx > 40) prev();
          else if (dx < -40) next();
          touchStartX.current = null;
        }}
      >
        {item.opensExternal ? (
          <a {...externalLinkProps(item.src)} className="media-gallery-external-link">
            {imgEl}
          </a>
        ) : (
          imgEl
        )}
        {item.caption && (
          <p className="media-gallery-caption">{item.caption}</p>
        )}
      </div>

      {items.length > 1 && (
        <div className="media-gallery-controls">
          <button
            className="media-gallery-btn"
            onClick={prev}
            disabled={index === 0}
            aria-label="Previous image"
          >
            ‹
          </button>
          <span className="media-gallery-counter">
            {index + 1} / {items.length}
          </span>
          <button
            className="media-gallery-btn"
            onClick={next}
            disabled={index === items.length - 1}
            aria-label="Next image"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
