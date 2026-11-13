// FILE: app/bazaar/BazaarClient.tsx  (the logged-in Bazaar, moved here from page.tsx)
'use client'

import { Fragment, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BazaarHeader from '@/components/BazaarHeader'
import AdSlot from '@/components/AdSlot'
import PublicJoinBanner from '@/components/PublicJoinBanner'
import PublicServiceBar from '@/components/PublicServiceBar'
import { useAds, BAZAAR_SLOTS } from '@/lib/useAds'
import { CATEGORIES, STATUS, categoryLabel, one, priceLabel, type Listing } from '@/lib/bazaar'

type View = 'browse' | 'saved' | 'mine'
type TypeFilter = 'all' | 'sell' | 'wanted'

const SELECT =
  'id, seller_id, city_id, title, price, category, condition, locality, image_urls, status, reject_reason, listing_type'

export default function BazaarClient() {
  const [supabase] = useState(() => createClient())
  const router = useRouter()
  const [me, setMe] = useState<string | null>(null)
  const [cityId, setCityId] = useState<number | null>(null)
  const [cityName, setCityName] = useState('your city')
  const [cities, setCities] = useState<{ id: number; name: string; state: string }[]>([])
  const [view, setView] = useState<View>('browse')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [category, setCategory] = useState('all')
  const [q, setQ] = useState('')
  const [term, setTerm] = useState('')
  const [items, setItems] = useState<Listing[]>([])
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { ads } = useAds(supabase, BAZAAR_SLOTS)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        // Visitor: browse publicly. City = ?city=ID in the link, the last choice, or Hyderabad.
        const { data: cs } = await supabase.from('cities').select('id, name, state').order('name')
        const list = (cs ?? []) as { id: number; name: string; state: string }[]
        setCities(list)
        let chosen: number | null = null
        try {
          const fromUrl = Number(new URLSearchParams(window.location.search).get('city'))
          const fromStore = Number(window.localStorage.getItem('milaphub-city'))
          chosen = [fromUrl, fromStore].find(n => Number.isInteger(n) && n > 0 && list.some(c => c.id === n)) ?? null
        } catch { /* storage blocked */ }
        const pick = list.find(c => c.id === chosen) ?? list.find(c => c.name.toLowerCase() === 'hyderabad') ?? list[0]
        if (pick) { setCityId(pick.id); setCityName(pick.name) }
        else { setLoading(false); setError('City list load nahi ho payi.') }
        return
      }
      const { data } = await supabase
        .from('profiles').select('city_id, cities(name)').eq('id', user.id).maybeSingle()
      if (!data?.city_id) { router.replace('/onboarding'); return }
      setMe(user.id)
      setCityId(data.city_id as number)
      const c = one((data as unknown as { cities: { name: string } | { name: string }[] | null }).cities)
      if (c) setCityName(c.name)
      const { data: sv } = await supabase.from('saved_listings').select('listing_id').eq('user_id', user.id)
      setSaved(new Set((sv ?? []).map(r => r.listing_id as string)))
    }
    init()
  }, [supabase, router])

  useEffect(() => {
    const t = setTimeout(() => setTerm(q.trim().replace(/[%,()*]/g, ' ').trim()), 300)
    return () => clearTimeout(t)
  }, [q])

  const load = useCallback(async () => {
    if (!cityId) return
    setLoading(true); setError('')

    if (view === 'saved') {
      if (!me) { setLoading(false); return }
      const { data: sv, error: e1 } = await supabase
        .from('saved_listings').select('listing_id').eq('user_id', me).order('created_at', { ascending: false })
      if (e1) { setLoading(false); return setError(e1.message) }
      const ids = (sv ?? []).map(r => r.listing_id as string)
      if (ids.length === 0) { setItems([]); setLoading(false); return }
      const { data, error } = await supabase.from('listings').select(SELECT).in('id', ids).eq('status', 'approved')
      setLoading(false)
      if (error) return setError(error.message)
      const rows = (data ?? []) as unknown as Listing[]
      setItems(ids.map(id => rows.find(r => r.id === id)).filter((r): r is Listing => !!r))
      return
    }

    let query = supabase.from('listings').select(SELECT)
    if (view === 'mine') {
      query = query.eq('seller_id', me as string)
    } else {
      query = query.eq('city_id', cityId).eq('status', 'approved').gt('expires_at', new Date().toISOString())
      if (typeFilter !== 'all') query = query.eq('listing_type', typeFilter)
      if (category !== 'all') query = query.eq('category', category)
      if (term) query = query.ilike('title', `%${term}%`)
    }
    const { data, error } = await query.order('created_at', { ascending: false }).limit(60)
    setLoading(false)
    if (error) return setError(error.message)
    setItems((data ?? []) as unknown as Listing[])
  }, [supabase, me, cityId, view, typeFilter, category, term])

  useEffect(() => { load() }, [load])

  async function toggleSave(id: string) {
    if (!me) { router.push('/login'); return }
    const isSaved = saved.has(id)
    setSaved(prev => {
      const n = new Set(prev)
      if (isSaved) n.delete(id); else n.add(id)
      return n
    })
    const { error } = isSaved
      ? await supabase.from('saved_listings').delete().eq('user_id', me).eq('listing_id', id)
      : await supabase.from('saved_listings').insert({ user_id: me, listing_id: id })
    if (error) {
      setError(error.message)
      setSaved(prev => {
        const n = new Set(prev)
        if (isSaved) n.add(id); else n.delete(id)
        return n
      })
    } else if (view === 'saved' && isSaved) {
      setItems(list => list.filter(l => l.id !== id))
    }
  }

  function changeCity(id: number) {
    const c = cities.find(x => x.id === id)
    if (!c) return
    setCityId(c.id)
    setCityName(c.name)
    try {
      window.localStorage.setItem('milaphub-city', String(c.id))
      window.history.replaceState(null, '', `/bazaar?city=${c.id}`)
    } catch { /* ignore */ }
  }

  const tab = (v: View, label: string) => (
    <button
      onClick={() => setView(v)}
      aria-pressed={view === v}
      className={`rounded-full px-5 py-2 text-sm font-bold ${view === v ? 'bg-[#0f5c5a] text-white' : 'bg-[#f3f7f6] hover:bg-[#e3efee]'}`}
    >
      {label}
    </button>
  )

  const seg = (v: TypeFilter, label: string) => (
    <button
      key={v}
      onClick={() => setTypeFilter(v)}
      aria-pressed={typeFilter === v}
      className={`flex-1 px-4 py-2 text-sm font-bold ${typeFilter === v ? 'bg-[#12302f] text-white' : 'bg-white hover:bg-[#f3f7f6]'}`}
    >
      {label}
    </button>
  )

  return (
    <div className="min-h-screen bg-white text-[#12302f]">
      <BazaarHeader title="Bazaar">
        <Link href="/bazaar/new" className="rounded-full bg-[#f0a500] px-5 py-2 text-sm font-bold text-[#3a2900] hover:brightness-105">
          Sell or request
        </Link>
        {me ? (
          <Link href="/home" className="hidden rounded-full border border-[#dbe5e4] px-4 py-2 text-sm font-semibold hover:bg-[#f3f7f6] sm:block">
            Back to home
          </Link>
        ) : (
          <Link href="/login" className="rounded-full border border-[#dbe5e4] px-4 py-2 text-sm font-semibold hover:bg-[#f3f7f6]">
            Log in
          </Link>
        )}
      </BazaarHeader>
      {!me && <PublicServiceBar current="/bazaar" />}

      <div className="mx-auto max-w-[1400px] px-4 py-5 xl:grid xl:grid-cols-[200px_minmax(0,1fr)_200px] xl:gap-6">
        {/* Left skyscraper ad (large desktop only) */}
        <aside className="hidden xl:block">
          <div className="sticky top-6">
            <AdSlot ads={ads.bazaar_side_left} cityName={cityName} imgClass="aspect-[3/5]" boxClass="min-h-[0px]" />
          </div>
        </aside>

        <main className="mx-auto w-full max-w-5xl space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {tab('browse', `Buy in ${cityName}`)}
            {me && tab('saved', `Saved items${saved.size ? ` (${saved.size})` : ''}`)}
            {me && tab('mine', 'My listings')}
            {!me && cities.length > 0 && (
              <label className="ml-auto flex items-center gap-2 text-sm font-semibold">
                <span>City</span>
                <select
                  value={cityId ?? ''}
                  onChange={e => changeCity(Number(e.target.value))}
                  className="rounded-full border border-[#dbe5e4] bg-white px-4 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-[#0f5c5a]/30"
                >
                  {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
            )}
          </div>

          {view === 'browse' && (
            <>
              <AdSlot ads={ads.bazaar_top} cityName={cityName} imgClass="aspect-[4/1]" boxClass="min-h-[0px]" />

              <div className="flex overflow-hidden rounded-full border border-[#dbe5e4]" role="group" aria-label="Listing type">
                {seg('all', 'All')}
                {seg('sell', 'For Sale')}
                {seg('wanted', 'Wanted / Requirements')}
              </div>

              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Search in Bazaar"
                aria-label="Search listings"
                className="w-full rounded-full bg-[#f3f7f6] px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-[#0f5c5a]/30"
              />
              <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Categories">
                {[{ id: 'all', label: 'All categories' }, ...CATEGORIES].map(c => (
                  <button
                    key={c.id}
                    onClick={() => setCategory(c.id)}
                    aria-pressed={category === c.id}
                    className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold ${category === c.id ? 'border-[#0f5c5a] bg-[#0f5c5a] text-white' : 'border-[#dbe5e4] hover:bg-[#f3f7f6]'}`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {error && <p role="alert" className="text-sm font-medium text-[#c0392b]">{error}</p>}

          {loading ? (
            <p className="py-10 text-center text-[#5d7776]">Loading...</p>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-[#e5eceb] p-10 text-center text-[#5d7776]">
              {view === 'mine' && 'You have not listed anything yet.'}
              {view === 'saved' && 'Nothing saved yet. Tap the heart on any listing to keep it here.'}
              {view === 'browse' && `Nothing here yet in ${cityName}. Be the first to list or request something!`}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {items.map((l, i) => {
                const isSaved = saved.has(l.id)
                const wanted = l.listing_type === 'wanted'
                return (
                  <Fragment key={l.id}>
                    <div className="relative overflow-hidden rounded-2xl border border-[#e5eceb] bg-white shadow-sm transition hover:shadow-md">
                      <Link href={`/bazaar/${l.id}`} className="block">
                        <div className="aspect-square bg-[#f3f7f6]">
                          {l.image_urls[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={l.image_urls[0]} alt="" loading="lazy" className="h-full w-full object-cover" />
                          ) : (
                            <div className="grid h-full place-items-center p-3 text-center text-sm font-bold text-[#5d7776]">
                              Looking for<br />{categoryLabel(l.category)}
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="font-extrabold">{priceLabel(l.listing_type, l.price)}</p>
                          <p className="line-clamp-2 text-sm">{l.title}</p>
                          <p className="mt-1 truncate text-xs text-[#5d7776]">
                            {[l.locality, categoryLabel(l.category)].filter(Boolean).join(' · ')}
                          </p>
                          {view === 'mine' && (
                            <>
                              <span className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-bold ${STATUS[l.status]?.cls ?? ''}`}>
                                {STATUS[l.status]?.label ?? l.status}
                              </span>
                              {l.status === 'rejected' && l.reject_reason && (
                                <p className="mt-1 text-xs text-[#c0392b]">{l.reject_reason}</p>
                              )}
                            </>
                          )}
                        </div>
                      </Link>

                      {wanted && (
                        <span className="absolute left-2 top-2 rounded-full bg-[#f0a500] px-3 py-1 text-[11px] font-extrabold tracking-wide text-[#3a2900] shadow">
                          WANTED
                        </span>
                      )}
                      {l.status === 'approved' && (
                        <button
                          onClick={() => toggleSave(l.id)}
                          aria-pressed={isSaved}
                          aria-label={isSaved ? 'Remove from saved items' : 'Save this listing'}
                          title={isSaved ? 'Saved' : 'Save'}
                          className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-[#12302f] shadow hover:bg-white"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill={isSaved ? '#c0392b' : 'none'} stroke={isSaved ? '#c0392b' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {view === 'browse' && (i === 3 || i === 11) && (
                      <AdSlot ads={ads.bazaar_grid} cityName={cityName} startAt={i === 3 ? 0 : 1} imgClass="aspect-square" boxClass="min-h-[0px]" />
                    )}
                  </Fragment>
                )
              })}
            </div>
          )}
        </main>

        {/* Right skyscraper ad (large desktop only) */}
        <aside className="hidden xl:block">
          <div className="sticky top-6">
            <AdSlot ads={ads.bazaar_side_right} cityName={cityName} imgClass="aspect-[3/5]" boxClass="min-h-[0px]" />
          </div>
        </aside>
      </div>

      <PublicJoinBanner message="Join MilapHub to like, comment, and post your own items." />
    </div>
  )
}
