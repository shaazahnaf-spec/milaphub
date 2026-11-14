// FILE: app/bazaar/[id]/ListingClient.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BazaarHeader from '@/components/BazaarHeader'
import AdSlot from '@/components/AdSlot'
import AreaMap from '@/components/AreaMap'
import PublicJoinBanner from '@/components/PublicJoinBanner'
import PublicServiceBar from '@/components/PublicServiceBar'
import { useAds, BAZAAR_SLOTS } from '@/lib/useAds'
import { CHIPS, STATUS, bazaarPath, categoryLabel, one, priceLabel, type Listing } from '@/lib/bazaar'

const REASONS = [
  { id: 'spam', label: 'Spam or scam' },
  { id: 'fake', label: 'Fake or misleading' },
  { id: 'abuse', label: 'Abuse or harassment' },
  { id: 'hate', label: 'Hate speech' },
  { id: 'nudity', label: 'Nudity or sexual content' },
  { id: 'other', label: 'Something else' },
]

const SELECT =
  'id, seller_id, city_id, title, description, price, category, condition, locality, image_urls, status, reject_reason, listing_type, lat, lng, profiles!seller_id(full_name, username)'

export default function ListingClient({
  initialListing = null,
  initialCityName = null,
}: {
  initialListing?: Listing | null
  initialCityName?: string | null
}) {
  const { id } = useParams<{ id: string }>()
  const [supabase] = useState(() => createClient())
  const router = useRouter()
  const [me, setMe] = useState<string | null>(null)
  const [listing, setListing] = useState<Listing | null>(initialListing)
  const [loaded, setLoaded] = useState(!!initialListing)
  const [similar, setSimilar] = useState<Listing[]>([])
  const [saved, setSaved] = useState(false)
  const [idx, setIdx] = useState(0)
  const [toast, setToast] = useState('')
  const [chatBusy, setChatBusy] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reason, setReason] = useState('spam')
  const [details, setDetails] = useState('')
  const { ads, cityName: adsCity } = useAds(supabase, BAZAAR_SLOTS)
  const cityName = initialCityName ?? adsCity

  const notify = useCallback((t: string) => {
    setToast(t)
    setTimeout(() => setToast(''), 3500)
  }, [])

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setMe(user.id)
    const { data } = await supabase.from('listings').select(SELECT).eq('id', id).maybeSingle()
    const l = (data ?? null) as unknown as Listing | null
    setListing(l)
    setLoaded(true)
    if (!l) return

    if (user) {
      const { data: sv } = await supabase
        .from('saved_listings').select('listing_id').eq('user_id', user.id).eq('listing_id', id).maybeSingle()
      setSaved(!!sv)
    }

    const { data: sim } = await supabase
      .from('listings')
      .select('id, seller_id, city_id, title, price, category, condition, locality, image_urls, status, reject_reason, listing_type')
      .eq('city_id', l.city_id)
      .eq('category', l.category)
      .eq('listing_type', l.listing_type)
      .eq('status', 'approved')
      .gt('expires_at', new Date().toISOString())
      .neq('id', id)
      .order('created_at', { ascending: false })
      .limit(8)
    setSimilar((sim ?? []) as unknown as Listing[])
  }, [supabase, router, id])

  useEffect(() => { load() }, [load])

  async function toggleSave() {
    if (!listing) return
    if (!me) { router.push('/login'); return }
    const was = saved
    setSaved(!was)
    const { error } = was
      ? await supabase.from('saved_listings').delete().eq('user_id', me).eq('listing_id', listing.id)
      : await supabase.from('saved_listings').insert({ user_id: me, listing_id: listing.id })
    if (error) { setSaved(was); return notify(error.message) }
    notify(was ? 'Removed from saved items.' : 'Saved. Find it under Saved items.')
  }

  // Start a chat (optionally with a first message from a quick chip)
  async function startChat(firstMessage?: string) {
    if (!listing) return
    if (!me) { router.push('/login'); return }
    setChatBusy(true)
    const { data: cid, error } = await supabase.rpc('start_listing_conversation', { p_listing: listing.id })
    if (error) { setChatBusy(false); return notify(error.message) }
    if (firstMessage) {
      const { error: mErr } = await supabase.from('messages').insert({
        sender_id: me, receiver_id: listing.seller_id, conversation_id: cid as string, body: firstMessage,
      })
      if (mErr) { setChatBusy(false); return notify(mErr.message) }
    }
    router.push(`/messages?c=${cid as string}`)
  }

  async function markSold() {
    if (!listing || !window.confirm('Mark this as done? It will be removed from Bazaar.')) return
    const { data, error } = await supabase.from('listings').update({ status: 'sold' }).eq('id', listing.id).select('id')
    if (error) return notify(error.message)
    if (!data || data.length === 0) return notify('Could not update this listing.')
    router.push('/bazaar')
  }

  async function removeListing() {
    if (!listing || !window.confirm('Delete this listing permanently?')) return
    const { data, error } = await supabase.from('listings').delete().eq('id', listing.id).select('id')
    if (error) return notify(error.message)
    if (!data || data.length === 0) return notify('You are not allowed to delete this listing.')
    const paths = listing.image_urls.map(bazaarPath).filter((p): p is string => !!p)
    if (paths.length) await supabase.storage.from('bazaar').remove(paths)
    router.push('/bazaar')
  }

  async function submitReport() {
    if (!listing) return
    if (!me) { router.push('/login'); return }
    const { error } = await supabase.from('listing_reports').insert({
      listing_id: listing.id, reporter_id: me, reason, details: details.trim() || null,
    })
    if (error) return notify(error.code === '23505' ? 'You already reported this listing.' : error.message)
    setReportOpen(false); setDetails(''); setReason('spam')
    notify('Thanks. Our team will review this listing.')
  }

  if (!loaded) {
    return <div className="grid min-h-screen place-items-center font-semibold text-[#0f5c5a]">Loading...</div>
  }
  if (!listing) {
    return (
      <div className="min-h-screen bg-white">
        <BazaarHeader title="Bazaar" />
        <main className="mx-auto max-w-md px-4 py-16 text-center">
          <h2 className="text-xl font-extrabold">Listing not found</h2>
          <p className="mt-1 text-[#5d7776]">It may have been sold or removed.</p>
          <Link href="/bazaar" className="mt-5 inline-block rounded-full bg-[#0f5c5a] px-6 py-2.5 text-sm font-bold text-white">Back to Bazaar</Link>
        </main>
      </div>
    )
  }

  const seller = one(listing.profiles)
  const mine = listing.seller_id === me
  const st = STATUS[listing.status]
  const wanted = listing.listing_type === 'wanted'
  const chips = me ? CHIPS[wanted ? 'wanted' : 'sell'] : []
  const canChat = listing.status === 'approved'
  const hasPhotos = listing.image_urls.length > 0

  return (
    <div className="min-h-screen bg-white text-[#12302f]">
      <BazaarHeader title="Bazaar">
        <Link href="/bazaar" className="rounded-full border border-[#dbe5e4] px-4 py-2 text-sm font-semibold hover:bg-[#f3f7f6]">Back to Bazaar</Link>
      </BazaarHeader>
      {!me && <PublicServiceBar current="/bazaar" />}

      <div className="mx-auto max-w-[1400px] px-4 py-6 xl:grid xl:grid-cols-[200px_minmax(0,1fr)_200px] xl:gap-6">
        <aside className="hidden xl:block">
          <div className="sticky top-6">
            <AdSlot ads={ads.bazaar_side_left} cityName={cityName} imgClass="aspect-[3/5]" boxClass="min-h-[0px]" />
          </div>
        </aside>

        <main className="mx-auto w-full max-w-5xl space-y-8">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              {hasPhotos ? (
                <>
                  <div className="aspect-square overflow-hidden rounded-2xl bg-[#f3f7f6]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={listing.image_urls[idx]} alt={listing.title} className="h-full w-full object-contain" />
                  </div>
                  {listing.image_urls.length > 1 && (
                    <div className="mt-3 flex gap-2">
                      {listing.image_urls.map((u, i) => (
                        <button key={u} onClick={() => setIdx(i)} aria-label={`Show photo ${i + 1}`} aria-current={i === idx}
                          className={`h-16 w-16 overflow-hidden rounded-xl border-2 ${i === idx ? 'border-[#0f5c5a]' : 'border-transparent'}`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={u} alt="" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="grid aspect-square place-items-center rounded-2xl bg-[#fff8e6] p-6 text-center">
                  <div>
                    <p className="text-sm font-extrabold tracking-wide text-[#7a5600]">WANTED</p>
                    <p className="mt-1 text-lg font-bold">Looking for {categoryLabel(listing.category)}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-extrabold tracking-wide ${wanted ? 'bg-[#f0a500] text-[#3a2900]' : 'bg-[#e3efee] text-[#0f5c5a]'}`}>
                  {wanted ? 'BUYER REQUIREMENT' : 'SALE LISTING'}
                </span>
                <button onClick={toggleSave} aria-pressed={saved} aria-label={saved ? 'Remove from saved items' : 'Save this listing'}
                  className="ml-auto flex items-center gap-1.5 rounded-full border border-[#dbe5e4] px-3 py-1.5 text-sm font-semibold hover:bg-[#f3f7f6]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={saved ? '#c0392b' : 'none'} stroke={saved ? '#c0392b' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                  </svg>
                  {saved ? 'Saved' : 'Save'}
                </button>
              </div>

              {mine && listing.status !== 'approved' && st && (
                <div className={`rounded-xl px-4 py-3 text-sm font-semibold ${st.cls}`}>
                  {st.label}
                  {listing.status === 'pending' && ': our team is checking this. It will appear in Bazaar once approved.'}
                  {listing.status === 'rejected' && listing.reject_reason ? `: ${listing.reject_reason}` : ''}
                </div>
              )}

              <div>
                <p className="text-3xl font-extrabold">{priceLabel(listing.listing_type, listing.price)}</p>
                <h2 className="mt-1 text-xl font-bold">{listing.title}</h2>
                <p className="mt-1 text-sm text-[#5d7776]">
                  {[categoryLabel(listing.category), wanted ? null : listing.condition === 'new' ? 'New' : 'Used', listing.locality]
                    .filter(Boolean).join(' · ')}
                </p>
              </div>

              {listing.description && <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{listing.description}</p>}

              <div className="rounded-2xl border border-[#e5eceb] p-4">
                <p className="text-sm text-[#5d7776]">{wanted ? 'Posted by (buyer)' : 'Seller'}</p>
                <p className="font-bold">{seller?.full_name ?? 'MilapHub user'}</p>
                <p className="text-sm text-[#5d7776]">@{seller?.username ?? 'user'}</p>

                {mine ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {listing.status === 'approved' && (
                      <button onClick={markSold} className="rounded-full bg-[#0f5c5a] px-5 py-2 text-sm font-bold text-white hover:bg-[#0b4846]">
                        {wanted ? 'Mark as fulfilled' : 'Mark as sold'}
                      </button>
                    )}
                    <button onClick={removeListing} className="rounded-full border border-[#f1d3cf] px-5 py-2 text-sm font-semibold text-[#c0392b] hover:bg-[#fdf3f2]">Delete listing</button>
                  </div>
                ) : (
                  <div className="mt-3 space-y-3">
                    {canChat && (
                      <>
                        <button onClick={() => startChat()} disabled={chatBusy}
                          className="w-full rounded-full bg-[#0f5c5a] px-5 py-3 text-sm font-bold text-white hover:bg-[#0b4846] disabled:opacity-60">
                          {!me ? 'Log in to chat' : wanted ? 'I have this item / Offer to buyer' : 'Chat with seller'}
                        </button>
                        <div className="flex flex-wrap gap-2" role="group" aria-label="Quick messages">
                          {chips.map(c => (
                            <button key={c} onClick={() => startChat(c)} disabled={chatBusy}
                              className="rounded-full border border-[#dbe5e4] px-3 py-1.5 text-xs font-semibold hover:bg-[#f3f7f6] disabled:opacity-60">
                              {c}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                    <button onClick={() => (me ? setReportOpen(o => !o) : router.push('/login'))} className="text-sm font-semibold text-[#5d7776] underline hover:text-[#c0392b]">
                      Report this listing
                    </button>
                  </div>
                )}
              </div>

              {reportOpen && (
                <div className="space-y-2 rounded-2xl border border-[#e5eceb] p-4">
                  <p className="font-bold">Why are you reporting this listing?</p>
                  {REASONS.map(r => (
                    <label key={r.id} className="flex cursor-pointer items-center gap-3 text-sm">
                      <input type="radio" name="reason" checked={reason === r.id} onChange={() => setReason(r.id)} className="h-4 w-4 accent-[#0f5c5a]" />
                      {r.label}
                    </label>
                  ))}
                  <textarea value={details} onChange={e => setDetails(e.target.value)} maxLength={500} rows={2}
                    placeholder="More details (optional)"
                    className="w-full resize-none rounded-xl bg-[#f3f7f6] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#0f5c5a]/30" />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setReportOpen(false)} className="rounded-full px-4 py-2 text-sm font-semibold hover:bg-[#f3f7f6]">Cancel</button>
                    <button onClick={submitReport} className="rounded-full bg-[#c0392b] px-5 py-2 text-sm font-bold text-white hover:brightness-110">Submit report</button>
                  </div>
                </div>
              )}

              <AreaMap lat={listing.lat} lng={listing.lng} locality={listing.locality} cityName={cityName} />

              <div className="rounded-2xl bg-[#fff8e6] p-4 text-sm text-[#5a4300]">
                <p className="font-bold">Stay safe</p>
                <p className="mt-1">
                  Meet in a public place and check the item before you pay. Never send money in advance. MilapHub does not
                  handle payments or delivery for Bazaar.
                </p>
              </div>

              <AdSlot ads={ads.bazaar_grid} cityName={cityName} imgClass="aspect-[16/9]" boxClass="min-h-[0px]" startAt={2} />
            </div>
          </div>

          {similar.length > 0 && (
            <section aria-labelledby="similar-title">
              <h3 id="similar-title" className="mb-3 text-lg font-extrabold">
                {wanted ? `Similar requirements in ${cityName}` : `Similar products in ${cityName}`}
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {similar.map(s => (
                  <Link key={s.id} href={`/bazaar/${s.id}`} className="overflow-hidden rounded-2xl border border-[#e5eceb] bg-white shadow-sm transition hover:shadow-md">
                    <div className="aspect-square bg-[#f3f7f6]">
                      {s.image_urls[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.image_urls[0]} alt="" loading="lazy" className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full place-items-center p-3 text-center text-sm font-bold text-[#5d7776]">Wanted</div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="font-extrabold">{priceLabel(s.listing_type, s.price)}</p>
                      <p className="line-clamp-2 text-sm">{s.title}</p>
                      {s.locality && <p className="mt-1 truncate text-xs text-[#5d7776]">{s.locality}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </main>

        <aside className="hidden xl:block">
          <div className="sticky top-6">
            <AdSlot ads={ads.bazaar_side_right} cityName={cityName} imgClass="aspect-[3/5]" boxClass="min-h-[0px]" />
          </div>
        </aside>
      </div>

      <PublicJoinBanner message="Join MilapHub to like, comment, and post your own items." />

      {toast && (
        <div role="status" className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#12302f] px-5 py-3 text-sm font-semibold text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  )
}
