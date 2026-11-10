// FILE: app/matrimony/page.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BazaarHeader from '@/components/BazaarHeader'
import AdColumns from '@/components/AdColumns'
import { useAds } from '@/lib/useAds'
import {
  EDUCATION, MASLAKS, MATRI_SLOTS, STATUS_INFO, SUB_COMMUNITIES, TIERS, tierToAudience,
  type BrowseRow, type InterestRow, type Quota,
} from '@/lib/matrimony'

type MyProfile = { id: string; status: string; reject_reason: string | null; full_name: string }
type City = { id: number; name: string }

const field = 'rounded-xl border border-[#dbe5e4] bg-white px-3 py-2 text-sm outline-none focus:border-[#0f5c5a]'

function Thumb({ src, name }: { src: string | null; name: string }) {
  return (
    <div className="relative aspect-[4/5] overflow-hidden bg-[#e3efee]">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full scale-125 object-cover blur-md" />
      ) : (
        <div className="grid h-full place-items-center text-4xl font-extrabold text-[#0f5c5a]">{name.charAt(0)}</div>
      )}
    </div>
  )
}

export default function MatrimonyHub() {
  const [supabase] = useState(() => createClient())
  const router = useRouter()
  const [loaded, setLoaded] = useState(false)
  const [mine, setMine] = useState<MyProfile | null>(null)
  const [tab, setTab] = useState<'browse' | 'interests' | 'plans'>('browse')
  const [quota, setQuota] = useState<Quota | null>(null)
  const [rows, setRows] = useState<BrowseRow[]>([])
  const [interests, setInterests] = useState<InterestRow[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [minAge, setMinAge] = useState('')
  const [maxAge, setMaxAge] = useState('')
  const [maslak, setMaslak] = useState('')
  const [sub, setSub] = useState('')
  const [education, setEducation] = useState('')
  const [cityId, setCityId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const { ads, cityName } = useAds(supabase, MATRI_SLOTS, tierToAudience(quota?.tier ?? 'normal'))

  const notify = useCallback((t: string) => {
    setToast(t)
    setTimeout(() => setToast(''), 3500)
  }, [])

  const search = useCallback(async () => {
    setBusy(true); setError('')
    const { data, error } = await supabase.rpc('matrimony_browse', {
      p_min_age: minAge ? Number(minAge) : null,
      p_max_age: maxAge ? Number(maxAge) : null,
      p_city: cityId ? Number(cityId) : null,
      p_maslak: maslak || null,
      p_sub: sub || null,
      p_education: education || null,
    })
    setBusy(false)
    if (error) return setError(error.message)
    setRows((data ?? []) as BrowseRow[])
  }, [supabase, minAge, maxAge, cityId, maslak, sub, education])

  const loadInterests = useCallback(async () => {
    const { data } = await supabase.rpc('matrimony_interests_list')
    setInterests((data ?? []) as InterestRow[])
  }, [supabase])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      const { data } = await supabase
        .from('matrimony_profiles').select('id, status, reject_reason, full_name').eq('user_id', user.id).maybeSingle()
      setMine((data ?? null) as MyProfile | null)
      setLoaded(true)
      if (data?.status === 'verified') {
        const { data: q } = await supabase.rpc('matrimony_quota')
        setQuota(q as Quota)
        const { data: cs } = await supabase.from('cities').select('id, name').order('name')
        setCities((cs ?? []) as City[])
        search()
        loadInterests()
      }
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, router])

  async function respond(i: InterestRow, accept: boolean) {
    const { data, error } = await supabase.rpc('respond_matrimony_interest', { p_interest: i.interest_id, p_accept: accept })
    if (error) return notify(error.message)
    notify(accept ? 'Interest accepted. You can chat now.' : 'Interest declined.')
    await loadInterests()
    if (accept && data) router.push(`/messages?c=${data as string}`)
  }

  async function withdraw(i: InterestRow) {
    const { error } = await supabase.rpc('withdraw_matrimony_interest', { p_interest: i.interest_id })
    if (error) return notify(error.message)
    loadInterests()
  }

  if (!loaded) {
    return <div className="grid min-h-screen place-items-center font-semibold text-[#0f5c5a]">Loading...</div>
  }

  const verified = mine?.status === 'verified'
  const st = mine ? STATUS_INFO[mine.status] : null
  const pendingReceived = interests.filter(i => i.direction === 'received' && i.status === 'pending').length

  return (
    <div className="min-h-screen bg-white text-[#12302f]">
      <BazaarHeader title="Muslim Matrimony">
        <Link href="/matrimony/profile" className="rounded-full bg-[#f0a500] px-5 py-2 text-sm font-bold text-[#3a2900] hover:brightness-105">
          {mine ? 'My profile' : 'Create profile'}
        </Link>
        <Link href="/home" className="hidden rounded-full border border-[#dbe5e4] px-4 py-2 text-sm font-semibold hover:bg-[#f3f7f6] sm:block">
          Back to home
        </Link>
      </BazaarHeader>

      <main className="mx-auto max-w-5xl space-y-5 px-4 py-6">
        {!mine && (
          <div className="rounded-2xl border border-[#e5eceb] p-8 text-center">
            <h2 className="text-2xl font-extrabold">Find a rishta, safely</h2>
            <p className="mx-auto mt-2 max-w-md text-[#5d7776]">
              Every profile is verified with an ID proof. Photos stay blurred until the other person accepts your interest.
              You can create a profile for yourself, or as a parent or guardian for your son or daughter.
            </p>
            <Link href="/matrimony/profile" className="mt-5 inline-block rounded-full bg-[#0f5c5a] px-7 py-3 text-sm font-bold text-white hover:bg-[#0b4846]">
              Create matrimony profile
            </Link>
          </div>
        )}

        {mine && !verified && st && (
          <div className="rounded-2xl border border-[#e5eceb] p-6">
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${st.cls}`}>{st.label}</span>
            <p className="mt-3 font-semibold">{st.text}</p>
            {mine.status === 'rejected' && mine.reject_reason && (
              <p className="mt-2 rounded-xl bg-[#fdecea] p-3 text-sm text-[#c0392b]">{mine.reject_reason}</p>
            )}
            {(mine.status === 'draft' || mine.status === 'rejected') && (
              <Link href="/matrimony/profile" className="mt-4 inline-block rounded-full bg-[#0f5c5a] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#0b4846]">
                {mine.status === 'draft' ? 'Complete my profile' : 'Edit and submit again'}
              </Link>
            )}
          </div>
        )}

        {verified && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => setTab('browse')} aria-pressed={tab === 'browse'}
                className={`rounded-full px-5 py-2 text-sm font-bold ${tab === 'browse' ? 'bg-[#0f5c5a] text-white' : 'bg-[#f3f7f6] hover:bg-[#e3efee]'}`}>
                Browse profiles
              </button>
              <button onClick={() => setTab('interests')} aria-pressed={tab === 'interests'}
                className={`rounded-full px-5 py-2 text-sm font-bold ${tab === 'interests' ? 'bg-[#0f5c5a] text-white' : 'bg-[#f3f7f6] hover:bg-[#e3efee]'}`}>
                Interests{pendingReceived > 0 ? ` (${pendingReceived})` : ''}
              </button>
              <button onClick={() => setTab('plans')} aria-pressed={tab === 'plans'}
                className={`rounded-full px-5 py-2 text-sm font-bold ${tab === 'plans' ? 'bg-[#0f5c5a] text-white' : 'bg-[#f3f7f6] hover:bg-[#e3efee]'}`}>
                Plans
              </button>
              {quota && (
                <p className="ml-auto text-sm text-[#5d7776]">
                  <b className="text-[#12302f]">{quota.monthly_left}</b> of {quota.monthly_total} unlocks left this month
                  {quota.credits > 0 ? <>, plus <b className="text-[#12302f]">{quota.credits}</b> bonus</> : null}
                </p>
              )}
            </div>

            {tab === 'browse' && (
              <>
                <form onSubmit={e => { e.preventDefault(); search() }} className="flex flex-wrap items-end gap-3 rounded-2xl border border-[#e5eceb] p-4">
                  <label className="text-xs font-semibold">Age from
                    <input type="number" min={18} max={80} value={minAge} onChange={e => setMinAge(e.target.value)} className={field + ' mt-1 block w-24'} />
                  </label>
                  <label className="text-xs font-semibold">Age to
                    <input type="number" min={18} max={80} value={maxAge} onChange={e => setMaxAge(e.target.value)} className={field + ' mt-1 block w-24'} />
                  </label>
                  <label className="text-xs font-semibold">Maslak
                    <select value={maslak} onChange={e => setMaslak(e.target.value)} className={field + ' mt-1 block'}>
                      <option value="">Any</option>
                      {MASLAKS.map(r => <option key={r}>{r}</option>)}
                    </select>
                  </label>
                  <label className="text-xs font-semibold">Community
                    <select value={sub} onChange={e => setSub(e.target.value)} className={field + ' mt-1 block'}>
                      <option value="">Any</option>
                      {SUB_COMMUNITIES.map(r => <option key={r}>{r}</option>)}
                    </select>
                  </label>
                  <label className="text-xs font-semibold">Education
                    <select value={education} onChange={e => setEducation(e.target.value)} className={field + ' mt-1 block'}>
                      <option value="">Any</option>
                      {EDUCATION.map(r => <option key={r}>{r}</option>)}
                    </select>
                  </label>
                  <label className="text-xs font-semibold">City
                    <select value={cityId} onChange={e => setCityId(e.target.value)} className={field + ' mt-1 block'}>
                      <option value="">Any</option>
                      {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </label>
                  <button disabled={busy} className="rounded-full bg-[#0f5c5a] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#0b4846] disabled:opacity-60">
                    {busy ? 'Searching...' : 'Search'}
                  </button>
                </form>

                {error && <p role="alert" className="text-sm font-medium text-[#c0392b]">{error}</p>}

                {rows.length === 0 && !busy ? (
                  <p className="rounded-2xl border border-[#e5eceb] p-10 text-center text-[#5d7776]">No verified profiles match yet. Try changing the filters.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {rows.map(r => (
                      <Link key={r.profile_id} href={`/matrimony/${r.profile_id}`}
                        className="overflow-hidden rounded-2xl border border-[#e5eceb] bg-white shadow-sm transition hover:shadow-md">
                        <Thumb src={r.blur_thumb} name={r.first_name} />
                        <div className="p-3">
                          <p className="font-extrabold">{r.first_name}, {r.age_years}</p>
                          <p className="truncate text-sm text-[#5d7776]">{r.city_name}</p>
                          <p className="truncate text-xs text-[#5d7776]">{r.education}</p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {r.featured && <span className="rounded-full bg-[#f0a500] px-2 py-0.5 text-[11px] font-extrabold text-[#3a2900]">Featured</span>}
                            {r.created_by === 'parent' && <span className="rounded-full bg-[#f3f7f6] px-2 py-0.5 text-[11px] font-bold text-[#5d7776]">By parent</span>}
                            {r.unlocked && <span className="rounded-full bg-[#e3efee] px-2 py-0.5 text-[11px] font-bold text-[#0f5c5a]">Unlocked</span>}
                            {r.interest_status === 'pending' && <span className="rounded-full bg-[#fff4d6] px-2 py-0.5 text-[11px] font-bold text-[#7a5600]">Interest pending</span>}
                            {r.interest_status === 'accepted' && <span className="rounded-full bg-[#e3f6e8] px-2 py-0.5 text-[11px] font-bold text-[#1c7a37]">Connected</span>}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}

            {tab === 'interests' && (
              interests.length === 0 ? (
                <p className="rounded-2xl border border-[#e5eceb] p-10 text-center text-[#5d7776]">No interests yet. Unlock a profile and send your interest.</p>
              ) : (
                <div className="space-y-3">
                  {interests.map(i => (
                    <div key={i.interest_id} className="flex items-center gap-4 rounded-2xl border border-[#e5eceb] p-3">
                      <Link href={`/matrimony/${i.profile_id}`} className="block h-20 w-16 shrink-0 overflow-hidden rounded-xl">
                        <Thumb src={i.blur_thumb} name={i.first_name} />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold">{i.first_name}, {i.age_years}{i.city_name ? ` · ${i.city_name}` : ''}</p>
                        <p className="text-xs font-semibold text-[#5d7776]">
                          {i.direction === 'received' ? 'Sent you an interest' : 'You sent an interest'}
                        </p>
                        {i.message && <p className="mt-1 line-clamp-2 text-sm">{i.message}</p>}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        {i.direction === 'received' && i.status === 'pending' && (
                          <div className="flex gap-2">
                            <button onClick={() => respond(i, false)} className="rounded-full px-4 py-1.5 text-sm font-semibold hover:bg-[#f3f7f6]">Decline</button>
                            <button onClick={() => respond(i, true)} className="rounded-full bg-[#0f5c5a] px-5 py-1.5 text-sm font-bold text-white hover:bg-[#0b4846]">Accept</button>
                          </div>
                        )}
                        {i.direction === 'sent' && i.status === 'pending' && (
                          <>
                            <span className="rounded-full bg-[#fff4d6] px-3 py-1 text-xs font-bold text-[#7a5600]">Waiting</span>
                            <button onClick={() => withdraw(i)} className="text-xs font-semibold text-[#5d7776] underline">Withdraw</button>
                          </>
                        )}
                        {i.status === 'accepted' && i.conversation_id && (
                          <Link href={`/messages?c=${i.conversation_id}`} className="rounded-full bg-[#0f5c5a] px-5 py-1.5 text-sm font-bold text-white hover:bg-[#0b4846]">Open chat</Link>
                        )}
                        {i.status === 'declined' && (
                          <span className="rounded-full bg-[#f3f7f6] px-3 py-1 text-xs font-bold text-[#5d7776]">
                            {i.direction === 'sent' ? 'Not accepted' : 'Declined'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {tab === 'plans' && (
              <div className="space-y-3">
                <p className="rounded-2xl bg-[#fff8e6] p-4 text-sm text-[#5a4300]">
                  <b>Beta:</b> every member is on the Normal plan for free. Paid plans start after launch.
                </p>
                <div className="grid gap-3 md:grid-cols-3">
                  {TIERS.map(t => (
                    <div key={t.id} className={`rounded-2xl border p-4 ${quota?.tier === t.id ? 'border-[#0f5c5a] bg-[#f1f8f7]' : 'border-[#e5eceb]'}`}>
                      <p className="text-lg font-extrabold">{t.name}</p>
                      <p className="font-bold text-[#0f5c5a]">{t.price}</p>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                        {t.perks.map(p => <li key={p}>{p}</li>)}
                      </ul>
                      {quota?.tier === t.id && <p className="mt-3 text-xs font-bold text-[#0f5c5a]">Your current plan</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <AdColumns ads={ads} cityName={cityName} />
      </main>

      {toast && (
        <div role="status" className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#12302f] px-5 py-3 text-sm font-semibold text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  )
}
