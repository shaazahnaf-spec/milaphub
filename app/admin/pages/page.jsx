"use client";

// Route: /admin/pages
// Access is enforced by the database (is_site_admin()). This screen only hides itself for non-admins.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import BazaarHeader from "@/components/BazaarHeader";

const cleanSearch = (s) => s.replace(/[,()%*\\]/g, " ").trim();
const FIELDS = "id,username,name,category,city,state,is_verified,is_hidden,followers_count,created_at";

function AdminPagesBody() {
  const [ok, setOk] = useState(null); // null = checking
  const [tab, setTab] = useState("reports");
  const [reports, setReports] = useState([]);
  const [pages, setPages] = useState([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.rpc("is_site_admin").then(({ data }) => setOk(!!data));
  }, []);

  const loadReports = useCallback(async () => {
    const { data, error: e } = await supabase.from("page_reports")
      .select(`id,reason,details,status,created_at,pages(id,username,name,is_hidden)`)
      .eq("status", "open").order("created_at", { ascending: true }).limit(100);
    if (e) setError("Reports load nahi hui."); else setReports(data || []);
  }, []);

  const loadPages = useCallback(async () => {
    let query = supabase.from("pages").select(FIELDS).order("created_at", { ascending: false }).limit(50);
    const term = cleanSearch(q);
    if (term) query = query.or(`name.ilike.%${term}%,username.ilike.%${term}%`);
    const { data, error: e } = await query;
    if (e) setError("Pages load nahi hue."); else setPages(data || []);
  }, [q]);

  useEffect(() => { if (ok) loadReports(); }, [ok, loadReports]);
  useEffect(() => {
    if (!ok || tab !== "pages") return;
    const t = setTimeout(loadPages, 250);
    return () => clearTimeout(t);
  }, [ok, tab, loadPages]);

  async function patchPage(id, patch) {
    setError("");
    const { error: e } = await supabase.from("pages").update(patch).eq("id", id);
    if (e) return setError("Update nahi hua.");
    loadPages(); loadReports();
  }

  async function deletePage(p) {
    if (!confirm(`@${p.username} ko hamesha ke liye delete karein? Uski saari posts bhi hat jayengi.`)) return;
    const { error: e } = await supabase.from("pages").delete().eq("id", p.id);
    if (e) return setError("Delete nahi hua.");
    loadPages(); loadReports();
  }

  async function resolve(id) {
    const { error: e } = await supabase.from("page_reports").update({ status: "resolved" }).eq("id", id);
    if (e) return setError("Report resolve nahi hui.");
    setReports((r) => r.filter((x) => x.id !== id));
  }

  if (ok === null) return <p className="p-6 text-stone-500">Loading...</p>;
  if (!ok) return <p className="p-6">Yeh page sirf admins ke liye hai.</p>;

  const btn = "rounded-lg border border-stone-300 px-3 py-1.5 text-sm";

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">Pages admin</h1>
      <p className="mt-1 text-sm text-stone-500">
        "Verified Local" tabhi dijiye jab dukaan ka proof dekha ho (dukaan ki photo, GST, ya NGO ka 12A/80G).
      </p>

      <div role="tablist" className="mt-4 flex gap-1 border-b border-stone-200">
        {[["reports", `Open reports (${reports.length})`], ["pages", "All pages"]].map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={`px-4 py-2 text-sm ${tab === id ? "border-b-2 border-emerald-700 font-medium" : "text-stone-500"}`}>{label}</button>
        ))}
      </div>

      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {tab === "reports" && (
        <section className="mt-4 space-y-3">
          {reports.length === 0 && <p className="rounded-lg bg-stone-50 p-4 text-stone-600">Koi open report nahi hai.</p>}
          {reports.map((r) => (
            <article key={r.id} className="rounded-xl border border-stone-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  {r.pages
                    ? <Link href={`/pages/${r.pages.username}`} className="font-medium text-emerald-700 underline">{r.pages.name} (@{r.pages.username})</Link>
                    : <span className="text-stone-500">Page hat chuka hai</span>}
                  <div className="text-sm text-stone-600">Wajah: {r.reason}</div>
                </div>
                <div className="flex gap-2">
                  {r.pages && (
                    <button className={btn} onClick={() => patchPage(r.pages.id, { is_hidden: !r.pages.is_hidden })}>
                      {r.pages.is_hidden ? "Unhide" : "Hide page"}
                    </button>
                  )}
                  <button className={btn} onClick={() => resolve(r.id)}>Resolve</button>
                </div>
              </div>
              {r.details && <p className="mt-2 text-sm text-stone-700">{r.details}</p>}
            </article>
          ))}
        </section>
      )}

      {tab === "pages" && (
        <section className="mt-4 space-y-3">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Naam ya @username dhoondhiye"
            className="w-full rounded-lg border border-stone-300 px-3 py-2" />
          {pages.map((p) => (
            <article key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white p-4">
              <div>
                <Link href={`/pages/${p.username}`} className="font-medium text-emerald-700 underline">{p.name}</Link>
                <div className="text-sm text-stone-500">@{p.username} - {p.category} - {p.city}, {p.state} - {p.followers_count} followers</div>
                <div className="mt-1 flex gap-2 text-xs">
                  {p.is_verified && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800">Verified</span>}
                  {p.is_hidden && <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-800">Hidden</span>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className={btn} onClick={() => patchPage(p.id, { is_verified: !p.is_verified })}>{p.is_verified ? "Remove badge" : "Verify"}</button>
                <button className={btn} onClick={() => patchPage(p.id, { is_hidden: !p.is_hidden })}>{p.is_hidden ? "Unhide" : "Hide"}</button>
                <button className={`${btn} text-red-700`} onClick={() => deletePage(p)}>Delete</button>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

export default function AdminPages() {
  return (
    <>
      <BazaarHeader title="Pages admin" />
      <AdminPagesBody />
    </>
  );
}
