// Client-side helpers for uploading a reel straight to Bunny Stream (TUS, resumable).
// Needs:  npm i tus-js-client   (already in your package.json)

import { MAX_REEL_MB } from "@/lib/reels/bunny";

// Reads width / height / duration from the file itself (in the browser, nothing is uploaded).
// Resolves null if the browser cannot read the format (e.g. some iPhone HEVC files on desktop).
export function readVideoMeta(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    let done = false;
    const finish = (meta) => {
      if (done) return;
      done = true;
      URL.revokeObjectURL(url);
      v.removeAttribute("src");
      v.load();
      resolve(meta);
    };
    v.preload = "metadata";
    v.muted = true;
    v.onloadedmetadata = () => finish({
      width: v.videoWidth || null,
      height: v.videoHeight || null,
      duration: Number.isFinite(v.duration) ? Math.round(v.duration) : null,
    });
    v.onerror = () => finish(null);
    setTimeout(() => finish(null), 6000);
    v.src = url;
  });
}

// Returns { reelId, videoId } after the whole file has reached Bunny.
export async function uploadReel({ file, title, description, meta, accessToken, onProgress }) {
  if (!file.type.startsWith("video/")) throw new Error("Please choose a video file.");
  if (file.size > MAX_REEL_MB * 1024 * 1024) throw new Error(`The video must be smaller than ${MAX_REEL_MB}MB.`);

  // 1) our server creates the video + reel row and signs the upload
  const res = await fetch("/api/bunny/create-reel-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      title, description,
      width: meta?.width ?? null, height: meta?.height ?? null, duration: meta?.duration ?? null,
    }),
  });
  const creds = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(creds.error || "Could not start the upload.");

  // 2) the file goes browser -> Bunny directly
  const mod = await import("tus-js-client");
  const Upload = mod.Upload || mod.default?.Upload;

  await new Promise((resolve, reject) => {
    const upload = new Upload(file, {
      endpoint: "https://video.bunnycdn.com/tusupload",
      retryDelays: [0, 3000, 5000, 10000, 20000, 30000],
      headers: {
        AuthorizationSignature: creds.signature,
        AuthorizationExpire: String(creds.expirationTime),
        VideoId: creds.videoId,
        LibraryId: String(creds.libraryId),
      },
      metadata: { filetype: file.type, title },
      onError: () => reject(new Error("The upload was interrupted. Check your internet connection and try again.")),
      onProgress: (sent, total) => onProgress?.(Math.round((sent / total) * 100)),
      onSuccess: () => resolve(),
    });
    upload.start();
  });

  return { reelId: creds.reelId, videoId: creds.videoId };
}
