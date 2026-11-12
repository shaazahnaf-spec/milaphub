// =====================================================================
// postsAdapter.js : the ONE file that knows your existing posts table.
// Filled in from your real schema (author_id, body, media_url, city_id, category).
// =====================================================================

export const POSTS = {
  table: "posts",
  columns: {
    author: "author_id",
    text: "body",
    image: "media_url",
    createdAt: "created_at",
    // Added by pages_p1b_video.sql
    videoProvider: "video_provider",
    videoId: "video_id",
  },
  // Values your posts table needs on every insert (same as the home composer sends).
  extraInsert: { category: "general", allow_tips: false },
};

// video = { provider: "bunny", id: "..." } or null
// cityId = the posting admin's profile.city_id (posts are filtered by city in your feed)
export function buildPostInsert({ userId, pageId, text, imageUrl, video, cityId }) {
  const c = POSTS.columns;
  const row = { ...POSTS.extraInsert, page_id: pageId, [c.author]: userId, city_id: cityId };
  if (text) row[c.text] = text;
  if (imageUrl && c.image) row[c.image] = imageUrl;
  if (video) {
    row[c.videoProvider] = video.provider;
    row[c.videoId] = video.id;
  }
  return row;
}

// Normalises a raw row from your posts table for PagePostCard.
export function readPost(row) {
  const c = POSTS.columns;
  const provider = row[c.videoProvider] ?? null;
  const id = row[c.videoId] ?? null;
  return {
    id: row.id,
    text: row[c.text] ?? "",
    image: c.image ? row[c.image] ?? null : null,
    video: provider && id ? { provider, id } : null,
    createdAt: row[c.createdAt] ?? null,
    raw: row,
  };
}
