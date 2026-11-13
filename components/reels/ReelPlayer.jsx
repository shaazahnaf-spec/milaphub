// Responsive Bunny player. Vertical (9:16) videos get a phone-shaped box that never exceeds the
// screen height; widescreen (16:9) videos fill the width. The box matches the video's own shape,
// so nothing is cropped and there are no black bars. No hooks, so it works in server pages.

import { embedSrc, aspectOf } from "@/lib/reels/bunny";

export default function ReelPlayer({ videoId, width, height, title }) {
  const src = embedSrc(videoId); // autoplay + muted + loop + preload
  const { ratio, portrait } = aspectOf(width, height);

  if (!src) {
    return (
      <div className="mx-auto rounded-xl bg-black/40 p-8 text-center text-sm text-white/70">
        Video abhi chalane layak nahi hai. Thodi der baad dobara koshish kijiye.
      </div>
    );
  }

  const boxStyle = portrait
    ? { aspectRatio: String(ratio), width: `min(100%, calc(78vh * ${ratio}))` }
    : { aspectRatio: String(ratio), width: "100%", maxWidth: "960px" };

  return (
    <div className="mx-auto overflow-hidden rounded-xl bg-black shadow-lg" style={boxStyle}>
      <iframe
        src={src}
        title={title || "MilapHub reel"}
        className="h-full w-full border-0"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
