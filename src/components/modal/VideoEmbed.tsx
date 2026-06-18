import type { MediaItem } from "../../data/types";

function isYoutubeLike(src: string): boolean {
  return (
    src.includes("youtube.com") ||
    src.includes("youtu.be") ||
    src.includes("youtube-nocookie.com")
  );
}

/** Convert any YouTube URL to youtube-nocookie embed form (§4.4). */
function toNocookieEmbed(src: string): string {
  return src
    .replace(/https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([^&]+).*/, "https://www.youtube-nocookie.com/embed/$1")
    .replace(/https?:\/\/(?:www\.)?youtube\.com\/embed\//, "https://www.youtube-nocookie.com/embed/")
    .replace(/https?:\/\/youtu\.be\/([^?]+).*/, "https://www.youtube-nocookie.com/embed/$1");
}

interface Props {
  item: MediaItem;
}

/**
 * Video embed (§4.4): YouTube → youtube-nocookie iframe; self-hosted → HTML5 <video>.
 * Iframe sandbox allows scripts + same-origin (required for playback); no
 * top-navigation permission so embed can never navigate the parent tab (§11).
 */
export function VideoEmbed({ item }: Props) {
  if (isYoutubeLike(item.src)) {
    const embedUrl = toNocookieEmbed(item.src);
    return (
      <div className="media-video-wrapper">
        <iframe
          src={embedUrl}
          title={item.caption ?? "Video"}
          className="media-video-iframe"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          sandbox="allow-scripts allow-same-origin allow-presentation"
          referrerPolicy="no-referrer-when-downgrade"
        />
        {item.caption && (
          <p className="media-gallery-caption">{item.caption}</p>
        )}
      </div>
    );
  }

  // Self-hosted HTML5 video
  return (
    <div className="media-video-wrapper">
      <video
        src={item.src}
        controls
        className="media-video-html5"
        preload="metadata"
      >
        <track kind="captions" />
        Your browser does not support HTML5 video.
      </video>
      {item.caption && (
        <p className="media-gallery-caption">{item.caption}</p>
      )}
    </div>
  );
}
