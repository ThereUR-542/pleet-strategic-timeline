import type { MediaItem } from "../../data/types";
import { externalLinkProps } from "../../lib/links";
import { PdfViewer } from "./PdfViewer";
import { ImageGallery } from "./ImageGallery";
import { VideoEmbed } from "./VideoEmbed";
import { MapEmbed } from "./MapEmbed";

interface Props {
  media: MediaItem[];
}

/**
 * Renders all rich-media items attached to a node (§4.4).
 * Each kind gets its own embed component; plain `link` items become
 * safe external anchor tags via externalLinkProps (§11).
 */
export function MediaEmbed({ media }: Props) {
  if (!media.length) return null;

  const images = media.filter((m) => m.kind === "image");
  const pdfs = media.filter((m) => m.kind === "pdf");
  const maps = media.filter((m) => m.kind === "map");
  const videos = media.filter((m) => m.kind === "video");
  const links = media.filter((m) => m.kind === "link");

  return (
    <div className="media-embeds">
      {images.length > 0 && <ImageGallery items={images} />}

      {pdfs.map((item) => (
        <PdfViewer key={item.id} item={item} />
      ))}

      {maps.map((item) => (
        <MapEmbed key={item.id} item={item} />
      ))}

      {videos.map((item) => (
        <VideoEmbed key={item.id} item={item} />
      ))}

      {links.length > 0 && (
        <ul className="media-links">
          {links.map((item) => (
            <li key={item.id}>
              <a {...externalLinkProps(item.src)} className="media-link">
                {item.caption ?? item.src}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
