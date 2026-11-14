"use client";

// Like, Comment and Report for a page post. Uses the SAME tables as your home feed
// (post_likes, post_comments, post_reports), so counts and moderation stay in one place.

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { timeAgo } from "@/lib/pages/config";

const REASONS = [
  ["spam", "Spam or scam"],
  ["abuse", "Abuse or harassment"],
  ["hate", "Hate speech"],
  ["nudity", "Nudity or sexual content"],
  ["fake", "False information"],
  ["other", "Something else"],
];

const COMMENT_FIELDS = "id, author_id, parent_id, body, created_at, profiles!author_id(full_name, username)";
const nameOf = (c) => {
  const p = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
  return p?.full_name || p?.username || "MilapHub user";
};

export default function PostActions({ postId, user }) {
  const uid = user?.id;
  const [likes, setLikes] = useState(0);
  const [liked, setLiked] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");

  const needLogin = () => { window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`; };

  useEffect(() => {
    let off = false;
    (async () => {
      const [l, c] = await Promise.all([
        supabase.from("post_likes").select("user_id", { count: "exact", head: true }).eq("post_id", postId),
        supabase.from("post_comments").select("id", { count: "exact", head: true }).eq("post_id", postId),
      ]);
      if (off) return;
      setLikes(l.count || 0);
      setCommentCount(c.count || 0);
      if (uid) {
        const { data } = await supabase.from("post_likes").select("post_id").eq("post_id", postId).eq("user_id", uid).maybeSingle();
        if (!off) setLiked(!!data);
      }
    })();
    return () => { off = true; };
  }, [postId, uid]);

  async function toggleLike() {
    if (!uid) return needLogin();
    const was = liked;
    setLiked(!was);
    setLikes((n) => Math.max(0, n + (was ? -1 : 1)));
    const { error } = was
      ? await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", uid)
      : await supabase.from("post_likes").insert({ post_id: postId, user_id: uid });
    if (error) { setLiked(was); setLikes((n) => Math.max(0, n + (was ? 1 : -1))); setNote(error.message); }
  }

  async function toggleComments() {
    const next = !open;
    setOpen(next);
    if (!next || comments) return;
    const { data, error } = await supabase.from("post_comments").select(COMMENT_FIELDS)
      .eq("post_id", postId).order("created_at", { ascending: true }).limit(100);
    if (error) return setNote(error.message);
    setComments(data || []);
  }

  async function addComment() {
    const text = draft.trim();
    if (!uid) return needLogin();
    if (!text) return;
    setBusy(true);
    const { data, error } = await supabase.from("post_comments")
      .insert({ post_id: postId, author_id: uid, body: text, parent_id: null })
      .select(COMMENT_FIELDS).single();
    setBusy(false);
    if (error) return setNote(error.message);
    setComments((c) => [...(c || []), data]);
    setCommentCount((n) => n + 1);
    setDraft("");
  }

  async function removeComment(id) {
    const { data, error } = await supabase.from("post_comments").delete().eq("id", id).select("id");
    if (error || !data?.length) return setNote(error?.message || "Could not delete the comment.");
    setComments((c) => (c || []).filter((x) => x.id !== id && x.parent_id !== id));
    setCommentCount((n) => Math.max(0, n - 1));
  }

  async function sendReport() {
    if (!uid) return needLogin();
    setBusy(true);
    const { error } = await supabase.from("post_reports")
      .insert({ post_id: postId, reporter_id: uid, reason, details: details.trim() || null });
    setBusy(false);
    setReporting(false); setDetails(""); setReason("spam");
    setNote(error ? (error.code === "23505" ? "You have already reported this post." : error.message)
                  : "Thank you. Our team will review this post.");
  }

  const btn = "rounded-lg px-2 py-1 text-sm hover:bg-stone-100";

  return (
    <div className="mt-3 border-t border-stone-100 pt-2">
      <div className="flex flex-wrap items-center gap-1">
        <button type="button" onClick={toggleLike} aria-pressed={liked}
          className={`${btn} ${liked ? "font-semibold text-emerald-700" : "text-stone-600"}`}>
          {liked ? "Liked" : "Like"} ({likes})
        </button>
        <button type="button" onClick={toggleComments} aria-expanded={open} className={`${btn} text-stone-600`}>
          Comments ({commentCount})
        </button>
        <button type="button" onClick={() => (uid ? setReporting(true) : needLogin())} className={`${btn} text-stone-500`}>
          Report
        </button>
      </div>

      {note && <p role="status" className="mt-2 text-sm text-stone-600">{note}</p>}

      {open && (
        <div className="mt-2 space-y-2">
          {comments === null && <p className="text-sm text-stone-500">Loading...</p>}
          {comments?.length === 0 && <p className="text-sm text-stone-500">No comments yet.</p>}
          {comments?.map((c) => (
            <div key={c.id} className={`rounded-lg bg-stone-50 p-2 text-sm ${c.parent_id ? "ml-6" : ""}`}>
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span className="font-medium text-stone-700">{nameOf(c)}</span>
                <span>
                  {timeAgo(c.created_at)}
                  {uid === c.author_id && (
                    <button type="button" onClick={() => removeComment(c.id)} className="ml-2 text-red-600">Delete</button>
                  )}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-line">{c.body}</p>
            </div>
          ))}
          <div className="flex gap-2">
            <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={1000} placeholder="Write a comment..."
              className="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-emerald-700" />
            <button type="button" onClick={addComment} disabled={busy || !draft.trim()}
              className="rounded-lg bg-emerald-700 px-3 py-2 text-sm text-white disabled:opacity-50">Post</button>
          </div>
        </div>
      )}

      {reporting && (
        <div role="dialog" aria-modal="true" aria-label="Report this post"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-xl bg-white p-5">
            <h2 className="text-lg font-semibold">Report this post</h2>
            <div className="mt-3 space-y-2">
              {REASONS.map(([id, label]) => (
                <label key={id} className="flex items-center gap-2 text-sm">
                  <input type="radio" name={`reason-${postId}`} checked={reason === id} onChange={() => setReason(id)} />
                  {label}
                </label>
              ))}
            </div>
            <textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={500} rows={3}
              placeholder="Tell us more (optional)" className="mt-3 w-full rounded-lg border border-stone-300 p-3 text-sm" />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setReporting(false)} className="rounded-lg border border-stone-300 px-4 py-2">Cancel</button>
              <button type="button" onClick={sendReport} disabled={busy} className="rounded-lg bg-red-600 px-4 py-2 text-white disabled:opacity-60">Submit report</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
