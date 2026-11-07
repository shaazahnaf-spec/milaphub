// FILE: app/bazaar/[id]/page.tsx  (GitHub mein is path par paste karo)
'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BazaarHeader from '@/components/BazaarHeader'
import AdSlot from '@/components/AdSlot'
import { useAds, BAZAAR_SLOTS } from '@/lib/useAds'
import { STATUS, bazaarPath, categoryLabel, inr, one, type Listing } from '@/lib/bazaar'

type Rel = { id: string; requester_id: string; receiver_id: string; status: string }

const REASONS = [
  { id: 'spam', label: 'Spam or scam' },
  { id: 'fake', label: 'Fake or misleading' },
  { id: 'abuse', label: 'Abuse or harassment' },
  { id: 'hate', label: 'Hate speech' },
  { id: 'nudity', label: 'Nudity or sexual content' },
  { id: 'other', label: 'Something else' },
]

export default function ListingPage() {
  const { id } = useParams<{ id: string }>()
  const [supabase] = useState(() => createClient())
  const router = useRouter()
  const [me, setMe] = useState<string | null>(null)
  const [listing, setListing] = useState<Listing | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [rel, setRel] = useState<Rel | null>(null)
  const [idx, setIdx] = useState(0)
  const [toast, setToast] = useState('')
  const [reportOpen, setReportOpen] = useState(false)
  const [reason, setReason] = useState('spam')
  const [details, setDetails] = useState('')
  const { ads, cityName } = useAds(supabase, BAZAAR_SLOTS)

  const notify = useCallback((t: string) => {
    setToast(t)
    setTimeout(() => setToast(''), 3500)
  }, [])

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/login'); return }
    setMe(user.id)
    const { data } = await supabase
      .from('listings')
      .select('id, seller_id, city_id, title, description, price, category, condition, locality, image_urls, status, reject_reason, profiles!seller_id(full_name, username)')
      .eq('id', id)
      .maybeSingle()
    setListing((data ?? null) as unknown as Listing | null)
    setLoaded(true)
    if (data && data.seller_id !== user.id) {
      const sid = data.seller_id as string
      const { data: fr } = await supabase
        .from('friendships')
        .select('id, requester_id, receiver_id, status')
        .or(`and(requester_id.eq.${user.id},receiver_id.eq.${sid}),and(requester_id.eq.${sid},receiver_id.eq.${user.id})`)
        .in('status', ['pending', 'accepted'])
        .limit(1)
      setRel((fr?.[0] ?? null) as Rel | null)
    }
  }, [supabase, router, id])

  useEffect(() => { load() }, [load])

  async function addFriend() {
    if (!me || !listing) return
    const { error } = await supabase
      .from('friendships').insert({ requester_id: me, receiver_id: listing.seller_id, status: 'pending' })
    if (error) return notify(error.code === '23505' ? 'You cannot send another request to this person.' : error.message)
    notify('Friend request sent. You can message the seller once they accept.')
    load()
  }

  async function acceptRequest() {
    if (!rel) return
    const { error } = await supabase.from('friendships').update({ status: 'accepted' }).eq('id', rel.id)
    if (error) return notify(error.message)
    notify('You are now friends.')
    load()
  }

  async function markSold() {
    if (!listing || !window.confirm('Mark this item as sold? It will be removed from Bazaar.')) return
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
    if (!me || !listing) return
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

  return (
    <div className="min-h-screen bg-white text-[#12302f]">
      <BazaarHeader title="Bazaar">
        <Link href="/bazaar" className="rounded-full border border-[#dbe5e4] px-4 py-2 text-sm font-semibold hover:bg-[#f3f7f6]">Back to Bazaar</Link>
      </BazaarHeader>

      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-6 md:grid-cols-2">
        <div>
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
        </div>

        <div className="space-y-4">
          {mine && listing.status !== 'approved' && st && (
            <div className={`rounded-xl px-4 py-3 text-sm font-semibold ${st.cls}`}>
              {st.label}
              {listing.status === 'pending' && ': our team is checking this listing. It will appear in Bazaar once approved.'}
              {listing.status === 'rejected' && listing.reject_reason ? `: ${listing.reject_reason}` : ''}
            </div>
          )}

          <div>
            <p className="text-3xl font-extrabold">{inr(listing.price)}</p>
            <h2 className="mt-1 text-xl font-bold">{listing.title}</h2>
            <p className="mt-1 text-sm text-[#5d7776]">
              {[categoryLabel(listing.category), listing.condition === 'new' ? 'New' : 'Used', listing.locality]
                .filter(Boolean).join(' · ')}
            </p>
          </div>

          {listing.description && <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{listing.description}</p>}

          <div className="rounded-2xl border border-[#e5eceb] p-4">
            <p className="text-sm text-[#5d7776]">Seller</p>
            <p className="font-bold">{seller?.full_name ?? 'MilapHub user'}</p>
            <p className="text-sm text-[#5d7776]">@{seller?.username ?? 'user'}</p>

            {mine ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {listing.status === 'approved' && (
                  <button onClick={markSold} className="rounded-full bg-[#0f5c5a] px-5 py-2 text-sm font-bold text-white hover:bg-[#0b4846]">Mark as sold</button>
                )}
                <button onClick={removeListing} className="rounded-full border border-[#f1d3cf] px-5 py-2 text-sm font-semibold text-[#c0392b] hover:bg-[#fdf3f2]">Delete listing</button>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {rel?.status === 'accepted' && (
                  <Link href={`/messages?with=${listing.seller_id}`}
                    className="block rounded-full bg-[#0f5c5a] px-5 py-3 text-center text-sm font-bold text-white hover:bg-[#0b4846]">
                    Message seller
                  </Link>
                )}
                {rel?.status === 'pending' && rel.requester_id === me && (
                  <p className="rounded-full bg-[#f3f7f6] px-5 py-3 text-center text-sm font-semibold text-[#5d7776]">
                    Friend request sent. You can message once the seller accepts.
                  </p>
                )}
                {rel?.status === 'pending' && rel.receiver_id === me && (
                  <button onClick={acceptRequest} className="w-full rounded-full bg-[#0f5c5a] px-5 py-3 text-sm font-bold text-white hover:bg-[#0b4846]">
                    Accept friend request to chat
                  </button>
                )}
                {!rel && (
                  <button onClick={addFriend} className="w-full rounded-full bg-[#0f5c5a] px-5 py-3 text-sm font-bold text-white hover:bg-[#0b4846]">
                    Add friend to message seller
                  </button>
                )}
                {!rel && (
                  <p className="text-xs text-[#5d7776]">Chat on MilapHub works only between friends. Send a request and chat once it is accepted.</p>
                )}
                <button onClick={() => setReportOpen(o => !o)} className="text-sm font-semibold text-[#5d7776] underline hover:text-[#c0392b]">
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

          <div className="rounded-2xl bg-[#fff8e6] p-4 text-sm text-[#5a4300]">
            <p className="font-bold">Stay safe</p>
            <p className="mt-1">
              Meet in a public place and check the item before you pay. Never send money in advance. MilapHub does not
              handle payments or delivery for Bazaar.
            </p>
          </div>

          <AdSlot ads={ads.bazaar_grid} cityName={cityName} imgClass="aspect-[16/9]" boxClass="min-h-[0px]" startAt={2} />
        </div>
      </main>

      {toast && (
        <div role="status" className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#12302f] px-5 py-3 text-sm font-semibold text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  )
}
