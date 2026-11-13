// Route: /reels   Public grid of the latest finished reels.

import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import BazaarHeader from "@/components/BazaarHeader";
import { thumbnailUrl } from "@/lib/reels/bunny";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Reels | MilapHub",
  description: "MilapHub par chhote aur lambe videos dekhiye.",
};

function fmt(seconds) {
  if (!seconds && seconds !== 0) return "";
  const m = Math.floor(seconds / 60);
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export default async function ReelsPage() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase
    .from("reels")
    .select("id, title, bunny_video_id, duration_seconds")
    .eq("upload_state", "ready")
    .eq("is_hidden", false)
    .order("created_at", { ascending: false })
    .limit(36);
  if (error) console.error("reels list failed:", error.message);
  const reels = data || [];

  return (
    <>
      <BazaarHeader title="Reels" />
      <main className="mx-auto max-w-5xl p-4">
        <div className="flex justify-end">
          <Link href="/reels/upload" className="rounded-full bg-[#0f5c5a] px-5 py-2 text-sm font-semibold text-white hover:bg-[#0c4a48]">
            Reel upload karein
          </Link>
        </div>

        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">Reels load nahi ho payi.</p>}
        {!error && reels.length === 0 && (
          <p className="mt-6 rounded-xl bg-[#f3f7f6] p-6 text-center text-[#12302f]">
            Abhi koi reel nahi hai. Pehli reel aap upload kijiye.
          </p>
        )}

        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {reels.map((r) => {
            const thumb = thumbnailUrl(r.bunny_video_id);
            return (
              <li key={r.id}>
                <Link href={`/reel/${r.id}`} className="group block overflow-hidden rounded-xl border border-[#e5eceb] bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0f5c5a]">
                  <div className="relative aspect-[3/4] w-full bg-gradient-to-br from-[#0f5c5a] to-[#12302f]">
                    {thumb && <img src={thumb} alt="" loading="lazy" className="h-full w-full object-cover" />}
                    {r.duration_seconds != null && (
                      <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">
                        {fmt(r.duration_seconds)}
                      </span>
                    )}
                  </div>
                  <p className="line-clamp-2 p-2 text-sm font-medium text-[#12302f]">{r.title}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      </main>
    </>
  );
}
