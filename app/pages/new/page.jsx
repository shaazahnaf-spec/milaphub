"use client";

// Route: /pages/new

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  PAGE_CATEGORIES, SUBCATEGORIES, INDIAN_STATES, CITY_SUGGESTIONS,
  MAX_PAGES_PER_ACCOUNT, USERNAME_RE, MAX_IMAGE_MB,
  suggestUsername, cleanPhone, uploadPageImage,
} from "@/lib/pages/config";

const STEPS = ["Category", "Details", "Location", "Photos", "About"];

export default function NewPageWizard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [pageCount, setPageCount] = useState(0);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [usernameState, setUsernameState] = useState("idle"); // idle | checking | ok | taken | invalid
  const usernameEdited = useRef(false);

  const [f, setF] = useState({
    category: "", subcategory: "", name: "", username: "", bio: "",
    state: "", city: "", address: "",
    avatar: null, cover: null, about: "", phone: "",
  });
  const set = (patch) => setF((x) => ({ ...x, ...patch }));

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user ?? null);
      if (data.user) {
        const { count } = await supabase.from("pages").select("id", { count: "exact", head: true }).eq("owner_id", data.user.id);
        setPageCount(count || 0);
      }
      setChecking(false);
    })();
  }, []);

  // Check username availability (debounced)
  useEffect(() => {
    const u = f.username;
    if (!u) return setUsernameState("idle");
    if (!USERNAME_RE.test(u)) return setUsernameState("invalid");
    setUsernameState("checking");
    const t = setTimeout(async () => {
      const { data, error: e } = await supabase.rpc("username_available", { p_username: u });
      setUsernameState(e ? "idle" : data ? "ok" : "taken");
    }, 400);
    return () => clearTimeout(t);
  }, [f.username]);

  function onName(name) {
    set({ name, ...(usernameEdited.current ? {} : { username: suggestUsername(name) }) });
  }

  function validate() {
    if (step === 0 && !f.category) return "Category chuniye.";
    if (step === 1) {
      if (f.name.trim().length < 2) return "Page ka naam kam se kam 2 akshar ka ho.";
      if (!f.subcategory) return "Sub-category chuniye.";
      if (!USERNAME_RE.test(f.username)) return "Username 3 se 30 characters ka ho: sirf a-z, 0-9 aur _.";
      if (usernameState === "taken") return "Yeh username pehle se liya hua ya reserved hai. Doosra chuniye.";
      if (usernameState === "checking") return "Username check ho raha hai, ek second ruko.";
    }
    if (step === 2) {
      if (!f.state) return "State chuniye.";
      if (f.city.trim().length < 2) return "City ya town likhiye.";
    }
    if (step === 4 && f.phone.trim() && !cleanPhone(f.phone)) return "Sahi 10 digit mobile number daaliye ya khaali chhod dijiye.";
    return "";
  }

  function next() {
    const m = validate();
    if (m) return setError(m);
    setError("");
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function submit() {
    const m = validate();
    if (m) return setError(m);
    setBusy(true);
    setError("");
    try {
      const [avatarUrl, coverUrl] = await Promise.all([
        uploadPageImage(supabase, user.id, f.avatar, "avatar"),
        uploadPageImage(supabase, user.id, f.cover, "cover"),
      ]);
      const { data: page, error: e } = await supabase.from("pages").insert({
        owner_id: user.id,
        username: f.username,
        name: f.name.trim(),
        category: f.category,
        subcategory: f.subcategory,
        bio: f.bio.trim() || null,
        about: f.about.trim() || null,
        state: f.state,
        city: f.city.trim(),
        address: f.address.trim() || null,
        avatar_url: avatarUrl,
        cover_url: coverUrl,
      }).select("id, username").single();

      if (e) {
        if (e.message?.includes("USERNAME_RESERVED")) throw new Error("Yeh username reserved hai. Doosra chuniye.");
        if (e.message?.includes("PAGE_LIMIT")) throw new Error(`Ek account par maximum ${MAX_PAGES_PER_ACCOUNT} pages ban sakte hain.`);
        if (e.code === "23505") throw new Error("Yeh username kisi ne le liya. Doosra chuniye.");
        throw e;
      }

      const phone = cleanPhone(f.phone);
      if (phone) await supabase.from("page_contacts").insert({ page_id: page.id, phone });

      router.push(`/pages/${page.username}`);
    } catch (err) {
      setError(err.message || "Page nahi ban paya. Dobara koshish kijiye.");
      setBusy(false);
    }
  }

  if (checking) return <p className="p-6 text-stone-500">Loading...</p>;

  if (!user) {
    return (
      <main className="mx-auto max-w-xl p-6">
        <h1 className="text-2xl font-semibold">Page banane ke liye login kijiye</h1>
        <Link href="/login?next=/pages/new" className="mt-4 inline-block rounded-lg bg-emerald-700 px-4 py-2 text-white">Login</Link>
      </main>
    );
  }

  if (pageCount >= MAX_PAGES_PER_ACCOUNT) {
    return (
      <main className="mx-auto max-w-xl p-6">
        <h1 className="text-2xl font-semibold">Page limit poori ho gayi</h1>
        <p className="mt-2 text-stone-600">Ek account par maximum {MAX_PAGES_PER_ACCOUNT} pages ban sakte hain.</p>
        <Link href="/pages" className="mt-4 inline-block text-emerald-700 underline">Apne pages dekhiye</Link>
      </main>
    );
  }

  const cities = CITY_SUGGESTIONS[f.state] || [];
  const input = "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20";
  const hint = { idle: "", checking: "Check ho raha hai...", ok: "Available hai", taken: "Yeh available nahi hai", invalid: "Sirf a-z, 0-9 aur _ (3 se 30 characters)" }[usernameState];

  return (
    <main className="mx-auto max-w-xl p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">Apna Page banaiye</h1>
      <p className="mt-1 text-sm text-stone-500">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
      <div className="mt-3 h-1.5 w-full rounded bg-stone-200" aria-hidden="true">
        <div className="h-1.5 rounded bg-emerald-700 transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
      </div>

      <section className="mt-6 space-y-4">
        {step === 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {PAGE_CATEGORIES.map((c) => (
              <button key={c.id} type="button" aria-pressed={f.category === c.id}
                onClick={() => set({ category: c.id, subcategory: "" })}
                className={`rounded-xl border p-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700 ${f.category === c.id ? "border-emerald-700 bg-emerald-50" : "border-stone-300 bg-white hover:border-stone-400"}`}>
                <div className="font-medium">{c.label}</div>
                <div className="mt-1 text-sm text-stone-500">{c.hint}</div>
              </button>
            ))}
          </div>
        )}

        {step === 1 && (
          <>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Page ka naam</span>
              <input className={input} maxLength={80} value={f.name} onChange={(e) => onName(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Username</span>
              <div className="flex items-center rounded-lg border border-stone-300 bg-white focus-within:border-emerald-700">
                <span className="pl-3 text-stone-500">@</span>
                <input className="w-full rounded-lg bg-transparent px-2 py-2 outline-none" maxLength={30} value={f.username}
                  onChange={(e) => { usernameEdited.current = true; set({ username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") }); }} />
              </div>
              <span className={`mt-1 block text-xs ${usernameState === "ok" ? "text-emerald-700" : usernameState === "taken" || usernameState === "invalid" ? "text-red-700" : "text-stone-500"}`}>{hint}</span>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Sub-category</span>
              <select className={input} value={f.subcategory} onChange={(e) => set({ subcategory: e.target.value })}>
                <option value="">Chuniye</option>
                {(SUBCATEGORIES[f.category] || []).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Choti bio (optional)</span>
              <textarea className={input} rows={3} maxLength={300} value={f.bio} onChange={(e) => set({ bio: e.target.value })} />
              <span className="mt-1 block text-right text-xs text-stone-500">{f.bio.length}/300</span>
            </label>
          </>
        )}

        {step === 2 && (
          <>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">State</span>
              <select className={input} value={f.state} onChange={(e) => set({ state: e.target.value, city: "" })}>
                <option value="">Chuniye</option>
                {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">City / Town</span>
              <input className={input} list="city-list" value={f.city} onChange={(e) => set({ city: e.target.value })} />
              <datalist id="city-list">{cities.map((c) => <option key={c} value={c} />)}</datalist>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Area / Address (optional)</span>
              <input className={input} maxLength={200} value={f.address} onChange={(e) => set({ address: e.target.value })} />
            </label>
          </>
        )}

        {step === 3 && (
          <>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Profile photo / logo</span>
              <input type="file" accept="image/*" onChange={(e) => set({ avatar: e.target.files?.[0] || null })} />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Cover photo</span>
              <input type="file" accept="image/*" onChange={(e) => set({ cover: e.target.files?.[0] || null })} />
            </label>
            <p className="text-sm text-stone-500">Har photo max {MAX_IMAGE_MB}MB. Baad mein bhi badal sakte hain.</p>
          </>
        )}

        {step === 4 && (
          <>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">About (optional)</span>
              <textarea className={input} rows={5} maxLength={3000} value={f.about}
                onChange={(e) => set({ about: e.target.value })} placeholder="Aap kya karte hain, timing, kya milta hai..." />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Phone number (optional)</span>
              <input className={input} inputMode="numeric" value={f.phone} onChange={(e) => set({ phone: e.target.value })} />
              <span className="mt-1 block text-xs text-stone-500">Number sirf "Show number" dabane par, login kiye hue users ko dikhega.</span>
            </label>
          </>
        )}
      </section>

      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="mt-6 flex justify-between">
        <button type="button" disabled={step === 0 || busy} onClick={() => { setError(""); setStep((s) => Math.max(s - 1, 0)); }}
          className="rounded-lg border border-stone-300 px-4 py-2 disabled:opacity-40">Back</button>
        {step < STEPS.length - 1 ? (
          <button type="button" onClick={next} className="rounded-lg bg-emerald-700 px-5 py-2 text-white">Continue</button>
        ) : (
          <button type="button" onClick={submit} disabled={busy} className="rounded-lg bg-emerald-700 px-5 py-2 text-white disabled:opacity-60">
            {busy ? "Page ban raha hai..." : "Page banaiye"}
          </button>
        )}
      </div>
    </main>
  );
}
