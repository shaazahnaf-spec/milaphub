"use client";

// Route: /reels/upload   (login required). Video goes browser -> Bunny directly (TUS).

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import BazaarHeader from "@/components/BazaarHeader";
import { MAX_REEL_MB } from "@/lib/reels/bunny";
import { readVideoMeta, uploadReel } from "@/lib/reels/upload";

function UploadBody() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [meta, setMeta] = useState(null);
  const [progress, setProgress] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { setUser(data.user ?? null); setChecking(false); });
  }, []);

  async function onFile(e) {
    const f = e.target.files?.[0] || null;
    setError("");
    setMeta(null);
    if (!f) return setFile(null);
    if (!f.type.startsWith("video/")) { setFile(null); return setError("Sirf video file chuniye."); }
    if (f.size > MAX_REEL_MB * 1024 * 1024) { setFile(null); return setError(`Video ${MAX_REEL_MB}MB se chhota hona chahiye.`); }
    setFile(f);
    if (!title.trim()) setTitle(f.name.replace(/\.[^.]+$/, "").slice(0, 100));
    setMeta(await readVideoMeta(f));
  }

  async function submit() {
    setError("");
    if (!file) return setError("Pehle video chuniye.");
    if (title.trim().length < 2) return setError("Title kam se kam 2 akshar ka ho.");
    setBusy(true);
    setProgress(0);
    try {
      const { data: s } = await supabase.auth.getSession();
      const token = s?.session?.access_token;
      if (!token) throw new Error("Login ka session expire ho gaya. Dobara login kijiye.");

      const { reelId } = await uploadReel({
        file, title: title.trim(), description: description.trim(), meta,
        accessToken: token, onProgress: setProgress,
      });

      // The whole file reached Bunny: now make the reel public.
      const { error: updateError } = await supabase.from("reels").update({ upload_state: "ready" }).eq("id", reelId);
      if (updateError) throw new Error("Video upload ho gaya par reel publish nahi ho payi. Dobara koshish kijiye.");
      router.push(`/reel/${reelId}`);
    } catch (e) {
      setError(e.message || "Upload nahi ho paya.");
      setBusy(false);
      setProgress(null);
    }
  }

  if (checking) return <p className="p-6 text-stone-500">Loading...</p>;

  if (!user) {
    return (
      <main className="mx-auto max-w-xl p-6">
        <h2 className="text-xl font-semibold text-[#12302f]">Reel upload karne ke liye login kijiye</h2>
        <Link href="/login" className="mt-4 inline-block rounded-full bg-[#0f5c5a] px-5 py-2 text-white">Login</Link>
      </main>
    );
  }

  const input = "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 outline-none focus:border-[#0f5c5a] focus:ring-2 focus:ring-[#0f5c5a]/20";
  const shape = meta?.width && meta?.height
    ? (meta.height > meta.width ? "Vertical (9:16 jaisi)" : "Widescreen")
    : null;

  return (
    <main className="mx-auto max-w-xl p-4 sm:p-6">
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Video file</span>
          <input type="file" accept="video/*" onChange={onFile} disabled={busy} />
          <span className="mt-1 block text-xs text-stone-500">
            Max {MAX_REEL_MB}MB. Lambi videos bhi chalti hain, file seedha Bunny ko jaati hai.
            {shape && ` Pehchaana gaya: ${shape}.`}
          </span>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Title</span>
          <input className={input} maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} disabled={busy} />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Description (optional)</span>
          <textarea className={input} rows={4} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} disabled={busy} />
          <span className="mt-1 block text-right text-xs text-stone-500">{description.length}/500</span>
        </label>

        {progress !== null && (
          <div role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-2 w-full rounded bg-stone-200">
              <div className="h-2 rounded bg-[#0f5c5a] transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1 text-xs text-stone-500">Upload ho raha hai: {progress}%. Page band mat kijiye.</p>
          </div>
        )}

        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <button type="button" onClick={submit} disabled={busy || !file}
          className="rounded-full bg-[#0f5c5a] px-6 py-2.5 font-semibold text-white hover:bg-[#0c4a48] disabled:opacity-50">
          {busy ? "Upload ho raha hai..." : "Reel publish karein"}
        </button>
        <p className="text-xs text-stone-500">Upload ke baad video ko process hone mein thoda time lag sakta hai. Tab tak player "processing" dikha sakta hai.</p>
      </div>
    </main>
  );
}

export default function ReelUploadPage() {
  return (
    <>
      <BazaarHeader title="Reel upload" />
      <UploadBody />
    </>
  );
}
