"use client";

// Post card for the Posts tab of a page. Includes Like, Comment and Report (PostActions)
// plus Delete for the page team.

import { readPost } from "@/lib/pages/postsAdapter";
import { timeAgo } from "@/lib/pages/config";
import { videoEmbedSrc } from "@/lib/pages/video";
import PostActions from "@/components/pages/PostActions";

export default function PagePostCard({ row, user, canDelete, onDelete }) {
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
      <PostActions postId={post.id} user={user} />
    </article>
  );
}
