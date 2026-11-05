// FILE: app/admin/page.tsx  (GitHub mein is path par paste karo)
'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Author = { full_name: string | null; username: string | null }
type PostRef = { id: string; body: string | null; category: string; profiles: Author | Author[] | null }
type ReportRow = {
  id: string
  post_id: string
  reason: string
  details: string | null
  posts: PostRef | PostRef[] | null
}
type Group = {
  postId: string
  body: string
  category: string
  author: string
  reports: { reason: string; details: string | null }[]
}
type CityRef = { name: string }
type Ad = {
  id: string
  slot: string
  title: string
  body: string | null
  image_url: string | null
  media_type: string
  link_url: string
  advertiser: string | null
  city_id: number | null
  starts_at: string
  ends_at: string
  is_active: boolean
  impressions: number
  clicks: number
  cities: CityRef | CityRef[] | null
}
type City = { id: number; name: string; state: string }

const one = <T,>(v: T | T[] | null | undefined): T | null =>
  Array.isArray(v) ? (v[0] ?? null) : (v ?? null)

const REASON_LABEL: Record<string, string> = {
  spam: 'Spam or scam', abuse: 'Abuse or harassment', hate: 'Hate speech',
  nudity: 'Nudity or sexual content', fake: 'False information', other: 'Something else',
}
const SLOTS = [
  { id: 'right_1', label: 'Right sidebar, upper ad' },
  { id: 'right_2', label: 'Right sidebar, lower ad' },
  { id: 'left_1', label: 'Left sidebar ad' },
]
const slotLabel = (id: string) => SLOTS.find(s => s.id === id)?.label ?? id

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'video/mp4', 'video/webm']
const ACCEPT = ALLOWED.join(',')
const SIZE_HINT: Record<string, string> = {
  right_1: 'Best size 1200 x 600 px (2:1)',
  right_2: 'Best size 1200 x 600 px (2:1)',
  left_1: 'Best size 1280 x 800 px (16:10)',
}
const typeFromUrl = (u: string) => (/\.(mp4|webm)(\?.*)?$/i.test(u.trim()) ? 'video' : 'image')

const field = 'w-full rounded-xl border border-[#dbe5e4] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0f5c5a]'

export default function AdminPage() {
  const [supabase] = useState(() => createClient())
  const router = useRouter()

  const [state, setState] = useState<'loading' | 'denied' | 'ok'>('loading')
  const [tab, setTab] = useState<'reports' | 'ads'>('reports')
  const [groups, setGroups] = useState<Group[]>([])
  const [ads, setAds] = useState<Ad[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [nowMs, setNowMs] = useState(0)
  const [toast, setToast] = useState('')
  const [saving, setSaving] = useState(false)

  const [slot, setSlot] = useState('right_1')
  const [cityId, setCityId] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [advertiser, setAdvertiser] = useState('')
  const [startsOn, setStartsOn] = useState(() => new Date().toISOString().slice(0, 10))
  const [endsOn, setEndsOn] = useState('')
  const [mediaType, setMediaType] = useState('image')
  const [fileName, setFileName] = useState('')
  const [uploading, setUploading] = useState(false)

  const notify = useCallback((t: string) => {
    setToast(t)
    setTimeout(() => setToast(''), 3500)
  }, [])

  const loadReports = useCallback(async () => {
    const { data, error } = await supabase
      .from('post_reports')
      .select('id, post_id, reason, details, posts(id, body, category, profiles!author_id(full_name, username))')
      .order('created_at', { ascending: false })
    if (error) return notify(error.message)
    const map = new Map<string, Group>()
    for (const r of (data ?? []) as unknown as ReportRow[]) {
      const post = one(r.posts)
      if (!post) continue
      const a = one(post.profiles)
      const g = map.get(r.post_id) ?? {
        postId: r.post_id,
        body: post.body ?? '',
        category: post.category,
        author: a ? `${a.full_name ?? 'User'} (@${a.username ?? 'user'})` : 'Unknown',
        reports: [],
      }
      g.reports.push({ reason: r.reason, details: r.details })
      map.set(r.post_id, g)
    }
    setGroups(Array.from(map.values()).sort((x, y) => y.reports.length - x.reports.length))
  }, [supabase, notify])

  const loadAds = useCallback(async () => {
    const { data, error } = await supabase
      .from('ads')
      .select('*, cities(name)')
      .order('created_at', { ascending: false })
    if (error) return notify(error.message)
    setAds((data ?? []) as unknown as Ad[])
    setNowMs(Date.now())
  }, [supabase, notify])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
      if (me?.role !== 'admin') { setState('denied'); return }
      setState('ok')
      loadReports()
      loadAds()
      supabase.from('cities').select('id, name, state').order('name')
        .then(({ data }) => setCities((data ?? []) as City[]))
    }
    init()
  }, [supabase, router, loadReports, loadAds])

  async function deletePost(postId: string) {
    if (!window.confirm('Delete this post permanently?')) return
    const { error } = await supabase.from('posts').delete().eq('id', postId)
    if (error) return notify(error.message)
    notify('Post deleted.')
    loadReports()
  }

  async function dismiss(postId: string) {
    const { error } = await supabase.from('post_reports').delete().eq('post_id', postId)
    if (error) return notify(error.message)
    notify('Reports dismissed.')
    loadReports()
  }

  async function uploadMedia(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!ALLOWED.includes(file.type)) return notify('Use JPG, PNG, WEBP, GIF, AVIF, MP4 or WEBM.')
    if (file.size > 50 * 1024 * 1024) return notify('File is too large. Maximum is 50 MB.')
    setUploading(true)
    const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin'
    const path = `${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage
      .from('ads')
      .upload(path, file, { contentType: file.type, cacheControl: '31536000' })
    setUploading(false)
    if (error) return notify(error.message)
    const { data } = supabase.storage.from('ads').getPublicUrl(path)
    const isVideo = file.type.startsWith('video/')
    setImageUrl(data.publicUrl)
    setMediaType(isVideo ? 'video' : 'image')
    setFileName(file.name)
    notify(isVideo && file.size > 10 * 1024 * 1024 ? 'Uploaded. Tip: videos under 10 MB load faster.' : 'Uploaded.')
  }

  async function createAd(e: React.FormEvent) {
    e.preventDefault()
    if (!endsOn) return notify('Choose an end date.')
    setSaving(true)
    const { error } = await supabase.from('ads').insert({
      slot,
      title: title.trim(),
      body: body.trim() || null,
      image_url: imageUrl.trim() || null,
      media_type: mediaType,
      link_url: linkUrl.trim(),
      advertiser: advertiser.trim() || null,
      city_id: cityId ? Number(cityId) : null,
      starts_at: new Date(startsOn).toISOString(),
      ends_at: new Date(`${endsOn}T23:59:59`).toISOString(),
    })
    setSaving(false)
    if (error) return notify(error.message)
    setTitle(''); setBody(''); setImageUrl(''); setMediaType('image'); setFileName(''); setLinkUrl(''); setAdvertiser(''); setEndsOn('')
    notify('Ad created.')
    loadAds()
  }

  async function toggleAd(ad: Ad) {
    const { error } = await supabase.from('ads').update({ is_active: !ad.is_active }).eq('id', ad.id)
    if (error) return notify(error.message)
    loadAds()
  }

  async function deleteAd(id: string) {
    if (!window.confirm('Delete this ad and its stats?')) return
    const { error } = await supabase.from('ads').delete().eq('id', id)
    if (error) return notify(error.message)
    loadAds()
  }

  function status(a: Ad) {
    if (!a.is_active) return 'Paused'
    if (new Date(a.ends_at).getTime() < nowMs) return 'Expired'
    if (new Date(a.starts_at).getTime() > nowMs) return 'Scheduled'
    return 'Live'
  }

  if (state === 'loading') {
    return <div className="grid min-h-screen place-items-center font-semibold text-[#0f5c5a]">Loading...</div>
  }
  if (state === 'denied') {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div>
          <h1 className="text-xl font-extrabold">Not allowed</h1>
          <p className="mt-1 text-[#5d7776]">This page is only for MilapHub admins.</p>
          <Link href="/home" className="mt-4 inline-block rounded-full bg-[#0f5c5a] px-5 py-2 font-bold text-white">Back to home</Link>
        </div>
      </div>
    )
  }

  const tabBtn = (t: 'reports' | 'ads', label: string) => (
    <button
      onClick={() => setTab(t)}
      className={`rounded-full px-5 py-2 text-sm font-bold ${tab === t ? 'bg-[#0f5c5a] text-white' : 'bg-[#f3f7f6] text-[#12302f] hover:bg-[#e3efee]'}`}
    >
      {label}
    </button>
  )

  return (
    <div className="min-h-screen bg-white text-[#12302f]">
      <header className="border-b border-[#e5eceb]">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <h1 className="text-xl font-extrabold">MilapHub Admin</h1>
          <Link href="/home" className="rounded-full border border-[#dbe5e4] px-4 py-2 text-sm font-semibold hover:bg-[#f3f7f6]">Back to home</Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-5 px-4 py-6">
        <div className="flex gap-2">
          {tabBtn('reports', `Reports (${groups.length})`)}
          {tabBtn('ads', `Ads (${ads.length})`)}
        </div>

        {tab === 'reports' && (
          groups.length === 0 ? (
            <p className="rounded-2xl border border-[#e5eceb] p-10 text-center text-[#5d7776]">No reported posts. All clear.</p>
          ) : (
            groups.map(g => {
              const counts: Record<string, number> = {}
              g.reports.forEach(r => { counts[r.reason] = (counts[r.reason] ?? 0) + 1 })
              return (
                <article key={g.postId} className="rounded-2xl border border-[#e5eceb] p-4 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold">{g.author}</span>
                    <span className="rounded-full bg-[#e3efee] px-3 py-1 text-xs font-bold text-[#0f5c5a]">{g.category}</span>
                    <span className="ml-auto rounded-full bg-[#fdecea] px-3 py-1 text-xs font-bold text-[#c0392b]">
                      {g.reports.length} {g.reports.length === 1 ? 'report' : 'reports'}
                    </span>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap rounded-xl bg-[#f3f7f6] p-3 text-[15px]">{g.body}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                    {Object.entries(counts).map(([k, n]) => (
                      <span key={k} className="rounded-full border border-[#dbe5e4] px-3 py-1">{REASON_LABEL[k] ?? k}: {n}</span>
                    ))}
                  </div>
                  {g.reports.some(r => r.details) && (
                    <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[#5d7776]">
                      {g.reports.filter(r => r.details).map((r, i) => <li key={i}>{r.details}</li>)}
                    </ul>
                  )}
                  <div className="mt-4 flex justify-end gap-2">
                    <button onClick={() => dismiss(g.postId)} className="rounded-full px-4 py-2 text-sm font-semibold hover:bg-[#f3f7f6]">Dismiss reports</button>
                    <button onClick={() => deletePost(g.postId)} className="rounded-full bg-[#c0392b] px-5 py-2 text-sm font-bold text-white hover:brightness-110">Delete post</button>
                  </div>
                </article>
              )
            })
          )
        )}

        {tab === 'ads' && (
          <>
            <form onSubmit={createAd} className="space-y-3 rounded-2xl border border-[#e5eceb] p-4 shadow-sm">
              <h2 className="font-extrabold">Create new ad</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-semibold">Slot
                  <select value={slot} onChange={e => setSlot(e.target.value)} className={field + ' mt-1'}>
                    {SLOTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </label>
                <label className="text-sm font-semibold">City
                  <select value={cityId} onChange={e => setCityId(e.target.value)} className={field + ' mt-1'}>
                    <option value="">All India</option>
                    {cities.map(c => <option key={c.id} value={c.id}>{c.name}, {c.state}</option>)}
                  </select>
                </label>
                <label className="text-sm font-semibold">Title (max 80)
                  <input required maxLength={80} value={title} onChange={e => setTitle(e.target.value)} className={field + ' mt-1'} />
                </label>
                <label className="text-sm font-semibold">Advertiser name
                  <input value={advertiser} onChange={e => setAdvertiser(e.target.value)} className={field + ' mt-1'} />
                </label>
                <label className="text-sm font-semibold sm:col-span-2">Short text (max 160, optional)
                  <input maxLength={160} value={body} onChange={e => setBody(e.target.value)} className={field + ' mt-1'} />
                </label>
                <label className="text-sm font-semibold">Click link (https://...)
                  <input required type="url" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} className={field + ' mt-1'} />
                </label>
                <label className="text-sm font-semibold">Start date
                  <input required type="date" value={startsOn} onChange={e => setStartsOn(e.target.value)} className={field + ' mt-1'} />
                </label>
                <label className="text-sm font-semibold">End date
                  <input required type="date" value={endsOn} onChange={e => setEndsOn(e.target.value)} className={field + ' mt-1'} />
                </label>
                <div className="space-y-2 sm:col-span-2">
                  <p className="text-sm font-semibold">
                    Ad image or video <span className="font-normal text-[#5d7776]">({SIZE_HINT[slot]})</span>
                  </p>
                  <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-[#c9d9d7] px-4 py-5 text-center text-sm font-semibold text-[#0f5c5a] hover:bg-[#f3f7f6] focus-within:ring-2 focus-within:ring-[#0f5c5a]/40">
                    {uploading
                      ? 'Uploading...'
                      : fileName
                        ? `Uploaded: ${fileName} (click to replace)`
                        : 'Click to upload JPG, PNG, WEBP, GIF, AVIF, MP4 or WEBM (max 50 MB)'}
                    <input type="file" accept={ACCEPT} onChange={uploadMedia} disabled={uploading} className="sr-only" />
                  </label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={e => { setImageUrl(e.target.value); setMediaType(typeFromUrl(e.target.value)); setFileName('') }}
                    placeholder="or paste an https:// image or video link"
                    className={field}
                  />
                  {imageUrl && (
                    <div className="overflow-hidden rounded-xl bg-[#f3f7f6]">
                      {mediaType === 'video' ? (
                        <video src={imageUrl} muted loop playsInline controls preload="metadata" className="max-h-44 w-full object-contain" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={imageUrl} alt="Ad preview" className="max-h-44 w-full object-contain" />
                      )}
                    </div>
                  )}
                </div>
              </div>
              <button disabled={saving || uploading} className="rounded-full bg-[#0f5c5a] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#0b4846] disabled:opacity-50">
                {saving ? 'Saving...' : 'Create ad'}
              </button>
            </form>

            {ads.length === 0 ? (
              <p className="rounded-2xl border border-[#e5eceb] p-10 text-center text-[#5d7776]">No ads yet.</p>
            ) : (
              ads.map(a => {
                const st = status(a)
                const ctr = a.impressions ? ((a.clicks / a.impressions) * 100).toFixed(1) : '0.0'
                const city = one(a.cities)
                return (
                  <article key={a.id} className="rounded-2xl border border-[#e5eceb] p-4 shadow-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold">{a.title}</span>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${st === 'Live' ? 'bg-[#e3f6e8] text-[#1c7a37]' : 'bg-[#f3f7f6] text-[#5d7776]'}`}>{st}</span>
                      <span className="ml-auto text-sm text-[#5d7776]">{a.advertiser ?? 'No advertiser name'}</span>
                    </div>
                    <p className="mt-1 text-sm text-[#5d7776]">
                      {slotLabel(a.slot)} · {city?.name ?? 'All India'} · {new Date(a.starts_at).toLocaleDateString('en-IN')} to {new Date(a.ends_at).toLocaleDateString('en-IN')}
                    </p>
                    {a.image_url && (
                      <div className="mt-3 overflow-hidden rounded-xl bg-[#f3f7f6]">
                        {a.media_type === 'video' ? (
                          <video src={a.image_url} muted loop playsInline controls preload="metadata" className="max-h-40 w-full object-contain" />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={a.image_url} alt="" className="max-h-40 w-full object-contain" />
                        )}
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-sm font-semibold">
                      <span>Views: {a.impressions}</span>
                      <span>Clicks: {a.clicks}</span>
                      <span>CTR: {ctr}%</span>
                      <div className="ml-auto flex gap-2">
                        <button onClick={() => toggleAd(a)} className="rounded-full border border-[#dbe5e4] px-4 py-1.5 hover:bg-[#f3f7f6]">
                          {a.is_active ? 'Pause' : 'Resume'}
                        </button>
                        <button onClick={() => deleteAd(a.id)} className="rounded-full px-4 py-1.5 text-[#c0392b] hover:bg-[#fdf3f2]">Delete</button>
                      </div>
                    </div>
                  </article>
                )
              })
            )}
          </>
        )}
      </main>

      {toast && (
        <div role="status" className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#12302f] px-5 py-3 text-sm font-semibold text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  )
}
