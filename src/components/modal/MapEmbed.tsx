import type { MediaItem } from "../../data/types";

interface Props {
  item: MediaItem;
}

/**
 * Google Maps Embed API iframe (§4.4/§11).
 * - `referrerPolicy` matches the Maps Embed API recommended policy.
 * - Sandbox: scripts + same-origin needed for tile loading; no top-navigation
 *   so the map can never send the parent tab elsewhere.
 */
export function MapEmbed({ item }: Props) {
  return (
    <div className="media-map-wrapper">
      <iframe
        src={item.src}
        title={item.caption ?? "Map"}
        className="media-map-iframe"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        sandbox="allow-scripts allow-same-origin"
        aria-label={item.caption ?? "Embedded map"}
      />
      {item.caption && (
        <p className="media-gallery-caption">{item.caption}</p>
      )}
    </div>
  );
}
