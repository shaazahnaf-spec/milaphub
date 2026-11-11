// FILE: app/matrimony/[id]/page.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BazaarHeader from '@/components/BazaarHeader'
import AdColumns from '@/components/AdColumns'
import { useAds } from '@/lib/useAds'
import { MARITAL, MATRI_SLOTS, cmToFt, tierToAudience, type Quota, type ViewData } from '@/lib/matrimony'

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex gap-3 border-b border-[#eef3f2] py-2 text-sm">
      <dt className="w-36 shrink-0 text-[#5d7776]">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  )
}

export default function MatrimonyProfileView() {
  const { id } = useParams<{ id: string }>()
  const [supabase] = useState(() => createClient())
  const router = useRouter()
  const [data, setData] = useState<ViewData | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [quota, setQuota] = useState<Quota | null>(null)
  const [photos, setPhotos] = useState<string[]>([])
  const [idx, setIdx] = useState(0)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')
  const { ads, cityName } = useAds(supabase, MATRI_SLOTS, tierToAudience(quota?.tier ?? 'normal'))

  const notify = useCallback((t: string) => {
    setToast(t)
    setTimeout(() => setToast(''), 3500)
  }, [])

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/login'); return }
    const { data: v } = await supabase.rpc('matrimony_view', { p_profile: id })
    const view = (v ?? null) as ViewData | null
    setData(view)
    setLoaded(true)
    if (!view) return
    const { data: q } = await supabase.rpc('matrimony_quota')
    setQuota(q as Quota)
    if (view.photo_paths && view.photo_paths.length) {
      const { data: signed } = await supabase.storage.from('matrimony-photos').createSignedUrls(view.photo_paths, 600)
      setPhotos((signed ?? []).map(s => s.signedUrl).filter((u): u is string => !!u))
    } else {
      setPhotos([])
    }
  }, [supabase, router, id])

  useEffect(() => { load() }, [load])

  async function unlock() {
    setBusy(true)
    const { error } = await supabase.rpc('unlock_matrimony_profile', { p_profile: id })
    setBusy(false)
    if (error) return notify(error.message)
    notify('Profile unlocked.')
    load()
  }

  async function sendInterest() {
    if (!data) return
    setBusy(true)
    const { error } = await supabase.rpc('send_matrimony_interest', { p_to: data.owner_id, p_message: message.trim() || null })
    setBusy(false)
    if (error) return notify(error.message)
    setMessage('')
    notify('Interest sent. We will let you know when they respond.')
    load()
  }

  async function respond(accept: boolean) {
    if (!data?.interest) return
    setBusy(true)
    const { data: conv, error } = await supabase.rpc('respond_matrimony_interest', { p_interest: data.interest.id, p_accept: accept })
    setBusy(false)
    if (error) return notify(error.message)
    if (accept && conv) { router.push(`/messages?c=${conv as string}`); return }
    notify(accept ? 'Interest accepted.' : 'Interest declined.')
    load()
  }

  async function withdraw() {
    if (!data?.interest) return
    const { error } = await supabase.rpc('withdraw_matrimony_interest', { p_interest: data.interest.id })
    if (error) return notify(error.message)
    load()
  }

  if (!loaded) {
    return <div className="grid min-h-screen place-items-center font-semibold text-[#0f5c5a]">Loading...</div>
  }
  if (!data) {
    return (
      <div className="min-h-screen bg-white">
        <BazaarHeader title="Matrimony" />
        <main className="mx-auto max-w-md px-4 py-16 text-center">
          <h2 className="text-xl font-extrabold">Profile not available</h2>
          <p className="mt-1 text-[#5d7776]">It may have been removed, or you may need a verified profile to view it.</p>
          <Link href="/matrimony" className="mt-5 inline-block rounded-full bg-[#0f5c5a] px-6 py-2.5 text-sm font-bold text-white">Back to Matrimony</Link>
        </main>
      </div>
    )
  }

  const i = data.interest
  const title = data.accepted && data.full_name ? data.full_name : data.first_name
  const noQuota = quota ? quota.credits < 1 && quota.monthly_left < 1 : false

  return (
    <div className="min-h-screen bg-white text-[#12302f]">
      <BazaarHeader title="Matrimony">
        <Link href="/matrimony" className="rounded-full border border-[#dbe5e4] px-4 py-2 text-sm font-semibold hover:bg-[#f3f7f6]">Back</Link>
      </BazaarHeader>

      <main className="mx-auto grid max-w-4xl gap-6 px-4 py-6 md:grid-cols-[320px_minmax(0,1fr)]">
        <div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-[#e3efee]">
            {data.accepted && photos.length > 0 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photos[idx]} alt={`Photo of ${title}`} className="h-full w-full object-cover" />
            ) : data.blur_thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.blur_thumb} alt="" className="h-full w-full scale-125 object-cover blur-md" />
            ) : (
              <div className="grid h-full place-items-center text-6xl font-extrabold text-[#0f5c5a]">{data.first_name.charAt(0)}</div>
            )}
          </div>
          {data.accepted && photos.length > 1 && (
            <div className="mt-3 flex gap-2">
              {photos.map((u, n) => (
                <button key={u} onClick={() => setIdx(n)} aria-label={`Show photo ${n + 1}`} aria-current={n === idx}
                  className={`h-16 w-14 overflow-hidden rounded-xl border-2 ${n === idx ? 'border-[#0f5c5a]' : 'border-transparent'}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
          {!data.accepted && !data.is_owner && (
            <p className="mt-3 text-xs text-[#5d7776]">Photos become clear when this person accepts your interest.</p>
          )}
        </div>

        <div className="space-y-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-extrabold">{title}, {data.age_years}</h2>
              {data.created_by === 'parent' && <span className="rounded-full bg-[#f3f7f6] px-3 py-1 text-xs font-bold text-[#5d7776]">Profile by parent</span>}
              {data.featured && <span className="rounded-full bg-[#f0a500] px-3 py-1 text-xs font-extrabold text-[#3a2900]">Featured</span>}
              {data.is_owner && <span className="rounded-full bg-[#e3efee] px-3 py-1 text-xs font-bold text-[#0f5c5a]">This is you</span>}
            </div>
            <p className="text-sm text-[#5d7776]">
              {[data.city_name, data.education].filter(Boolean).join(' · ')}
            </p>
          </div>

          <dl>
            {data.unlocked && (
              <>
                <Row label="Height" value={data.height_cm ? `${data.height_cm} cm (${cmToFt(data.height_cm)})` : null} />
                <Row label="Maslak" value={data.maslak} />
                <Row label="Community" value={data.sub_community} />
                <Row label="Marital status" value={MARITAL.find(m => m.id === data.marital_status)?.label ?? data.marital_status} />
                <Row label="Occupation" value={data.occupation} />
                <Row label="Yearly income" value={data.income_range} />
              </>
            )}
          </dl>

          {data.unlocked ? (
            <>
              {data.about && <section><h3 className="font-extrabold">About</h3><p className="mt-1 whitespace-pre-wrap text-[15px]">{data.about}</p></section>}
              {data.family_details && <section><h3 className="font-extrabold">Family</h3><p className="mt-1 whitespace-pre-wrap text-[15px]">{data.family_details}</p></section>}
              {data.partner_prefs && <section><h3 className="font-extrabold">Looking for</h3><p className="mt-1 whitespace-pre-wrap text-[15px]">{data.partner_prefs}</p></section>}
            </>
          ) : (
            <div className="rounded-2xl border border-[#e5eceb] bg-[#f8fbfa] p-4">
              <p className="font-bold">Unlock the full profile</p>
              <p className="mt-1 text-sm text-[#5d7776]">
                See height, maslak, community, work, income, family and what they are looking for. This uses one of your 20 monthly unlocks.
                {quota && <> You have {quota.monthly_left} of {quota.monthly_total} left this month{quota.credits > 0 ? `, plus ${quota.credits} bonus` : ''}.</>}
              </p>
              <button onClick={unlock} disabled={busy || noQuota}
                className="mt-3 rounded-full bg-[#0f5c5a] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#0b4846] disabled:opacity-50">
                {noQuota ? 'No unlocks left this month' : 'Unlock profile'}
              </button>
            </div>
          )}

          {!data.is_owner && data.unlocked && (
            <div className="rounded-2xl border border-[#e5eceb] p-4">
              {!i && (
                <>
                  <p className="font-bold">Show your interest</p>
                  <textarea value={message} onChange={e => setMessage(e.target.value)} maxLength={300} rows={3}
                    placeholder="Write a short, respectful message (optional)"
                    className="mt-2 w-full resize-none rounded-xl bg-[#f3f7f6] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#0f5c5a]/30" />
                  <button onClick={sendInterest} disabled={busy}
                    className="mt-2 rounded-full bg-[#f0a500] px-6 py-2.5 text-sm font-bold text-[#3a2900] hover:brightness-105 disabled:opacity-60">
                    Send interest
                  </button>
                </>
              )}
              {i?.status === 'pending' && i.sent_by_me && (
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-[#fff4d6] px-3 py-1 text-xs font-bold text-[#7a5600]">Interest sent, waiting</span>
                  <button onClick={withdraw} className="text-sm font-semibold text-[#5d7776] underline">Withdraw</button>
                </div>
              )}
              {i?.status === 'pending' && !i.sent_by_me && (
                <div>
                  <p className="font-bold">{data.first_name} is interested in you</p>
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => respond(true)} disabled={busy} className="rounded-full bg-[#0f5c5a] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#0b4846] disabled:opacity-60">Accept</button>
                    <button onClick={() => respond(false)} disabled={busy} className="rounded-full px-5 py-2.5 text-sm font-semibold hover:bg-[#f3f7f6]">Decline</button>
                  </div>
                </div>
              )}
              {i?.status === 'accepted' && (
                <Link href="/messages" className="inline-block rounded-full bg-[#0f5c5a] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#0b4846]">Open chats</Link>
              )}
              {i?.status === 'declined' && (
                <p className="text-sm text-[#5d7776]">{i.sent_by_me ? 'This person has not accepted your interest.' : 'You declined this interest.'}</p>
              )}
            </div>
          )}

          <div className="rounded-2xl bg-[#fff8e6] p-4 text-sm text-[#5a4300]">
            <p className="font-bold">Stay safe</p>
            <p className="mt-1">
              Never send money to someone you have met online. Meet only in a public place with family or friends
              knowing. MilapHub verifies ID proofs but cannot guarantee anyone&apos;s intentions.
            </p>
          </div>
        </div>
        <div className="md:col-span-2"><AdColumns ads={ads} cityName={cityName} /></div>
      </main>

      {toast && (
        <div role="status" className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#12302f] px-5 py-3 text-sm font-semibold text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  )
}
