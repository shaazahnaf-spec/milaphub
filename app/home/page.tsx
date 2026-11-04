'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type City = { name: string; state: string }
type Profile = {
  id: string
  full_name: string | null
  username: string | null
  city_id: number | null
  is_verified_ngo: boolean
  cities: City | City[] | null
}
type Author = { full_name: string | null; username: string | null }
type Post = {
  id: string
  body: string | null
  category: string
  allow_tips: boolean
  status: string
  created_at: string
  profiles: Author | Author[] | null
}

const one = <T,>(v: T | T[] | null | undefined): T | null =>
  Array.isArray(v) ? (v[0] ?? null) : (v ?? null)

const TABS = ['Home', 'Reels', 'Matrimony', 'Bazaar', 'Pages']

const CATEGORIES = [
  { id: 'all', label: 'All posts', hint: 'Sab kuch dekho' },
  { id: 'news', label: 'Local stories', hint: 'Shehar ki khabrein aur kahaniyan' },
  { id: 'confession', label: 'Confessions', hint: 'Anonymous baatein' },
  { id: 'cooking', label: 'Cooking', hint: 'Recipes aur videos' },
  { id: 'campaign', label: 'Campaigns', hint: 'Verified NGO appeals' },
]

const TAB_INFO: Record<string, string> = {
  Reels: 'Chhote vertical videos yahan aayenge.',
  Matrimony: 'Verified rishton ka section yahan aayega.',
  Bazaar: 'Aapke shehar ka local buy and sell yahan aayega.',
  Pages: 'Creators aur businesses ke public pages yahan aayenge.',
}

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <span className="relative block h-9 w-9 rounded-full bg-[#0f5c5a]" aria-hidden="true">
        <span className="absolute left-[3px] top-[10px] h-4 w-4 rounded-full border-[3px] border-[#f0a500]" />
        <span className="absolute right-[3px] top-[10px] h-4 w-4 rounded-full border-[3px] border-white" />
      </span>
      <span className="text-xl font-extrabold tracking-tight text-[#12302f]">MilapHub</span>
    </div>
  )
}

function Avatar({ name, size = 40, gold = true }: { name: string; size?: number; gold?: boolean }) {
  return (
    <span
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className={`grid shrink-0 place-items-center rounded-full font-bold ${
        gold ? 'bg-[#f0a500] text-[#3a2900]' : 'bg-[#0f5c5a] text-white'
      }`}
    >
      {name.charAt(0).toUpperCase() || 'U'}
    </span>
  )
}

export default function HomePage() {
  const [supabase] = useState(() => createClient())
  const router = useRouter()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('Home')
  const [category, setCategory] = useState('all')
  const [menuOpen, setMenuOpen] = useState(false)
  const [body, setBody] = useState('')
  const [allowTips, setAllowTips] = useState(false)
  const [posting, setPosting] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  // 1. User aur profile load karo
  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, username, city_id, is_verified_ngo, cities(name, state)')
        .eq('id', user.id)
        .maybeSingle()
      if (!data?.username || !data.city_id) { router.replace('/onboarding'); return }
      if (!cancelled) {
        setProfile(data as unknown as Profile)
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [supabase, router])

  // 2. Posts load karo (city + category ke hisaab se)
  const loadPosts = useCallback(async () => {
    if (!profile?.city_id) return
    let q = supabase
      .from('posts')
      .select('id, body, category, allow_tips, status, created_at, profiles(full_name, username)')
      .eq('city_id', profile.city_id)
      .order('created_at', { ascending: false })
      .limit(30)
    if (category !== 'all') q = q.eq('category', category)
    const { data, error } = await q
    if (error) setError(error.message)
    else setPosts((data ?? []) as unknown as Post[])
  }, [supabase, profile, category])

  useEffect(() => { loadPosts() }, [loadPosts])

  // 3. Dropdown ke bahar click ya Escape dabane par band karo
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim() || !profile) return
    if (category === 'campaign' && !profile.is_verified_ngo) {
      return setError('Campaign sirf verified NGO post kar sakte hain.')
    }
    setPosting(true); setError(''); setMsg('')
    const cat = category === 'all' ? 'general' : category
    const { error } = await supabase.from('posts').insert({
      author_id: profile.id,
      city_id: profile.city_id,
      category: cat,
      body: body.trim(),
      allow_tips: cat === 'confession' ? false : allowTips,
    })
    setPosting(false)
    if (error) return setError(error.message)
    setBody('')
    setMsg('Post admin approval ke liye bhej di gayi. Approve hote hi sabko dikhegi.')
    loadPosts()
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
  }

  if (loading || !profile) {
    return (
      <div className="grid min-h-screen place-items-center bg-white font-semibold text-[#0f5c5a]">
        Loading MilapHub...
      </div>
    )
  }

  const city = one(profile.cities)
  const cityName = city?.name ?? 'your city'
  const name = profile.full_name ?? 'User'
  const current = CATEGORIES.find(c => c.id === category) ?? CATEGORIES[0]

  const tabClass = (t: string) =>
    `flex h-full items-center border-b-[3px] px-5 text-sm font-bold transition ${
      tab === t
        ? 'border-[#0f5c5a] text-[#0f5c5a]'
        : 'border-transparent text-[#5d7776] hover:bg-[#f3f7f6]'
    }`

  return (
    <div className="min-h-screen bg-white text-[#12302f]">
      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-[#e5eceb] bg-white/95 backdrop-blur">
        <div className="mx-auto grid h-16 max-w-[1280px] grid-cols-[1fr_auto] items-center gap-4 px-4 md:grid-cols-[1fr_auto_1fr]">
          <div className="flex items-center gap-4">
            <Logo />
            <input
              type="search"
              placeholder="Search MilapHub"
              aria-label="Search"
              className="hidden w-56 rounded-full bg-[#f3f7f6] px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f5c5a]/30 lg:block"
            />
          </div>
          <nav className="hidden h-full md:flex" aria-label="Main">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)} className={tabClass(t)}>{t}</button>
            ))}
          </nav>
          <div className="flex items-center justify-end gap-3">
            <button aria-label="Notifications" className="relative grid h-10 w-10 place-items-center rounded-full bg-[#f3f7f6] hover:bg-[#e3efee]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>
            </button>
            <Avatar name={name} />
          </div>
        </div>
        <nav className="flex overflow-x-auto border-t border-[#eef3f2] px-2 md:hidden" aria-label="Main mobile">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} className={tabClass(t) + ' h-11 flex-1 justify-center whitespace-nowrap px-3'}>{t}</button>
          ))}
        </nav>
      </header>

      <div className="mx-auto grid max-w-[1280px] gap-6 px-4 py-6 lg:grid-cols-[250px_minmax(0,1fr)_300px]">
        {/* LEFT SIDEBAR */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-1">
            <div className="mb-2 flex items-center gap-3 rounded-xl p-2">
              <Avatar name={name} />
              <div className="min-w-0">
                <p className="truncate font-bold leading-tight">{name}</p>
                <p className="truncate text-xs text-[#5d7776]">{cityName}{city ? `, ${city.state}` : ''}</p>
              </div>
            </div>
            {[
              ['Fr', 'Friends'], ['Pg', 'Pages'], ['Gr', 'Groups'], ['Sv', 'Saved posts'],
              ['Mt', 'Matrimony dashboard'], ['₹', 'Tips and payouts'], ['St', 'Settings'],
            ].map(([ic, label]) => (
              <button key={label} className="flex w-full items-center gap-3 rounded-xl p-2 text-left text-sm font-semibold hover:bg-[#f3f7f6]">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#e3efee] text-xs font-bold text-[#0f5c5a]">{ic}</span>
                {label}
              </button>
            ))}
            <button onClick={signOut} className="mt-3 w-full rounded-xl border border-[#f1d3cf] py-2 text-sm font-semibold text-[#c0392b] hover:bg-[#fdf3f2]">
              Sign out
            </button>
            <p className="px-2 pt-4 text-xs text-[#5d7776]">
              <Link href="/privacy" className="underline">Privacy</Link>{' '}
              <Link href="/terms" className="underline">Terms</Link>{' '}
              <Link href="/refund" className="underline">Refund</Link>
              <br />© 2026 MilapHub
            </p>
          </div>
        </aside>

        {/* CENTER */}
        <main className="min-w-0 space-y-5">
          {tab !== 'Home' ? (
            <div className="rounded-2xl border border-[#e5eceb] p-12 text-center">
              <h2 className="text-xl font-extrabold">{tab}</h2>
              <p className="mt-1 text-[#5d7776]">{TAB_INFO[tab]} Jald aa raha hai.</p>
            </div>
          ) : (
            <>
              {/* Composer */}
              <form onSubmit={submit} className="rounded-2xl border border-[#e5eceb] bg-white p-4 shadow-sm">
                <div className="flex gap-3">
                  <Avatar name={name} />
                  <textarea
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    maxLength={2000}
                    rows={2}
                    placeholder={`${name.split(' ')[0]}, apne shehar ke saath kuch share karo`}
                    className="w-full resize-none rounded-xl bg-[#f3f7f6] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#0f5c5a]/30"
                  />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-[#eef3f2] pt-3">
                  {/* Category dropdown */}
                  <div className="relative" ref={menuRef}>
                    <button
                      type="button"
                      aria-haspopup="menu"
                      aria-expanded={menuOpen}
                      onClick={() => setMenuOpen(o => !o)}
                      className="flex items-center gap-2 rounded-full border border-[#dbe5e4] bg-white px-4 py-2 text-sm font-semibold hover:bg-[#f3f7f6]"
                    >
                      <span className="text-[#5d7776]">Category</span>
                      <span className="text-[#0f5c5a]">{current.label}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={menuOpen ? 'rotate-180' : ''}><path d="m6 9 6 6 6-6" /></svg>
                    </button>
                    {menuOpen && (
                      <ul role="menu" className="absolute left-0 z-20 mt-2 w-72 overflow-hidden rounded-2xl border border-[#e5eceb] bg-white p-1.5 shadow-xl">
                        {CATEGORIES.map(c => (
                          <li key={c.id} role="none">
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => { setCategory(c.id); setMenuOpen(false) }}
                              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left hover:bg-[#f3f7f6] ${category === c.id ? 'bg-[#e3efee]' : ''}`}
                            >
                              <span>
                                <span className="block text-sm font-bold">{c.label}</span>
                                <span className="block text-xs text-[#5d7776]">{c.hint}</span>
                              </span>
                              {category === c.id && <span className="font-bold text-[#0f5c5a]">✓</span>}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {category !== 'confession' && (
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                      <input type="checkbox" checked={allowTips} onChange={e => setAllowTips(e.target.checked)} className="h-4 w-4 accent-[#0f5c5a]" />
                      {category === 'campaign' ? 'Donations allow karo' : 'Tips allow karo'}
                    </label>
                  )}

                  <button
                    disabled={posting || !body.trim()}
                    className="ml-auto rounded-full bg-[#0f5c5a] px-6 py-2 text-sm font-bold text-white transition hover:bg-[#0b4846] disabled:opacity-50"
                  >
                    {posting ? 'Bhej rahe hain...' : 'Post'}
                  </button>
                </div>
                {msg && <p className="mt-3 text-sm font-medium text-[#0f5c5a]">{msg}</p>}
                {error && <p role="alert" className="mt-3 text-sm font-medium text-[#c0392b]">{error}</p>}
              </form>

              {/* Feed */}
              {posts.length === 0 ? (
                <div className="rounded-2xl border border-[#e5eceb] p-10 text-center text-[#5d7776]">
                  {cityName} mein abhi koi post nahi hai. Pehli post tum karo!
                </div>
              ) : (
                posts.map(p => {
                  const a = one(p.profiles)
                  const anon = p.category === 'confession'
                  const author = anon ? 'Anonymous' : a?.full_name ?? 'MilapHub user'
                  return (
                    <article key={p.id} className="rounded-2xl border border-[#e5eceb] bg-white p-4 shadow-sm">
                      <div className="flex items-center gap-3">
                        <Avatar name={author} />
                        <div className="min-w-0">
                          <p className="truncate font-bold leading-tight">{author}</p>
                          <p className="text-xs text-[#5d7776]">
                            {anon ? '' : `@${a?.username ?? 'user'} · `}
                            {new Date(p.created_at).toLocaleDateString('en-IN')}
                          </p>
                        </div>
                        <div className="ml-auto flex items-center gap-2">
                          {p.status === 'pending' && (
                            <span className="rounded-full bg-[#fff4d6] px-3 py-1 text-xs font-bold text-[#7a5600]">Pending approval</span>
                          )}
                          {p.status === 'rejected' && (
                            <span className="rounded-full bg-[#fdecea] px-3 py-1 text-xs font-bold text-[#c0392b]">Rejected</span>
                          )}
                          {p.category !== 'general' && (
                            <span className="rounded-full bg-[#e3efee] px-3 py-1 text-xs font-bold text-[#0f5c5a]">
                              {CATEGORIES.find(c => c.id === p.category)?.label ?? p.category}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed">{p.body}</p>
                      <div className="mt-3 flex items-center gap-2 border-t border-[#eef3f2] pt-2 text-sm font-semibold text-[#5d7776]">
                        <button className="flex-1 rounded-lg py-2 hover:bg-[#f3f7f6]">Like</button>
                        <button className="flex-1 rounded-lg py-2 hover:bg-[#f3f7f6]">Comment</button>
                        {p.allow_tips && p.status === 'approved' && (
                          <button
                            onClick={() => setMsg('Tips jald aa rahe hain. Razorpay jodna baaki hai.')}
                            className="flex-1 rounded-lg bg-[#f0a500] py-2 font-bold text-[#3a2900] hover:brightness-105"
                          >
                            {p.category === 'campaign' ? 'Donate' : 'Send tip'}
                          </button>
                        )}
                      </div>
                    </article>
                  )
                })
              )}
            </>
          )}
        </main>

        {/* RIGHT SIDEBAR */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-4">
            <section className="rounded-2xl border border-[#e5eceb] p-4">
              <h3 className="mb-2 text-sm font-extrabold">Friend requests</h3>
              <p className="text-sm text-[#5d7776]">Abhi koi request nahi hai.</p>
            </section>
            <section className="rounded-2xl border border-[#e5eceb] p-4">
              <h3 className="mb-2 text-sm font-extrabold">Friends online</h3>
              <p className="text-sm text-[#5d7776]">Friends add karne par yahan dikhenge. Chat sirf friends ke saath hoti hai.</p>
            </section>
            <section className="rounded-2xl border border-[#e5eceb] p-4">
              <h3 className="mb-2 text-sm font-extrabold">Emergency alerts</h3>
              <div className="border-l-4 border-[#c0392b] pl-3">
                <p className="text-sm font-bold">O-negative blood chahiye</p>
                <p className="text-xs text-[#5d7776]">Gandhi Hospital · Verified</p>
              </div>
            </section>
          </div>
        </aside>
      </div>
    </div>
  )
}
