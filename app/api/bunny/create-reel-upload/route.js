// Route: POST /api/bunny/create-reel-upload
// 1) checks the caller is logged in, 2) creates an empty video in Bunny Stream,
// 3) saves the reel row (hidden until upload finishes), 4) returns signed TUS credentials.
// The video file itself goes browser -> Bunny directly, so Vercel never carries it
// (no 4.5MB body limit, no function timeout). The Bunny API key never leaves the server.
//
// Server env: BUNNY_STREAM_API_KEY, BUNNY_STREAM_LIBRARY_ID
//             NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY

import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const DAILY_REEL_LIMIT = 5; // per user per 24h, protects your storage bill
const SIGNATURE_TTL_SECONDS = 6 * 3600;

const fail = (error, status) => NextResponse.json({ error }, { status });
const intOrNull = (v, min, max) => (Number.isInteger(v) && v >= min && v <= max ? v : null);

export async function POST(request) {
  const apiKey = process.env.BUNNY_STREAM_API_KEY;
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
  if (!apiKey || !libraryId) return fail("Video upload abhi set up nahi hai.", 500);

  // Who is calling?
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return fail("Pehle login kijiye.", 401);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { data: auth, error: authError } = await supabase.auth.getUser(token);
  const user = auth?.user;
  if (authError || !user) return fail("Login ka session expire ho gaya. Dobara login kijiye.", 401);

  // Validate input
  let body;
  try { body = await request.json(); } catch { return fail("Request galat hai.", 400); }
  const title = String(body?.title || "").trim();
  const description = String(body?.description || "").trim();
  if (title.length < 2 || title.length > 100) return fail("Title 2 se 100 akshar ka ho.", 400);
  if (description.length > 500) return fail("Description 500 akshar se chhota ho.", 400);
  const width = intOrNull(body?.width, 1, 10000);
  const height = intOrNull(body?.height, 1, 10000);
  const duration = intOrNull(Math.round(Number(body?.duration)), 0, 86400);

  // Daily cap (RLS lets the user count their own rows)
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await supabase.from("reels")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id).gte("created_at", since);
  if ((count || 0) >= DAILY_REEL_LIMIT) {
    return fail(`Aaj ke liye ${DAILY_REEL_LIMIT} reels upload ho chuki hain. Kal dobara koshish kijiye.`, 429);
  }

  // Create the empty video in Bunny
  const created = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos`, {
    method: "POST",
    headers: { AccessKey: apiKey, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!created.ok) return fail("Video server se baat nahi ho payi. Thodi der baad koshish kijiye.", 502);
  const videoId = (await created.json())?.guid;
  if (!videoId) return fail("Video server se baat nahi ho payi.", 502);

  // Save the reel (stays hidden from the public until the browser marks it ready)
  const { data: reel, error: insertError } = await supabase.from("reels").insert({
    user_id: user.id,
    bunny_video_id: videoId,
    title,
    description: description || null,
    width,
    height,
    duration_seconds: duration,
  }).select("id").single();

  if (insertError || !reel) {
    // don't leave an orphan video behind in Bunny
    await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`, {
      method: "DELETE", headers: { AccessKey: apiKey },
    }).catch(() => {});
    return fail("Reel save nahi ho payi. Dobara koshish kijiye.", 500);
  }

  // Sign the TUS upload: sha256(libraryId + apiKey + expiry + videoId)
  const expirationTime = Math.floor(Date.now() / 1000) + SIGNATURE_TTL_SECONDS;
  const signature = createHash("sha256")
    .update(`${libraryId}${apiKey}${expirationTime}${videoId}`)
    .digest("hex");

  return NextResponse.json({ reelId: reel.id, videoId, libraryId, expirationTime, signature });
}
