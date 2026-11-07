// FILE: app/bazaar/page.tsx  (GitHub mein is path par paste karo)
'use client'

import { Fragment, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BazaarHeader from '@/components/BazaarHeader'
import AdSlot from '@/components/AdSlot'
import { useAds, BAZAAR_SLOTS } from '@/lib/useAds'
import { CATEGORIES, STATUS, categoryLabel, inr, one, type Listing } from '@/lib/bazaar'

export default function BazaarPage() {
  const [supabase] = useState(() => createClient())
  const router = useRouter()
  const [me, setMe] = useState<string | null>(null)
  const [cityId, setCityId] = useState<number | null>(null)
  const [cityName, setCityName] = useState('your city')
  const [view, setView] = useState<'browse' | 'mine'>('browse')
  const [category, setCategory] = useState('all')
  const [q, setQ] = useState('')
  const [term, setTerm] = useState('')
  const [items, setItems] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { ads } = useAds(supabase, BAZAAR_SLOTS)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      const { data } = await supabase
        .from('profiles').select('city_id, cities(name)').eq('id', user.id).maybeSingle()
      if (!data?.city_id) { router.replace('/onboarding'); return }
      setMe(user.id)
      setCityId(data.city_id as number)
      const c = one((data as unknown as { cities: { name: string } | { name: string }[] | null }).cities)
      if (c) setCityName(c.name)
    }
    init()
  }, [supabase, router])

  useEffect(() => {
    const t = setTimeout(() => setTerm(q.trim().replace(/[%,()*]/g, ' ').trim()), 300)
    return () => clearTimeout(t)
  }, [q])

  const load = useCallback(async () => {
    if (!me || !cityId) return
    setLoading(true); setError('')
    let query = supabase
      .from('listings')
      .select('id, seller_id, city_id, title, price, category, condition, locality, image_urls, status, reject_reason')
    if (view === 'mine') {
      query = query.eq('seller_id', me)
    } else {
      query = query.eq('city_id', cityId).eq('status', 'approved').gt('expires_at', new Date().toISOString())
      if (category !== 'all') query = query.eq('category', category)
      if (term) query = query.ilike('title', `%${term}%`)
    }
    const { data, error } = await query.order('created_at', { ascending: false }).limit(60)
    setLoading(false)
    if (error) return setError(error.message)
    setItems((data ?? []) as unknown as Listing[])
  }, [supabase, me, cityId, view, category, term])

  useEffect(() => { load() }, [load])

  const tab = (v: 'browse' | 'mine', label: string) => (
    <button
      onClick={() => setView(v)}
      className={`rounded-full px-5 py-2 text-sm font-bold ${view === v ? 'bg-[#0f5c5a] text-white' : 'bg-[#f3f7f6] hover:bg-[#e3efee]'}`}
    >
      {label}
    </button>
  )

  return (
    <div className="min-h-screen bg-white text-[#12302f]">
      <BazaarHeader title="Bazaar">
        <Link href="/bazaar/new" className="rounded-full bg-[#f0a500] px-5 py-2 text-sm font-bold text-[#3a2900] hover:brightness-105">
          Sell something
        </Link>
        <Link href="/home" className="hidden rounded-full border border-[#dbe5e4] px-4 py-2 text-sm font-semibold hover:bg-[#f3f7f6] sm:block">
          Back to home
        </Link>
      </BazaarHeader>

      <main className="mx-auto max-w-5xl space-y-4 px-4 py-5">
        <div className="flex flex-wrap items-center gap-2">
          {tab('browse', `Buy in ${cityName}`)}
          {tab('mine', 'My listings')}
        </div>

        {view === 'browse' && (
          <>
            <AdSlot ads={ads.bazaar_top} cityName={cityName} imgClass="aspect-[4/1]" boxClass="min-h-[0px]" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search in Bazaar"
              aria-label="Search listings"
              className="w-full rounded-full bg-[#f3f7f6] px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-[#0f5c5a]/30"
            />
            <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Categories">
              {[{ id: 'all', label: 'All' }, ...CATEGORIES].map(c => (
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
            {view === 'mine'
              ? 'You have not listed anything yet.'
              : `Nothing for sale in ${cityName} yet. Be the first to list something!`}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((l, i) => (
              <Fragment key={l.id}>
              <Link
                href={`/bazaar/${l.id}`}
                className="overflow-hidden rounded-2xl border border-[#e5eceb] bg-white shadow-sm transition hover:shadow-md"
              >
                <div className="aspect-square bg-[#f3f7f6]">
                  {l.image_urls[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.image_urls[0]} alt="" loading="lazy" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="p-3">
                  <p className="font-extrabold">{inr(l.price)}</p>
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
              {view === 'browse' && (i === 3 || i === 11) && (
                <AdSlot
                  ads={ads.bazaar_grid}
                  cityName={cityName}
                  startAt={i === 3 ? 0 : 1}
                  imgClass="aspect-square"
                  boxClass="min-h-[0px]"
                />
              )}
              </Fragment>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
