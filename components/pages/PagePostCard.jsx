"use client";

// A minimal post card so the Posts tab works on day one.
// To get like / comment / share / save / report for page posts, replace this
// component's usage in app/pages/[username]/page.jsx with your EXISTING PostCard
// (it already works on rows of the posts table, which now also carry page_id).
// If you keep your own PostCard, render videos with videoEmbedSrc() from lib/pages/video.js.

import { readPost } from "@/lib/pages/postsAdapter";
import { timeAgo } from "@/lib/pages/config";
import { videoEmbedSrc } from "@/lib/pages/video";

export default function PagePostCard({ row, canDelete, onDelete }) {
  const post = readPost(row);
  const videoSrc = post.video ? videoEmbedSrc(post.video.provider, post.video.id) : null;

  return (
    <article className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex items-center justify-between text-xs text-stone-500">
        <span>{post.createdAt ? timeAgo(post.createdAt) : ""}</span>
        {canDelete && (
          <button type="button" onClick={() => onDelete(post.id)} className="text-red-600">
            Delete
          </button>
        )}
      </div>
      {post.text && <p className="mt-2 whitespace-pre-line text-stone-900">{post.text}</p>}
      {post.image && <img src={post.image} alt="" loading="lazy" className="mt-3 w-full rounded-lg" />}
      {videoSrc && (
        <div className="mt-3 aspect-video w-full overflow-hidden rounded-lg bg-black">
          <iframe
            src={videoSrc}
            title="Video"
            loading="lazy"
            className="h-full w-full"
            allowFullScreen
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      )}
    </article>
  );
}
