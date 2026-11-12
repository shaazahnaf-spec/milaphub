"use client";

// Route: /pages   (the header "Pages" tab should link here)

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import BazaarHeader from "@/components/BazaarHeader";
import { PAGE_CATEGORIES, INDIAN_STATES } from "@/lib/pages/config";
import PageCard from "@/components/pages/PageCard";

const FIELDS = "id,username,name,category,subcategory,city,state,avatar_url,is_verified,followers_count";
const PAGE_SIZE = 20;
const TABS = [
  { id: "discover", label: "Discover" },
  { id: "following", label: "Following" },
  { id: "mine", label: "My pages" },
];

// Removes characters that break PostgREST's .or() filter syntax.
const cleanSearch = (s) => s.replace(/[,()%*\\]/g, " ").trim();

function PagesDirectoryBody() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("discover");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [items, setItems] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
  }, []);

  const fetchPage = useCallback(async (offset) => {
    const from = offset;
    const to = offset + PAGE_SIZE - 1;

    if (tab === "following" || tab === "mine") {
      if (!user) return { rows: [], more: false };
      const q2 = tab === "following"
        ? supabase.from("page_follows").select(`pages(${FIELDS})`).eq("user_id", user.id)
        : supabase.from("page_admins").select(`pages(${FIELDS})`).eq("user_id", user.id);
      const { data, error: e } = await q2.range(from, to);
      if (e) throw e;
      const rows = (data || []).map((r) => r.pages).filter(Boolean);
      return { rows, more: (data || []).length === PAGE_SIZE };
    }

    let query = supabase.from("pages").select(FIELDS)
      .order("is_verified", { ascending: false })
      .order("followers_count", { ascending: false })
      .range(from, to);
    if (category) query = query.eq("category", category);
    if (state) query = query.eq("state", state);
    if (city.trim()) query = query.ilike("city", `%${cleanSearch(city)}%`);
    const term = cleanSearch(q);
    if (term) query = query.or(`name.ilike.%${term}%,username.ilike.%${term}%,subcategory.ilike.%${term}%`);
    const { data, error: e } = await query;
    if (e) throw e;
    return { rows: data || [], more: (data || []).length === PAGE_SIZE };
  }, [tab, user, q, category, state, city]);

  // Reload from the start whenever the tab or filters change (small debounce for typing).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    const t = setTimeout(async () => {
      try {
        const { rows, more } = await fetchPage(0);
        if (!cancelled) { setItems(rows); setHasMore(more); }
      } catch (e) {
        if (!cancelled) setError("Pages load nahi ho paye. Dobara koshish kijiye.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [fetchPage]);

  async function loadMore() {
    try {
      const { rows, more } = await fetchPage(items.length);
      setItems((prev) => [...prev, ...rows]);
      setHasMore(more);
    } catch {
      setError("Aur pages load nahi ho paye.");
    }
  }

  const field = "rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-700";

  return (
    <main className="mx-auto max-w-2xl p-4 sm:p-6">
      <div className="flex items-center justify-end">
        <Link href="/pages/new" className="rounded-lg bg-emerald-700 px-4 py-2 text-sm text-white">
          Page banaiye
        </Link>
      </div>

      <div role="tablist" className="mt-4 flex gap-1 border-b border-stone-200">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm ${tab === t.id ? "border-b-2 border-emerald-700 font-medium" : "text-stone-500"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "discover" && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <input className={`${field} sm:col-span-2`} placeholder="Naam, @username ya kaam se dhoondhiye (jaise salon, mobile repair)"
            value={q} onChange={(e) => setQ(e.target.value)} />
          <select className={field} value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Sab categories</option>
            {PAGE_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <select className={field} value={state} onChange={(e) => setState(e.target.value)}>
            <option value="">Poora India</option>
            {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input className={`${field} sm:col-span-2`} placeholder="City ya town (optional)" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
      )}

      <section className="mt-4 space-y-3" aria-live="polite">
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {loading && <p className="text-stone-500">Loading...</p>}

        {!loading && !error && (tab === "following" || tab === "mine") && !user && (
          <p className="rounded-lg bg-stone-50 p-4">
            Yeh dekhne ke liye <Link href="/login?next=/pages" className="text-emerald-700 underline">login kijiye</Link>.
          </p>
        )}

        {!loading && !error && user && items.length === 0 && (
          <p className="rounded-lg bg-stone-50 p-4 text-stone-600">
            {tab === "following" && "Aap abhi kisi page ko follow nahi kar rahe. Discover mein se kuch chuniye."}
            {tab === "mine" && "Aapne abhi koi page nahi banaya."}
            {tab === "discover" && "Is filter par koi page nahi mila. Filter badal ke dekhiye."}
          </p>
        )}
        {!loading && !error && !user && tab === "discover" && items.length === 0 && (
          <p className="rounded-lg bg-stone-50 p-4 text-stone-600">Is filter par koi page nahi mila.</p>
        )}

        {items.map((p) => <PageCard key={p.id} page={p} />)}

        {hasMore && !loading && (
          <button onClick={loadMore} className="w-full rounded-lg border border-stone-300 py-2 text-sm">
            Aur dikhaiye
          </button>
        )}
      </section>
    </main>
  );
}

export default function PagesDirectory() {
  return (
    <>
      <BazaarHeader title="Pages" />
      <PagesDirectoryBody />
    </>
  );
}
