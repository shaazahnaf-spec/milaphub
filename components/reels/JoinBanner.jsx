"use client";

// Non-intrusive call-to-action for logged-out visitors. It never blocks the video:
// the page renders first, then this appears only if nobody is signed in.

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const KEY = "milaphub-reel-join-dismissed";

export default function JoinBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let off = false;
    try {
      if (sessionStorage.getItem(KEY) === "1") return;
    } catch { /* storage blocked: just show the banner */ }

    supabase.auth.getSession()
      .then(({ data }) => { if (!off && !data.session) setShow(true); })
      .catch(() => { if (!off) setShow(true); });
    return () => { off = true; };
  }, []);

  function dismiss() {
    setShow(false);
    try { sessionStorage.setItem(KEY, "1"); } catch { /* ignore */ }
  }

  if (!show) return null;

  return (
    <div role="region" aria-label="Join MilapHub"
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-xl items-center gap-3 rounded-2xl border border-[#e5eceb] bg-white p-3 shadow-xl">
        <p className="min-w-0 flex-1 text-sm text-[#12302f]">
          <span aria-hidden="true">👋 </span>
          Join MilapHub to like, comment, and upload your own reels.
        </p>
        <Link href="/login"
          className="shrink-0 rounded-full bg-[#0f5c5a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0c4a48] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f5c5a]">
          Join Now
        </Link>
        <button type="button" onClick={dismiss} aria-label="Close"
          className="shrink-0 rounded-full p-1 text-xl leading-none text-stone-400 hover:text-stone-700">
          ×
        </button>
      </div>
    </div>
  );
}
