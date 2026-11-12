"use client";

// Route: /pages/[username]

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import BazaarHeader from "@/components/BazaarHeader";
import { CATEGORY_LABEL, uploadPageImage } from "@/lib/pages/config";
import { POSTS, buildPostInsert } from "@/lib/pages/postsAdapter";
import { uploadVideoToBunny, MAX_VIDEO_MB } from "@/lib/pages/video";
import PagePostCard from "@/components/pages/PagePostCard";

const REPORT_REASONS = [
  ["fake", "Nakli page"],
  ["impersonation", "Kisi aur ki nakal (impersonation)"],
  ["scam", "Dhokha / scam"],
  ["spam", "Spam"],
  ["inappropriate", "Galat content"],
  ["other", "Kuch aur"],
];

async function share(url, title) {
  try {
    if (navigator.share) return await navigator.share({ title, url });
    await navigator.clipboard.writeText(url);
    alert("Link copy ho gaya.");
  } catch { /* cancelled */ }
}

function PageProfileBody() {
  const { username } = useParams();
  const [user, setUser] = useState(null);
  const [page, setPage] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [posts, setPosts] = useState([]);
  const [following, setFollowing] = useState(false);
  const [tab, setTab] = useState("posts");
  const [phone, setPhone] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [reporting, setReporting] = useState(false);

  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    const u = auth.user ?? null;
    setUser(u);

    const { data: p } = await supabase.from("pages").select("*").eq("username", username).maybeSingle();
    if (!p) { setNotFound(true); setLoading(false); return; }
    setPage(p);

    const { data: rows } = await supabase.from(POSTS.table).select("*").eq("page_id", p.id)
      .order(POSTS.columns.createdAt, { ascending: false }).limit(30);
    setPosts(rows || []);

    if (u) {
      const [{ data: f }, { data: a }] = await Promise.all([
        supabase.from("page_follows").select("page_id").eq("page_id", p.id).eq("user_id", u.id).maybeSingle(),
        supabase.from("page_admins").select("page_id").eq("page_id", p.id).eq("user_id", u.id).maybeSingle(),
      ]);
      setFollowing(!!f);
      setIsAdmin(!!a);
    }
    setLoading(false);
  }, [username]);

  useEffect(() => { load(); }, [load]);

  const login = () => { window.location.href = `/login?next=/pages/${username}`; };

  async function toggleFollow() {
    if (!user) return login();
    const was = following;
    setFollowing(!was);
    setPage((p) => ({ ...p, followers_count: Math.max(0, p.followers_count + (was ? -1 : 1)) }));
    const { error } = was
      ? await supabase.from("page_follows").delete().eq("page_id", page.id).eq("user_id", user.id)
      : await supabase.from("page_follows").insert({ page_id: page.id, user_id: user.id });
    if (error) load(); // roll back to the server's truth
  }

  async function showNumber() {
    if (!user) return login();
    const { data, error } = await supabase.rpc("reveal_page_phone", { p_page: page.id });
    if (error || !data) return alert("Number abhi nahi mil paya.");
    setPhone(data);
  }

  async function removePost(id) {
    if (!confirm("Yeh post delete karein?")) return;
    const { error } = await supabase.from(POSTS.table).delete().eq("id", id);
    if (error) return alert("Post delete nahi ho payi.");
    setPosts((ps) => ps.filter((x) => x.id !== id));
  }

  if (loading) return <p className="p-6 text-stone-500">Loading...</p>;
  if (notFound) {
    return (
      <main className="mx-auto max-w-xl p-6">
        <h1 className="text-xl font-semibold">Yeh page nahi mila</h1>
        <Link href="/pages" className="mt-3 inline-block text-emerald-700 underline">Pages dhoondhiye</Link>
      </main>
    );
  }

  const pageUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <main className="mx-auto max-w-2xl pb-16">
      <div className="h-40 w-full overflow-hidden bg-stone-200 sm:h-52 sm:rounded-b-xl">
        {page.cover_url && <img src={page.cover_url} alt="" className="h-full w-full object-cover" />}
      </div>

      <header className="px-4">
        <div className="-mt-10 h-20 w-20 overflow-hidden rounded-full border-4 border-white bg-stone-300">
          {page.avatar_url && <img src={page.avatar_url} alt={page.name} className="h-full w-full object-cover" />}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">{page.name}</h1>
          {page.is_verified && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">Verified Local</span>
          )}
          {page.is_hidden && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800">Hidden by admin</span>}
        </div>
        <p className="text-sm text-stone-500">@{page.username}</p>
        <p className="text-sm text-stone-500">{page.subcategory} - {CATEGORY_LABEL[page.category]} - {page.city}, {page.state}</p>
        {page.bio && <p className="mt-3 whitespace-pre-line text-stone-800">{page.bio}</p>}
        <p className="mt-3 text-sm"><strong>{page.followers_count}</strong> followers</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {!isAdmin && (
            <button type="button" onClick={toggleFollow}
              className={`rounded-lg px-4 py-2 ${following ? "border border-stone-300" : "bg-emerald-700 text-white"}`}>
              {following ? "Following" : "Follow"}
            </button>
          )}
          <button type="button" onClick={() => share(pageUrl, page.name)} className="rounded-lg border border-stone-300 px-4 py-2">Share</button>
          {!isAdmin && (
            <button type="button" onClick={() => (user ? setReporting(true) : login())} className="rounded-lg border border-stone-300 px-4 py-2 text-stone-600">
              Report
            </button>
          )}
        </div>
        {/* P2: "Chat with page" button goes here.  P3: Support (UPI) and Boost buttons go here. */}
      </header>

      <div role="tablist" className="mx-4 mt-6 flex gap-1 border-b border-stone-200">
        {[["posts", "Posts"], ["about", "About"]].map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={`px-4 py-2 text-sm ${tab === id ? "border-b-2 border-emerald-700 font-medium" : "text-stone-500"}`}>
            {label}
          </button>
        ))}
        {/* P2: add the "Bazaar Products" tab here. */}
      </div>

      {tab === "posts" && (
        <>
          {isAdmin && <Composer page={page} user={user} onPosted={(row) => setPosts((ps) => [row, ...ps])} />}
          <section className="mt-4 space-y-4 px-4">
            {posts.length === 0 && (
              <p className="rounded-lg bg-stone-50 p-4 text-stone-600">
                {isAdmin ? "Pehli post likhiye. Aapke followers ko yahin dikhegi." : "Abhi tak koi post nahi."}
              </p>
            )}
            {posts.map((row) => (
              <PagePostCard key={row.id} row={row} user={user} canDelete={isAdmin} onDelete={removePost} />
            ))}
          </section>
        </>
      )}

      {tab === "about" && (
        <section className="mt-4 space-y-4 px-4">
          {page.about ? <p className="whitespace-pre-line">{page.about}</p> : <p className="text-stone-500">Abhi About nahi likha gaya.</p>}
          {page.address && <p><span className="text-stone-500">Address: </span>{page.address}, {page.city}</p>}
          {page.has_phone && (
            phone
              ? <p><span className="text-stone-500">Phone: </span><a className="text-emerald-700 underline" href={`tel:${phone}`}>{phone}</a></p>
              : <button type="button" onClick={showNumber} className="rounded-lg border border-stone-300 px-4 py-2">Show number</button>
          )}
          <p className="text-sm text-stone-500">Page banaya: {new Date(page.created_at).toLocaleDateString("en-IN")}</p>
        </section>
      )}

      {reporting && <ReportDialog page={page} user={user} onClose={() => setReporting(false)} />}
    </main>
  );
}

function Composer({ page, user, onPosted }) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState("none"); // none | photo | video
  const [image, setImage] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [progress, setProgress] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const pick = (m) => { setMode(m); setError(""); };

  function friendly(e) {
    const m = e?.message || "";
    if (m.includes("VIDEO_NOT_OWNED")) return "Yeh video aapke page ka nahi hai. Dobara upload kijiye.";
    if (m.includes("NOT_PAGE_ADMIN")) return "Aap is page ke admin nahi hain.";
    return m || "Post nahi ho payi. Dobara koshish kijiye.";
  }

  async function publish() {
    setError("");
    const hasAttachment = (mode === "photo" && image) || (mode === "video" && videoFile);
    if (!text.trim() && !hasAttachment) return setError("Kuch likhiye ya photo/video jodiye.");

    setBusy(true);
    try {
      // Your feed filters posts by city, so every page post carries the posting admin's city.
      const { data: prof } = await supabase.from("profiles").select("city_id").eq("id", user.id).maybeSingle();
      if (!prof?.city_id) throw new Error("Pehle apni profile mein city chuniye, phir post kijiye.");
      let imageUrl = null;
      let video = null;

      if (mode === "photo" && image) {
        imageUrl = await uploadPageImage(supabase, user.id, image, "post");
      } else if (mode === "video" && videoFile) {
        const { data: s } = await supabase.auth.getSession();
        const token = s?.session?.access_token;
        if (!token) throw new Error("Login ka session expire ho gaya. Dobara login kijiye.");
        setProgress(0);
        const id = await uploadVideoToBunny(videoFile, { pageId: page.id, accessToken: token, onProgress: setProgress });
        video = { provider: "bunny", id };
      }

      const { data, error: insErr } = await supabase.from(POSTS.table)
        .insert(buildPostInsert({ userId: user.id, pageId: page.id, text: text.trim(), imageUrl, video, cityId: prof.city_id }))
        .select("*").single();
      if (insErr) throw insErr;

      onPosted(data);
      setText(""); setImage(null); setVideoFile(null); setMode("none");
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  const chip = (id, label) => (
    <button type="button" key={id} onClick={() => pick(mode === id ? "none" : id)} aria-pressed={mode === id} disabled={busy}
      className={`rounded-full border px-3 py-1 text-sm ${mode === id ? "border-emerald-700 bg-emerald-50" : "border-stone-300 bg-white"}`}>
      {label}
    </button>
  );

  return (
    <section className="mx-4 mt-4 rounded-xl border border-stone-200 bg-stone-50 p-4">
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={2000} placeholder="Kya naya hai aapke page par?"
        className="w-full rounded-lg border border-stone-300 bg-white p-3 outline-none focus:border-emerald-700" />

      <div className="mt-2 flex flex-wrap gap-2">
        {chip("photo", "Photo")}
        {chip("video", "Video upload")}
      </div>

      {mode === "photo" && (
        <input type="file" accept="image/*" className="mt-3 text-sm" disabled={busy}
          onChange={(e) => setImage(e.target.files?.[0] || null)} />
      )}
      {mode === "video" && (
        <div className="mt-3">
          <input type="file" accept="video/*" className="text-sm" disabled={busy}
            onChange={(e) => setVideoFile(e.target.files?.[0] || null)} />
          <p className="mt-1 text-xs text-stone-500">Max {MAX_VIDEO_MB}MB. Upload ke baad video ko process hone mein thoda time lag sakta hai.</p>
        </div>
      )}

      {progress !== null && (
        <div className="mt-3" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-2 w-full rounded bg-stone-200">
            <div className="h-2 rounded bg-emerald-700 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1 text-xs text-stone-500">Video upload ho raha hai: {progress}%. Page band mat kijiye.</p>
        </div>
      )}

      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      <button type="button" onClick={publish} disabled={busy} className="mt-3 rounded-lg bg-emerald-700 px-4 py-2 text-white disabled:opacity-60">
        {busy ? "Post ho raha hai..." : "Post karein"}
      </button>
    </section>
  );
}

function ReportDialog({ page, user, onClose }) {
  const [reason, setReason] = useState("fake");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function send() {
    setBusy(true);
    const { error } = await supabase.from("page_reports").insert({
      page_id: page.id, reporter_id: user.id, reason, details: details.trim() || null,
    });
    setBusy(false);
    if (error) return setMsg(error.code === "23505" ? "Aap is page ki report pehle hi kar chuke hain." : "Report nahi ho payi. Dobara koshish kijiye.");
    setMsg("Report mil gayi. Hum dekhenge.");
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Page report karein" className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-xl bg-white p-5">
        <h2 className="text-lg font-semibold">Page report karein</h2>
        {msg ? (
          <>
            <p className="mt-3">{msg}</p>
            <button type="button" onClick={onClose} className="mt-4 rounded-lg border border-stone-300 px-4 py-2">Band karein</button>
          </>
        ) : (
          <>
            <select value={reason} onChange={(e) => setReason(e.target.value)} className="mt-3 w-full rounded-lg border border-stone-300 px-3 py-2">
              {REPORT_REASONS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
            <textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={500} rows={3}
              placeholder="Aur batayiye (optional)" className="mt-3 w-full rounded-lg border border-stone-300 p-3" />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={onClose} className="rounded-lg border border-stone-300 px-4 py-2">Cancel</button>
              <button type="button" onClick={send} disabled={busy} className="rounded-lg bg-red-600 px-4 py-2 text-white disabled:opacity-60">
                {busy ? "Bhej rahe hain..." : "Report bhejiye"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function PageProfile() {
  return (
    <>
      <BazaarHeader title="Page" />
      <PageProfileBody />
    </>
  );
}
