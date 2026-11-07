// FILE: app/admin/page.tsx  (GitHub mein is path par paste karo)
'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { storagePath } from '@/lib/image'
import { categoryLabel, inr, bazaarPath } from '@/lib/bazaar'

type Author = { full_name: string | null; username: string | null }
type PostRef = { id: string; body: string | null; category: string; media_url: string | null; profiles: Author | Author[] | null }
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
  media: string | null
  author: string
  reports: { reason: string; details: string | null }[]
}
type CommentRef = { id: string; body: string; profiles: Author | Author[] | null }
type CReportRow = {
  id: string
  comment_id: string
  reason: string
  details: string | null
  post_comments: CommentRef | CommentRef[] | null
}
type CGroup = {
  commentId: string
  body: string
  author: string
  reports: { reason: string; details: string | null }[]
}
type PendingListing = {
  id: string
  listing_type: string
  title: string
  price: number
  category: string
  condition: string
  locality: string | null
  description: string | null
  image_urls: string[]
  profiles: Author | Author[] | null
}
type ListingRef = { id: string; title: string; price: number; image_urls: string[]; status: string }
type LReportRow = {
  id: string
  listing_id: string
  reason: string
  details: string | null
  listings: ListingRef | ListingRef[] | null
}
type LGroup = {
  listingId: string
  title: string
  price: number
  images: string[]
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
  { id: 'bazaar_top', label: 'Bazaar, top banner' },
  { id: 'bazaar_grid', label: 'Bazaar, inside listings and listing page' },
  { id: 'bazaar_side_left', label: 'Bazaar, left tall banner (large desktop)' },
  { id: 'bazaar_side_right', label: 'Bazaar, right tall banner (large desktop)' },
]
const slotLabel = (id: string) => SLOTS.find(s => s.id === id)?.label ?? id

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'video/mp4', 'video/webm']
const ACCEPT = ALLOWED.join(',')
const SIZE_HINT: Record<string, string> = {
  right_1: 'Best size 1200 x 600 px (2:1)',
  right_2: 'Best size 1200 x 600 px (2:1)',
  left_1: 'Best size 1280 x 800 px (16:10)',
  bazaar_top: 'Best size 1600 x 400 px (4:1, wide banner)',
  bazaar_grid: 'Best size 800 x 800 px (square)',
  bazaar_side_left: 'Best size 600 x 1000 px (3:5, tall banner)',
  bazaar_side_right: 'Best size 600 x 1000 px (3:5, tall banner)',
}
const typeFromUrl = (u: string) => (/\.(mp4|webm)(\?.*)?$/i.test(u.trim()) ? 'video' : 'image')

const field = 'w-full rounded-xl border border-[#dbe5e4] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0f5c5a]'

export default function AdminPage() {
  const [supabase] = useState(() => createClient())
  const router = useRouter()

  const [state, setState] = useState<'loading' | 'denied' | 'ok'>('loading')
  const [tab, setTab] = useState<'reports' | 'comments' | 'ads' | 'bazaar'>('reports')
  const [groups, setGroups] = useState<Group[]>([])
  const [cGroups, setCGroups] = useState<CGroup[]>([])
  const [ads, setAds] = useState<Ad[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [isSuper, setIsSuper] = useState(false)
  const [canBazaar, setCanBazaar] = useState(false)
  const [pending, setPending] = useState<PendingListing[]>([])
  const [lGroups, setLGroups] = useState<LGroup[]>([])
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
      .select('id, post_id, reason, details, posts(id, body, category, media_url, profiles!author_id(full_name, username))')
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
        media: post.media_url,
        author: a ? `${a.full_name ?? 'User'} (@${a.username ?? 'user'})` : 'Unknown',
        reports: [],
      }
      g.reports.push({ reason: r.reason, details: r.details })
      map.set(r.post_id, g)
    }
    setGroups(Array.from(map.values()).sort((x, y) => y.reports.length - x.reports.length))
  }, [supabase, notify])

  const loadCommentReports = useCallback(async () => {
    const { data, error } = await supabase
      .from('comment_reports')
      .select('id, comment_id, reason, details, post_comments(id, body, profiles!author_id(full_name, username))')
      .order('created_at', { ascending: false })
    if (error) return notify(error.message)
    const map = new Map<string, CGroup>()
    for (const r of (data ?? []) as unknown as CReportRow[]) {
      const c = one(r.post_comments)
      if (!c) continue
      const a = one(c.profiles)
      const g = map.get(r.comment_id) ?? {
        commentId: r.comment_id,
        body: c.body,
        author: a ? `${a.full_name ?? 'User'} (@${a.username ?? 'user'})` : 'Unknown',
        reports: [],
      }
      g.reports.push({ reason: r.reason, details: r.details })
      map.set(r.comment_id, g)
    }
    setCGroups(Array.from(map.values()).sort((x, y) => y.reports.length - x.reports.length))
  }, [supabase, notify])

  const loadBazaar = useCallback(async () => {
    const { data, error } = await supabase
      .from('listings')
      .select('id, listing_type, title, price, category, condition, locality, description, image_urls, profiles!seller_id(full_name, username)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
    if (error) return notify(error.message)
    setPending((data ?? []) as unknown as PendingListing[])

    const { data: rep, error: e2 } = await supabase
      .from('listing_reports')
      .select('id, listing_id, reason, details, listings(id, title, price, image_urls, status)')
      .order('created_at', { ascending: false })
    if (e2) return notify(e2.message)
    const map = new Map<string, LGroup>()
    for (const r of (rep ?? []) as unknown as LReportRow[]) {
      const l = one(r.listings)
      if (!l || l.status !== 'approved') continue
      const g = map.get(r.listing_id) ?? { listingId: l.id, title: l.title, price: l.price, images: l.image_urls, reports: [] }
      g.reports.push({ reason: r.reason, details: r.details })
      map.set(r.listing_id, g)
    }
    setLGroups(Array.from(map.values()).sort((a, b) => b.reports.length - a.reports.length))
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
      const superAdmin = me?.role === 'admin'
      let bazaar = superAdmin
      if (!superAdmin) {
        const { data: sc } = await supabase.from('admin_scopes').select('scope').eq('user_id', user.id)
        bazaar = (sc ?? []).some(r => r.scope === 'bazaar')
      }
      if (!superAdmin && !bazaar) { setState('denied'); return }
      setIsSuper(superAdmin)
      setCanBazaar(bazaar)
      setTab(superAdmin ? 'reports' : 'bazaar')
      setState('ok')
      if (superAdmin) {
        loadReports()
        loadCommentReports()
        loadAds()
        supabase.from('cities').select('id, name, state').order('name')
          .then(({ data }) => setCities((data ?? []) as City[]))
      }
      if (bazaar) loadBazaar()
    }
    init()
  }, [supabase, router, loadReports, loadCommentReports, loadAds, loadBazaar])

  async function deletePost(postId: string, media: string | null) {
    if (!window.confirm('Delete this post permanently?')) return
    const { error } = await supabase.from('posts').delete().eq('id', postId)
    if (error) return notify(error.message)
    const path = storagePath(media)
    if (path) await supabase.storage.from('posts').remove([path])
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

  async function deleteComment(commentId: string) {
    if (!window.confirm('Delete this comment permanently?')) return
    const { error } = await supabase.from('post_comments').delete().eq('id', commentId)
    if (error) return notify(error.message)
    notify('Comment deleted.')
    loadCommentReports()
  }

  async function dismissComment(commentId: string) {
    const { error } = await supabase.from('comment_reports').delete().eq('comment_id', commentId)
    if (error) return notify(error.message)
    notify('Reports dismissed.')
    loadCommentReports()
  }

  async function approveListing(id: string) {
    const { data, error } = await supabase.from('listings').update({ status: 'approved' }).eq('id', id).select('id')
    if (error) return notify(error.message)
    if (!data || data.length === 0) return notify('Could not approve this listing.')
    notify('Listing approved.')
    loadBazaar()
  }

  async function rejectListing(id: string) {
    const reason = window.prompt('Why is this listing rejected? The seller will see this reason.')
    if (reason === null) return
    const { error } = await supabase
      .from('listings').update({ status: 'rejected', reject_reason: reason.trim() || null }).eq('id', id)
    if (error) return notify(error.message)
    notify('Listing rejected.')
    loadBazaar()
  }

  async function removeListing(id: string, images: string[]) {
    if (!window.confirm('Remove this listing from Bazaar?')) return
    const { error } = await supabase.from('listings').update({ status: 'removed' }).eq('id', id)
    if (error) return notify(error.message)
    const paths = images.map(bazaarPath).filter((p): p is string => !!p)
    if (paths.length) await supabase.storage.from('bazaar').remove(paths)
    notify('Listing removed.')
    loadBazaar()
  }

  async function dismissListing(id: string) {
    const { error } = await supabase.from('listing_reports').delete().eq('listing_id', id)
    if (error) return notify(error.message)
    notify('Reports dismissed.')
    loadBazaar()
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

  const tabBtn = (t: 'reports' | 'comments' | 'ads' | 'bazaar', label: string) => (
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
          {isSuper && tabBtn('reports', `Reports (${groups.length})`)}
          {isSuper && tabBtn('comments', `Comment reports (${cGroups.length})`)}
          {isSuper && tabBtn('ads', `Ads (${ads.length})`)}
          {canBazaar && tabBtn('bazaar', `Bazaar (${pending.length})`)}
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
                  {g.body && <p className="mt-3 whitespace-pre-wrap rounded-xl bg-[#f3f7f6] p-3 text-[15px]">{g.body}</p>}
                  {g.media && (
                    <div className="mt-3 overflow-hidden rounded-xl bg-[#f3f7f6]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={g.media} alt="Reported photo" className="max-h-72 w-full object-contain" />
                    </div>
                  )}
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
                    <button onClick={() => deletePost(g.postId, g.media)} className="rounded-full bg-[#c0392b] px-5 py-2 text-sm font-bold text-white hover:brightness-110">Delete post</button>
                  </div>
                </article>
              )
            })
          )
        )}

        {tab === 'comments' && (
          cGroups.length === 0 ? (
            <p className="rounded-2xl border border-[#e5eceb] p-10 text-center text-[#5d7776]">No reported comments. All clear.</p>
          ) : (
            cGroups.map(g => {
              const counts: Record<string, number> = {}
              g.reports.forEach(r => { counts[r.reason] = (counts[r.reason] ?? 0) + 1 })
              return (
                <article key={g.commentId} className="rounded-2xl border border-[#e5eceb] p-4 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold">{g.author}</span>
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
                    <button onClick={() => dismissComment(g.commentId)} className="rounded-full px-4 py-2 text-sm font-semibold hover:bg-[#f3f7f6]">Dismiss reports</button>
                    <button onClick={() => deleteComment(g.commentId)} className="rounded-full bg-[#c0392b] px-5 py-2 text-sm font-bold text-white hover:brightness-110">Delete comment</button>
                  </div>
                </article>
              )
            })
          )
        )}

        {tab === 'bazaar' && canBazaar && (
          <>
            <h2 className="text-lg font-extrabold">Waiting for approval ({pending.length})</h2>
            {pending.length === 0 ? (
              <p className="rounded-2xl border border-[#e5eceb] p-10 text-center text-[#5d7776]">No listings waiting. All clear.</p>
            ) : (
              pending.map(l => {
                const s = one(l.profiles)
                return (
                  <article key={l.id} className="rounded-2xl border border-[#e5eceb] p-4 shadow-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold">{l.title}</span>
                      {l.listing_type === 'wanted' && (
                        <span className="rounded-full bg-[#f0a500] px-3 py-1 text-xs font-extrabold text-[#3a2900]">WANTED</span>
                      )}
                      <span className="rounded-full bg-[#e3efee] px-3 py-1 text-xs font-bold text-[#0f5c5a]">{categoryLabel(l.category)}</span>
                      <span className="ml-auto text-lg font-extrabold">{inr(l.price)}</span>
                    </div>
                    <p className="mt-1 text-sm text-[#5d7776]">
                      Seller: {s?.full_name ?? 'Unknown'} (@{s?.username ?? 'user'}) · {l.condition === 'new' ? 'New' : 'Used'}
                      {l.locality ? ` · ${l.locality}` : ''}
                    </p>
                    {l.description && (
                      <p className="mt-2 whitespace-pre-wrap rounded-xl bg-[#f3f7f6] p-3 text-sm">{l.description}</p>
                    )}
                    <div className="mt-3 flex gap-2 overflow-x-auto">
                      {l.image_urls.map(u => (
                        <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="block h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-[#f3f7f6]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={u} alt="" className="h-full w-full object-cover" />
                        </a>
                      ))}
                    </div>
                    <div className="mt-4 flex justify-end gap-2">
                      <button onClick={() => rejectListing(l.id)} className="rounded-full px-5 py-2 text-sm font-semibold text-[#c0392b] hover:bg-[#fdf3f2]">Reject</button>
                      <button onClick={() => approveListing(l.id)} className="rounded-full bg-[#0f5c5a] px-6 py-2 text-sm font-bold text-white hover:bg-[#0b4846]">Approve</button>
                    </div>
                  </article>
                )
              })
            )}

            <h2 className="pt-4 text-lg font-extrabold">Reported listings ({lGroups.length})</h2>
            {lGroups.length === 0 ? (
              <p className="rounded-2xl border border-[#e5eceb] p-10 text-center text-[#5d7776]">No reported listings. All clear.</p>
            ) : (
              lGroups.map(g => {
                const counts: Record<string, number> = {}
                g.reports.forEach(r => { counts[r.reason] = (counts[r.reason] ?? 0) + 1 })
                return (
                  <article key={g.listingId} className="rounded-2xl border border-[#e5eceb] p-4 shadow-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold">{g.title}</span>
                      <span className="text-sm font-semibold">{inr(g.price)}</span>
                      <span className="ml-auto rounded-full bg-[#fdecea] px-3 py-1 text-xs font-bold text-[#c0392b]">
                        {g.reports.length} {g.reports.length === 1 ? 'report' : 'reports'}
                      </span>
                    </div>
                    <div className="mt-3 flex gap-2 overflow-x-auto">
                      {g.images.map(u => (
                        <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="block h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-[#f3f7f6]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={u} alt="" className="h-full w-full object-cover" />
                        </a>
                      ))}
                    </div>
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
                      <button onClick={() => dismissListing(g.listingId)} className="rounded-full px-4 py-2 text-sm font-semibold hover:bg-[#f3f7f6]">Dismiss reports</button>
                      <button onClick={() => removeListing(g.listingId, g.images)} className="rounded-full bg-[#c0392b] px-5 py-2 text-sm font-bold text-white hover:brightness-110">Remove listing</button>
                    </div>
                  </article>
                )
              })
            )}
          </>
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
                  <span className="mt-1 block text-xs font-normal text-[#5d7776]">Up to 5 live ads rotate in each slot.</span>
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
