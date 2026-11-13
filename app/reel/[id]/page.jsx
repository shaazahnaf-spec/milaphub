// Route: /reel/[id]   PUBLIC. No login needed, so WhatsApp / Instagram links open instantly.
// Server-rendered: the video, title and Open Graph preview are in the first HTML response.

import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import ReelPlayer from "@/components/reels/ReelPlayer";
import JoinBanner from "@/components/reels/JoinBanner";
import ShareButton from "@/components/reels/ShareButton";
import { SITE_URL, thumbnailUrl } from "@/lib/reels/bunny";

// Always fresh, so a reel is visible the moment its upload is marked ready.
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Anonymous client: the visitor is not logged in, and RLS decides what is public.
const anonClient = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

// cache() shares one database read between generateMetadata and the page.
const getReel = cache(async (id) => {
  if (!UUID_RE.test(id)) return null;
  const supabase = anonClient();
  const { data, error } = await supabase
    .from("reels")
    .select("id, user_id, bunny_video_id, title, description, width, height")
    .eq("id", id)
    .maybeSingle();
  if (error) console.error("reel fetch failed:", error.message);
  if (!data) return null;

  // Author name is optional: if profiles are not public for anonymous visitors we simply skip it.
  const { data: author } = await supabase
    .from("profiles")
    .select("full_name, username")
    .eq("id", data.user_id)
    .maybeSingle();
  return { ...data, author: author || null };
});

export async function generateMetadata({ params }) {
  const { id } = await params;
  const reel = await getReel(id);
  if (!reel) return { title: "Reel nahi mili | MilapHub", robots: { index: false } };

  const title = reel.title;
  const description = (reel.description || "MilapHub par yeh video dekhiye.").slice(0, 200);
  const url = `${SITE_URL}/reel/${reel.id}`;
  const image = thumbnailUrl(reel.bunny_video_id);

  return {
    metadataBase: new URL(SITE_URL),
    title: `${title} | MilapHub`,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "video.other",
      siteName: "MilapHub",
      url,
      title,
      description,
      ...(image ? { images: [{ url: image, alt: title }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function ReelPage({ params }) {
  const { id } = await params;
  const reel = await getReel(id);
  if (!reel) notFound();

  const url = `${SITE_URL}/reel/${reel.id}`;
  const authorName = reel.author?.full_name || reel.author?.username || null;

  return (
    <main className="min-h-screen bg-[#0b1514] pb-32 text-white">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-extrabold text-white">MilapHub</Link>
        <Link href="/reels" className="text-sm text-white/70 hover:text-white">Aur reels</Link>
      </header>

      <section className="mx-auto max-w-5xl px-3">
        <ReelPlayer
          videoId={reel.bunny_video_id}
          width={reel.width}
          height={reel.height}
          title={reel.title}
        />

        <div className="mx-auto mt-4 max-w-[960px] space-y-2 px-1">
          <h1 className="text-xl font-bold">{reel.title}</h1>
          {authorName && <p className="text-sm text-white/60">{authorName}</p>}
          {reel.description && (
            <p className="whitespace-pre-line text-sm text-white/80">{reel.description}</p>
          )}
          <div className="pt-2">
            <ShareButton url={url} title={reel.title} />
          </div>
        </div>
      </section>

      <JoinBanner />
    </main>
  );
}
