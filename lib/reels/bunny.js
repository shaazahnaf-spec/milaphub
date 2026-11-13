// Bunny Stream helpers for Reels (safe to import from server and client code).
//
// Env vars (Vercel):
//   NEXT_PUBLIC_BUNNY_LIBRARY_ID     your Stream library ID
//   NEXT_PUBLIC_BUNNY_CDN_HOSTNAME   Pull Zone hostname, e.g. vz-xxxxxxxx-xxx.b-cdn.net
//                                    (Bunny dashboard > Stream > your library > API)
//   NEXT_PUBLIC_SITE_URL             optional, default https://milaphub.vercel.app

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://milaphub.vercel.app").replace(/\/$/, "");
export const MAX_REEL_MB = 1024; // change to your limit. Bigger files = bigger Bunny bill.

const LIBRARY_ID = process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID;
const CDN_HOST = (process.env.NEXT_PUBLIC_BUNNY_CDN_HOSTNAME || "")
  .replace(/^https?:\/\//, "")
  .replace(/\/.*$/, "");

// Bunny player URL. Muted autoplay is the only autoplay browsers allow on a fresh page load.
export function embedSrc(videoId, { autoplay = true, muted = true, loop = true, preload = true } = {}) {
  if (!LIBRARY_ID || !videoId) return null;
  const q = new URLSearchParams({
    autoplay: String(autoplay),
    muted: String(muted),
    loop: String(loop),
    preload: String(preload),
  });
  return `https://player.mediadelivery.net/embed/${LIBRARY_ID}/${videoId}?${q}`;
}

// Auto-generated thumbnail (exists once Bunny has finished processing the video).
export function thumbnailUrl(videoId) {
  return CDN_HOST && videoId ? `https://${CDN_HOST}/${videoId}/thumbnail.jpg` : null;
}

// Works out the player shape from the stored size. Unknown size falls back to 16:9.
export function aspectOf(width, height) {
  if (!width || !height) return { ratio: 16 / 9, portrait: false };
  const ratio = Math.min(2.4, Math.max(0.4, width / height)); // clamp silly values
  return { ratio, portrait: ratio < 1 };
}
