// =====================================================================
// postsAdapter.js : the ONE file that knows your existing posts table.
// Change the names below to match your real columns. Nothing else needs editing.
// =====================================================================

export const POSTS = {
  table: "posts",
  columns: {
    author: "user_id",        // column that stores who wrote the post
    text: "content",          // post text
    image: "image_url",       // post image (set to null if your table has no such column)
    createdAt: "created_at",  // timestamp used for sorting
    // Added by pages_p1b_video.sql (keep these names unless you changed the SQL):
    videoProvider: "video_provider",  // always 'bunny' for now
    videoId: "video_id",
  },
  // Extra values your posts table requires on insert (NOT NULL columns, a type, etc.)
  // Example: { type: "text", visibility: "public" }
  extraInsert: {},
};

// video = { provider: "bunny", id: "..." } or null
export function buildPostInsert({ userId, pageId, text, imageUrl, video }) {
  const c = POSTS.columns;
  const row = { ...POSTS.extraInsert, page_id: pageId, [c.author]: userId };
  if (text) row[c.text] = text;
  if (imageUrl && c.image) row[c.image] = imageUrl;
  if (video) {
    row[c.videoProvider] = video.provider;
    row[c.videoId] = video.id;
  }
  return row;
}

// Normalises a raw row from your posts table for the simple PagePostCard.
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
