// Route: POST /api/bunny/create-upload
// Creates an empty video in Bunny Stream and returns signed TUS credentials.
// The Bunny API key lives only in server env vars and never reaches the browser.
//
// Env (Vercel > Settings > Environment Variables, server-side only):
//   BUNNY_STREAM_API_KEY, BUNNY_STREAM_LIBRARY_ID
// Plus the Supabase ones you already have:
//   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY

import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const DAILY_UPLOAD_LIMIT = 10;      // per user per 24h, protects your storage bill
const SIGNATURE_TTL_SECONDS = 6 * 3600;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const fail = (error, status) => NextResponse.json({ error }, { status });

export async function POST(request) {
  const apiKey = process.env.BUNNY_STREAM_API_KEY;
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
  if (!apiKey || !libraryId) return fail("Video upload is not set up yet.", 500);

  // 1) Who is calling? Verify the Supabase access token.
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return fail("Please log in first.", 401);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
  const { data: auth, error: authError } = await supabase.auth.getUser(token);
  const user = auth?.user;
  if (authError || !user) return fail("Your session has expired. Please log in again.", 401);

  // 2) Is this person an admin of that page? (RLS runs as the user)
  let body;
  try { body = await request.json(); } catch { return fail("Invalid request.", 400); }
  const pageId = body?.pageId;
  const title = String(body?.title || "video").slice(0, 100);
  if (!UUID_RE.test(pageId || "")) return fail("Invalid page ID.", 400);

  const { data: admin } = await supabase.from("page_admins").select("page_id")
    .eq("page_id", pageId).eq("user_id", user.id).maybeSingle();
  if (!admin) return fail("You are not an admin of this page.", 403);

  // 3) Daily cap
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await supabase.from("page_video_uploads")
    .select("video_id", { count: "exact", head: true })
    .eq("user_id", user.id).gte("created_at", since);
  if ((count || 0) >= DAILY_UPLOAD_LIMIT) {
    return fail(`You have reached today's limit of ${DAILY_UPLOAD_LIMIT} video uploads. Please try again tomorrow.`, 429);
  }

  // 4) Create the video object in Bunny
  const created = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos`, {
    method: "POST",
    headers: { AccessKey: apiKey, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!created.ok) return fail("Could not reach the video server. Please try again in a moment.", 502);
  const video = await created.json();
  const videoId = video?.guid;
  if (!videoId) return fail("Could not reach the video server.", 502);

  // 5) Remember who owns this video (the database later checks this when the post is saved)
  const { error: trackError } = await supabase.from("page_video_uploads")
    .insert({ video_id: videoId, page_id: pageId, user_id: user.id });
  if (trackError) return fail("Could not create the upload record.", 500);

  // 6) Sign the TUS upload: sha256(libraryId + apiKey + expiry + videoId)
  const expirationTime = Math.floor(Date.now() / 1000) + SIGNATURE_TTL_SECONDS;
  const signature = createHash("sha256")
    .update(`${libraryId}${apiKey}${expirationTime}${videoId}`)
    .digest("hex");

  return NextResponse.json({ videoId, libraryId, expirationTime, signature });
}
