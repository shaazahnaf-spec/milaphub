// Video helpers for Pages: direct upload to Bunny Stream (no external YouTube links).
// Needs:  npm i tus-js-client

export const MAX_VIDEO_MB = 200; // change this to your limit

// Returns the iframe src for a stored video, or null if it cannot be built.
export function videoEmbedSrc(provider, id) {
  if (!provider || !id) return null;
  if (provider === "bunny") {
    const lib = process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID;
    return lib ? `https://player.mediadelivery.net/embed/${lib}/${id}?preload=false` : null;
  }
  return null;
}

// Uploads a video straight from the browser to Bunny over TUS.
// Our server only creates the video and signs the upload, so the API key stays secret
// and Vercel's request-size limit does not apply. Resolves with the Bunny video ID.
export async function uploadVideoToBunny(file, { pageId, accessToken, onProgress }) {
  if (!file.type.startsWith("video/")) throw new Error("Please choose a video file.");
  if (file.size > MAX_VIDEO_MB * 1024 * 1024) throw new Error(`The video must be smaller than ${MAX_VIDEO_MB}MB.`);

  const res = await fetch("/api/bunny/create-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ pageId, title: file.name.slice(0, 100) }),
  });
  const creds = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(creds.error || "Could not start the video upload.");

  const mod = await import("tus-js-client");
  const Upload = mod.Upload || mod.default?.Upload;

  await new Promise((resolve, reject) => {
    const upload = new Upload(file, {
      endpoint: "https://video.bunnycdn.com/tusupload",
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        AuthorizationSignature: creds.signature,
        AuthorizationExpire: String(creds.expirationTime),
        VideoId: creds.videoId,
        LibraryId: String(creds.libraryId),
      },
      metadata: { filetype: file.type, title: file.name },
      onError: () => reject(new Error("The video upload was interrupted. Check your internet connection and try again.")),
      onProgress: (sent, total) => onProgress?.(Math.round((sent / total) * 100)),
      onSuccess: () => resolve(),
    });
    upload.start();
  });

  return creds.videoId;
}
