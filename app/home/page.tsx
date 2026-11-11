// FILE: app/home/page.tsx  (GitHub mein is path par paste karo)
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AdSlot, { type Ad } from '@/components/AdSlot'
import FriendsPanel from '@/components/FriendsPanel'
import NotificationBell from '@/components/NotificationBell'
import { compressImage, storagePath } from '@/lib/image'

type City = { name: string; state: string }
type Profile = {
  id: string
  full_name: string | null
  username: string | null
  city_id: number | null
  is_verified_ngo: boolean
  role: string
  cities: City | City[] | null
}
type Author = { full_name: string | null; username: string | null }
type Post = {
  id: string
  author_id: string
  body: string | null
  category: string
  allow_tips: boolean
  status: string
  created_at: string
  edited_at: string | null
  media_url: string | null
  post_likes: { count: number }[] | null
  post_comments: { count: number }[] | null
  profiles: Author | Author[] | null
}
type Comment = {
  id: string
  author_id: string
  parent_id: string | null
  body: string
  created_at: string
  profiles: Author | Author[] | null
}

const likeCount = (p: { post_likes: { count: number }[] | null }) => p.post_likes?.[0]?.count ?? 0
const commentCount = (p: { post_comments: { count: number }[] | null }) => p.post_comments?.[0]?.count ?? 0

const one = <T,>(v: T | T[] | null | undefined): T | null =>
  Array.isArray(v) ? (v[0] ?? null) : (v ?? null)

const EMOJIS = ['😊', '😂', '❤️', '🙏', '👍', '🎉', '😍', '😢', '🔥', '🍲', '🌹', '✨']

const REASONS = [
  { id: 'spam', label: 'Spam or scam' },
  { id: 'abuse', label: 'Abuse or harassment' },
  { id: 'hate', label: 'Hate speech' },
  { id: 'nudity', label: 'Nudity or sexual content' },
  { id: 'fake', label: 'False information' },
  { id: 'other', label: 'Something else' },
]

const MENU_ITEM = 'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold hover:bg-[#f3f7f6]'
const MENU_ITEM_RED = 'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[#c0392b] hover:bg-[#fdf3f2]'

const TABS = ['Home', 'Reels', 'Matrimony', 'Bazaar', 'Pages']

const CATEGORIES = [
  { id: 'all', label: 'All posts', hint: 'See everything' },
  { id: 'news', label: 'Local stories', hint: 'City news and stories' },
  { id: 'confession', label: 'Confessions', hint: 'Anonymous thoughts' },
  { id: 'cooking', label: 'Cooking', hint: 'Recipes and videos' },
  { id: 'campaign', label: 'Campaigns', hint: 'Verified NGO appeals' },
]

const TAB_INFO: Record<string, string> = {
  Reels: 'Short vertical videos will appear here.',
  Matrimony: 'Verified matchmaking will appear here.',
  Bazaar: 'Local buying and selling in your city will appear here.',
  Pages: 'Public pages for creators and businesses will appear here.',
}

// Sample stories (static for now). Real stories need their own table and storage.
const STORIES = [
  { name: 'Farhana', bg: 'from-[#0f5c5a] to-[#12302f]' },
  { name: 'Zaid', bg: 'from-[#f0a500] to-[#b36b00]' },
  { name: 'Rubina', bg: 'from-[#2f8f8b] to-[#0f5c5a]' },
  { name: 'Arif', bg: 'from-[#3b5bdb] to-[#1c2f7a]' },
]

function Icon({ name, size = 24, fill = false }: { name: string; size?: number; fill?: boolean }) {
  const paths: Record<string, React.ReactNode> = {
    Home: (<><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" /></>),
    Reels: (<><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m10 9 5 3-5 3z" /></>),
    Matrimony: (<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />),
    Bazaar: (<><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></>),
    Pages: (<><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><path d="M4 22v-7" /></>),
    Grid: (<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>),
    Bell: (<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>),
    Logout: (<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></>),
    Trash: (<><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>),
    Dots: (<><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>),
    Edit: (<><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></>),
    Flag: (<><path d="M4 22V4" /><path d="M4 4h13l-2 4 2 4H4" /></>),
    Like: (<><path d="M7 10v12" /><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" /></>),
    Comment: (<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />),
    Share: (<><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.59 13.51 6.83 3.98" /><path d="m15.41 6.51-6.82 3.98" /></>),
    Bookmark: (<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />),
    Chain: (<><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></>),
    Video: (<><path d="m22 8-6 4 6 4V8z" /><rect x="2" y="6" width="14" height="12" rx="2" /></>),
    Photo: (<><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" /></>),
    Smile: (<><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><path d="M9 9h.01" /><path d="M15 9h.01" /></>),
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'} stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  )
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

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <span
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className="grid shrink-0 place-items-center rounded-full bg-[#f0a500] font-bold text-[#3a2900]"
    >
      {name.charAt(0).toUpperCase() || 'U'}
    </span>
  )
}

function useOutside(
  ref: { current: HTMLDivElement | null },
  open: boolean,
  setOpen: (v: boolean) => void
) {
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [ref, open, setOpen])
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
  const [profileOpen, setProfileOpen] = useState(false)
  const [body, setBody] = useState('')
  const [allowTips, setAllowTips] = useState(false)
  const [posting, setPosting] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  useOutside(menuRef, menuOpen, setMenuOpen)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [photo, setPhoto] = useState<{ blob: Blob; ext: string; preview: string } | null>(null)
  const emojiRef = useRef<HTMLDivElement>(null)
  const [emojiOpen, setEmojiOpen] = useState(false)

  useOutside(profileRef, profileOpen, setProfileOpen)
  useOutside(emojiRef, emojiOpen, setEmojiOpen)

  const [postMenu, setPostMenu] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [reportId, setReportId] = useState<string | null>(null)
  const [reason, setReason] = useState('spam')
  const [details, setDetails] = useState('')
  const [reporting, setReporting] = useState(false)
  const [reportKind, setReportKind] = useState<'post' | 'comment'>('post')
  const [toast, setToast] = useState('')
  const [adMap, setAdMap] = useState<Record<string, Ad[]>>({})
  const [liked, setLiked] = useState<Set<string>>(new Set())
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [openC, setOpenC] = useState<Set<string>>(new Set())
  const [comments, setComments] = useState<Record<string, Comment[]>>({})
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [cBusy, setCBusy] = useState<string | null>(null)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)

  function notify(t: string) {
    setToast(t)
    setTimeout(() => setToast(''), 3500)
  }

  useEffect(() => {
    if (!postMenu) return
    function onDown(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest('[data-postmenu]')) setPostMenu(null)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setPostMenu(null) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [postMenu])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, username, city_id, is_verified_ngo, role, cities(name, state)')
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

  const loadPosts = useCallback(async () => {
    if (!profile?.city_id) return
    let q = supabase
      .from('posts')
      .select('id, author_id, body, category, allow_tips, status, created_at, edited_at, media_url, post_likes(count), post_comments(count), profiles!author_id(full_name, username)')
      .eq('city_id', profile.city_id)
      .order('created_at', { ascending: false })
      .limit(30)
    if (category !== 'all') q = q.eq('category', category)
    const { data, error } = await q
    if (error) { setError(error.message); return }
    const rows = (data ?? []) as unknown as Post[]
    setPosts(rows)
    if (rows.length === 0) { setLiked(new Set()); return }
    const { data: lk } = await supabase
      .from('post_likes').select('post_id').eq('user_id', profile.id).in('post_id', rows.map(r => r.id))
    setLiked(new Set((lk ?? []).map(r => r.post_id as string)))
  }, [supabase, profile, category])

  useEffect(() => { loadPosts() }, [loadPosts])

  useEffect(() => {
    if (!profile) return
    supabase.from('saved_posts').select('post_id').eq('user_id', profile.id)
      .then(({ data }) => setSaved(new Set((data ?? []).map(r => r.post_id as string))))
  }, [supabase, profile])

  // Ads: 3 slots (left_1, right_1, right_2), har slot mein slideshow, apne city ya poore India ke liye
  useEffect(() => {
    if (!profile?.city_id) return
    supabase
      .from('ads')
      .select('id, slot, title, body, image_url, media_type, link_url, advertiser')
      .or(`city_id.is.null,city_id.eq.${profile.city_id}`)
      .then(({ data }) => {
        const rows = (data ?? []) as Ad[]
        const map: Record<string, Ad[]> = {}
        for (const slot of ['left_1', 'right_1', 'right_2']) {
          // Har slot mein max 5 ads slideshow ki tarah ghoomte hain (order random)
          const list = rows.filter(r => r.slot === slot).sort(() => Math.random() - 0.5).slice(0, 5)
          if (list.length) map[slot] = list
        }
        setAdMap(map)
      })
  }, [supabase, profile])

  async function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      return setError('Please choose a JPG, PNG or WEBP photo.')
    }
    if (file.size > 20 * 1024 * 1024) return setError('That photo is too large. Please choose one under 20 MB.')
    setError('')
    try {
      const { blob, ext } = await compressImage(file)
      if (photo) URL.revokeObjectURL(photo.preview)
      setPhoto({ blob, ext, preview: URL.createObjectURL(blob) })
    } catch {
      setError('Could not read that photo. Please try another one.')
    }
  }

  function removePhoto() {
    if (photo) URL.revokeObjectURL(photo.preview)
    setPhoto(null)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if ((!body.trim() && !photo) || !profile) return
    if (category === 'campaign' && !profile.is_verified_ngo) {
      return setError('Only verified NGOs can post campaigns.')
    }
    setPosting(true); setError(''); setMsg('')

    let mediaUrl: string | null = null
    let uploadedPath: string | null = null
    if (photo) {
      const path = `${profile.id}/${crypto.randomUUID()}.${photo.ext}`
      const { error: upErr } = await supabase.storage
        .from('posts')
        .upload(path, photo.blob, { contentType: photo.blob.type, cacheControl: '31536000' })
      if (upErr) { setPosting(false); return setError(upErr.message) }
      uploadedPath = path
      mediaUrl = supabase.storage.from('posts').getPublicUrl(path).data.publicUrl
    }

    const cat = category === 'all' ? 'general' : category
    const { error } = await supabase.from('posts').insert({
      author_id: profile.id,
      city_id: profile.city_id,
      category: cat,
      body: body.trim() || null,
      media_url: mediaUrl,
      allow_tips: cat === 'confession' ? false : allowTips,
    })
    if (error) {
      if (uploadedPath) await supabase.storage.from('posts').remove([uploadedPath])
      setPosting(false)
      return setError(error.message)
    }
    setPosting(false)
    setBody('')
    removePhoto()
    if (taRef.current) taRef.current.style.height = 'auto'
    loadPosts()
  }

  async function deletePost(id: string) {
    setPostMenu(null)
    if (!window.confirm('Delete this post? This cannot be undone.')) return
    const { data, error } = await supabase.from('posts').delete().eq('id', id).select('id')
    if (error) return notify(error.message)
    if (!data || data.length === 0) return notify('You are not allowed to delete this post.')
    const path = storagePath(posts.find(p => p.id === id)?.media_url)
    if (path) await supabase.storage.from('posts').remove([path])
    setPosts(list => list.filter(p => p.id !== id))
    notify('Post deleted.')
  }

  async function saveEdit(id: string) {
    const text = editText.trim()
    if (!text) return notify('A post cannot be empty.')
    const { data, error } = await supabase
      .from('posts').update({ body: text }).eq('id', id).select('id, body, edited_at')
    if (error) return notify(error.message)
    if (!data || data.length === 0) return notify('You are not allowed to edit this post.')
    setPosts(list => list.map(p =>
      p.id === id ? { ...p, body: data[0].body as string, edited_at: data[0].edited_at as string | null } : p
    ))
    setEditingId(null)
  }

  async function submitReport() {
    if (!reportId || !profile) return
    setReporting(true)
    const isComment = reportKind === 'comment'
    const { error } = await supabase.from(isComment ? 'comment_reports' : 'post_reports').insert(
      isComment
        ? { comment_id: reportId, reporter_id: profile.id, reason, details: details.trim() || null }
        : { post_id: reportId, reporter_id: profile.id, reason, details: details.trim() || null }
    )
    setReporting(false)
    if (error) return notify(error.code === '23505' ? `You already reported this ${reportKind}.` : error.message)
    setReportId(null); setReason('spam'); setDetails('')
    notify(`Thanks. Our team will review this ${reportKind}.`)
  }

  async function toggleComments(p: Post) {
    const isOpen = openC.has(p.id)
    setOpenC(prev => {
      const n = new Set(prev)
      if (isOpen) n.delete(p.id); else n.add(p.id)
      return n
    })
    if (isOpen) return
    const { data, error } = await supabase
      .from('post_comments')
      .select('id, author_id, parent_id, body, created_at, profiles!author_id(full_name, username)')
      .eq('post_id', p.id)
      .order('created_at', { ascending: true })
      .limit(100)
    if (error) return notify(error.message)
    setComments(prev => ({ ...prev, [p.id]: (data ?? []) as unknown as Comment[] }))
  }

  async function addComment(p: Post, parentId?: string) {
    const key = parentId ?? p.id
    const text = (drafts[key] ?? '').trim()
    if (!text || !profile) return
    setCBusy(key)
    const { data, error } = await supabase
      .from('post_comments')
      .insert({ post_id: p.id, author_id: profile.id, body: text, parent_id: parentId ?? null })
      .select('id, author_id, parent_id, body, created_at, profiles!author_id(full_name, username)')
      .single()
    setCBusy(null)
    if (error) return notify(error.message)
    setDrafts(prev => ({ ...prev, [key]: '' }))
    if (parentId) setReplyingTo(null)
    setComments(prev => ({ ...prev, [p.id]: [...(prev[p.id] ?? []), data as unknown as Comment] }))
    setPosts(list => list.map(x =>
      x.id === p.id ? { ...x, post_comments: [{ count: commentCount(x) + 1 }] } : x
    ))
  }

  function startReply(c: Comment, name: string) {
    const topId = c.parent_id ?? c.id
    setReplyingTo(topId)
    if (c.parent_id) {
      setDrafts(prev => (prev[topId] ? prev : { ...prev, [topId]: `@${name} ` }))
    }
  }

  async function deleteComment(p: Post, c: Comment) {
    if (!window.confirm('Delete this comment?')) return
    const { data, error } = await supabase.from('post_comments').delete().eq('id', c.id).select('id')
    if (error) return notify(error.message)
    if (!data || data.length === 0) return notify('You are not allowed to delete this comment.')
    const list = comments[p.id] ?? []
    const removed = list.filter(x => x.id === c.id || x.parent_id === c.id).length
    setComments(prev => ({ ...prev, [p.id]: list.filter(x => x.id !== c.id && x.parent_id !== c.id) }))
    setPosts(all => all.map(x =>
      x.id === p.id ? { ...x, post_comments: [{ count: Math.max(0, commentCount(x) - removed) }] } : x
    ))
  }

  async function toggleLike(p: Post) {
    if (!profile) return
    const isLiked = liked.has(p.id)
    setLiked(prev => {
      const n = new Set(prev)
      if (isLiked) n.delete(p.id); else n.add(p.id)
      return n
    })
    setPosts(list => list.map(x =>
      x.id === p.id ? { ...x, post_likes: [{ count: Math.max(0, likeCount(x) + (isLiked ? -1 : 1)) }] } : x
    ))
    const { error } = isLiked
      ? await supabase.from('post_likes').delete().eq('post_id', p.id).eq('user_id', profile.id)
      : await supabase.from('post_likes').insert({ post_id: p.id, user_id: profile.id })
    if (error) { notify(error.message); loadPosts() }
  }

  async function toggleSave(id: string) {
    if (!profile) return
    setPostMenu(null)
    const isSaved = saved.has(id)
    setSaved(prev => {
      const n = new Set(prev)
      if (isSaved) n.delete(id); else n.add(id)
      return n
    })
    const { error } = isSaved
      ? await supabase.from('saved_posts').delete().eq('post_id', id).eq('user_id', profile.id)
      : await supabase.from('saved_posts').insert({ post_id: id, user_id: profile.id })
    if (error) {
      notify(error.message)
      setSaved(prev => {
        const n = new Set(prev)
        if (isSaved) n.add(id); else n.delete(id)
        return n
      })
      return
    }
    notify(isSaved ? 'Removed from saved posts.' : 'Post saved.')
  }

  async function copyLink(id: string) {
    const url = `${window.location.origin}/post/${id}`
    try {
      await navigator.clipboard.writeText(url)
      notify('Link copied.')
    } catch {
      notify('Could not copy the link.')
    }
  }

  async function sharePost(p: Post) {
    const url = `${window.location.origin}/post/${p.id}`
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'MilapHub', text: (p.body ?? '').slice(0, 100), url })
      } catch {}
      return
    }
    copyLink(p.id)
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

  const selectTab = (t: string) => {
    if (t === 'Bazaar') router.push('/bazaar')
    else if (t === 'Matrimony') router.push('/matrimony')
    else setTab(t)
  }

  const renderComment = (p: Post, c: Comment, isReply: boolean) => {
    const ca = one(c.profiles)
    const cname = ca?.full_name ?? 'MilapHub user'
    const canDelete = c.author_id === profile.id || p.author_id === profile.id || profile.role === 'admin'
    return (
      <div key={c.id} className="flex items-start gap-2">
        <Avatar name={cname} size={isReply ? 28 : 32} />
        <div className="min-w-0 flex-1">
          <div className="inline-block max-w-full rounded-2xl bg-[#f3f7f6] px-3 py-2">
            <p className="text-sm font-bold leading-tight">{cname}</p>
            <p className="whitespace-pre-wrap break-words text-sm">{c.body}</p>
          </div>
          <div className="flex gap-3 pl-2">
            <button
              onClick={() => startReply(c, cname)}
              className="text-xs font-semibold text-[#5d7776] hover:text-[#0f5c5a] hover:underline"
            >
              Reply
            </button>
            {c.author_id !== profile.id && (
              <button
                onClick={() => { setReportKind('comment'); setReportId(c.id) }}
                className="text-xs font-semibold text-[#5d7776] hover:text-[#c0392b] hover:underline"
              >
                Report
              </button>
            )}
          </div>
        </div>
        {canDelete && (
          <button
            onClick={() => deleteComment(p, c)}
            aria-label="Delete comment"
            title="Delete comment"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#5d7776] hover:bg-[#fdecea] hover:text-[#c0392b]"
          >
            <Icon name="Trash" size={15} />
          </button>
        )}
      </div>
    )
  }

  const tabClass = (t: string) =>
    `flex h-full items-center justify-center border-b-[3px] transition ${
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
              <button key={t} onClick={() => selectTab(t)} title={t} aria-label={t}
                aria-current={tab === t} className={tabClass(t) + ' w-20 lg:w-24'}>
                <Icon name={t} />
              </button>
            ))}
          </nav>

          <div className="flex items-center justify-end gap-3">
            {/* Categories (grid) menu */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="Categories"
                title="Categories"
                onClick={() => setMenuOpen(o => !o)}
                className={`relative grid h-10 w-10 place-items-center rounded-full hover:bg-[#e3efee] ${menuOpen ? 'bg-[#e3efee] text-[#0f5c5a]' : 'bg-[#f3f7f6]'}`}
              >
                <Icon name="Grid" size={18} />
                {category !== 'all' && (
                  <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#f0a500]" />
                )}
              </button>
              {menuOpen && (
                <ul role="menu" className="absolute right-0 z-40 mt-2 w-72 overflow-hidden rounded-2xl border border-[#e5eceb] bg-white p-1.5 shadow-xl">
                  <li role="none" className="px-3 pb-1 pt-2 text-xs font-bold uppercase tracking-wider text-[#5d7776]">Categories</li>
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

            <Link href="/messages" aria-label="Messages" title="Messages"
              className="grid h-10 w-10 place-items-center rounded-full bg-[#f3f7f6] hover:bg-[#e3efee]">
              <Icon name="Comment" size={18} />
            </Link>

            <NotificationBell />

            {/* Profile menu */}
            <div className="relative" ref={profileRef}>
              <button onClick={() => setProfileOpen(o => !o)} aria-haspopup="menu"
                aria-expanded={profileOpen} aria-label="Profile menu" className="rounded-full">
                <Avatar name={name} />
              </button>
              {profileOpen && (
                <div role="menu" className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-2xl border border-[#e5eceb] bg-white p-2 shadow-xl">
                  <div className="flex items-center gap-3 p-2">
                    <Avatar name={name} size={44} />
                    <div className="min-w-0">
                      <p className="truncate font-bold leading-tight">{name}</p>
                      <p className="truncate text-xs text-[#5d7776]">@{profile.username}</p>
                      <p className="truncate text-xs text-[#5d7776]">{cityName}{city ? `, ${city.state}` : ''}</p>
                    </div>
                  </div>
                  <div className="my-1 border-t border-[#eef3f2]" />
                  {profile.role === 'admin' && (
                    <Link href="/admin" role="menuitem" className={MENU_ITEM}>
                      <Icon name="Grid" size={18} />
                      Admin panel
                    </Link>
                  )}
                  <button role="menuitem" onClick={signOut}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#c0392b] hover:bg-[#fdf3f2]">
                    <Icon name="Logout" size={18} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile tabs */}
        <nav className="flex border-t border-[#eef3f2] md:hidden" aria-label="Main mobile">
          {TABS.map(t => (
            <button key={t} onClick={() => selectTab(t)} title={t} aria-label={t}
              aria-current={tab === t} className={tabClass(t) + ' h-12 flex-1'}>
              <Icon name={t} />
            </button>
          ))}
        </nav>
      </header>

      <div className="mx-auto grid max-w-[1280px] gap-6 px-4 py-6 lg:grid-cols-[250px_minmax(0,1fr)_300px]">
        {/* LEFT SIDEBAR */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 flex h-[calc(100vh-7rem)] flex-col">
            <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-1 [scrollbar-width:thin]">
              <div className="mb-1 flex items-center gap-3 rounded-xl p-2">
                <Avatar name={name} size={36} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold leading-tight">{name}</p>
                  <p className="truncate text-xs text-[#5d7776]">{cityName}{city ? `, ${city.state}` : ''}</p>
                </div>
              </div>
              {[
                ['Fr', 'Friends'], ['Pg', 'Pages'], ['Gr', 'Groups'], ['Sv', 'Saved posts'],
                ['Mt', 'Matrimony dashboard'], ['₹', 'Treats and payouts'], ['St', 'Settings'],
              ].map(([ic, label]) => (
                <button
                  key={label}
                  onClick={() => {
                    if (label === 'Saved posts') router.push('/saved')
                    if (label === 'Friends') router.push('/messages')
                    if (label === 'Matrimony dashboard') router.push('/matrimony')
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left text-sm font-semibold hover:bg-[#f3f7f6]"
                >
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#e3efee] text-[11px] font-bold text-[#0f5c5a]">{ic}</span>
                  {label}
                </button>
              ))}
            </div>
            <div className="shrink-0 space-y-2 pt-3">
              <AdSlot ads={adMap.left_1} cityName={cityName} imgClass="aspect-[16/10]" boxClass="min-h-[200px]" />
              <p className="px-1 text-xs text-[#5d7776]">
                <Link href="/privacy" className="underline">Privacy</Link>{' '}
                <Link href="/terms" className="underline">Terms</Link>{' '}
                <Link href="/refund" className="underline">Refund</Link>
                {' · '}© 2026 MilapHub
              </p>
            </div>
          </div>
        </aside>

        {/* CENTER */}
        <main className="min-w-0 space-y-5">
          {tab !== 'Home' ? (
            <div className="rounded-2xl border border-[#e5eceb] p-12 text-center">
              <h2 className="text-xl font-extrabold">{tab}</h2>
              <p className="mt-1 text-[#5d7776]">{TAB_INFO[tab]} Coming soon.</p>
            </div>
          ) : (
            <>
              {/* Stories */}
              <section aria-label="Stories" className="flex gap-3 overflow-x-auto pb-1">
                <button
                  onClick={() => setMsg('Stories are coming soon.')}
                  className="relative flex h-44 w-28 shrink-0 flex-col items-center justify-end rounded-2xl border border-[#e5eceb] bg-[#f3f7f6] pb-3 hover:bg-[#e3efee]"
                >
                  <span className="absolute left-1/2 top-12 grid h-10 w-10 -translate-x-1/2 place-items-center rounded-full bg-[#0f5c5a] text-2xl font-bold leading-none text-white">+</span>
                  <span className="text-xs font-bold">Create story</span>
                </button>
                {STORIES.map(s => (
                  <button key={s.name}
                    onClick={() => setMsg('Stories are coming soon.')}
                    className={`relative flex h-44 w-28 shrink-0 flex-col justify-between rounded-2xl bg-gradient-to-b ${s.bg} p-2.5 text-white hover:brightness-110`}
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-full border-2 border-white bg-white text-sm font-bold text-[#0f5c5a]">
                      {s.name.charAt(0)}
                    </span>
                    <span className="text-left text-xs font-bold">{s.name}</span>
                  </button>
                ))}
              </section>

              {/* Composer */}
              <form onSubmit={submit} className="rounded-2xl border border-[#e5eceb] bg-white p-3 shadow-sm sm:p-4">
                <div className="flex items-start gap-3">
                  <Avatar name={name} />
                  <textarea
                    ref={taRef}
                    value={body}
                    onChange={e => {
                      setBody(e.target.value)
                      e.target.style.height = 'auto'
                      e.target.style.height = Math.min(e.target.scrollHeight, 240) + 'px'
                    }}
                    maxLength={2000}
                    rows={1}
                    aria-label="Write a post"
                    placeholder={`What's on your mind, ${name.split(' ')[0]}?`}
                    className="min-h-[44px] w-full resize-none rounded-3xl bg-[#f3f7f6] px-5 py-3 text-[15px] leading-snug outline-none placeholder:text-[#5d7776] focus:ring-2 focus:ring-[#0f5c5a]/30"
                  />
                  <div className="flex items-center gap-0.5 pt-0.5">
                    <button type="button" title="Video" aria-label="Add video"
                      onClick={() => setMsg('Video uploads are coming soon.')}
                      className="hidden h-10 w-10 place-items-center rounded-full text-[#e11d48] hover:bg-[#f3f7f6] sm:grid">
                      <Icon name="Video" size={22} />
                    </button>
                    <button type="button" title="Photo" aria-label="Add photo"
                      onClick={() => fileRef.current?.click()}
                      className="grid h-10 w-10 place-items-center rounded-full text-[#16a34a] hover:bg-[#f3f7f6]">
                      <Icon name="Photo" size={22} />
                    </button>
                    <div className="relative" ref={emojiRef}>
                      <button type="button" title="Emoji" aria-label="Add emoji"
                        aria-haspopup="menu" aria-expanded={emojiOpen}
                        onClick={() => setEmojiOpen(o => !o)}
                        className="grid h-10 w-10 place-items-center rounded-full text-[#f59e0b] hover:bg-[#f3f7f6]">
                        <Icon name="Smile" size={22} />
                      </button>
                      {emojiOpen && (
                        <div role="menu" className="absolute right-0 z-20 mt-2 grid w-56 grid-cols-6 gap-1 rounded-2xl border border-[#e5eceb] bg-white p-2 shadow-xl">
                          {EMOJIS.map(em => (
                            <button key={em} type="button" role="menuitem"
                              onClick={() => { setBody(b => b + em); setEmojiOpen(false); taRef.current?.focus() }}
                              className="grid h-8 w-8 place-items-center rounded-lg text-lg hover:bg-[#f3f7f6]">
                              {em}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={pickPhoto} className="sr-only" tabIndex={-1} aria-hidden="true" />
                {photo && (
                  <div className="relative ml-[52px] mt-3 overflow-hidden rounded-xl bg-[#f3f7f6]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.preview} alt="Selected photo preview" className="max-h-72 w-full object-contain" />
                    <button
                      type="button"
                      onClick={removePhoto}
                      aria-label="Remove photo"
                      className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-lg leading-none text-white hover:bg-black/80"
                    >
                      ×
                    </button>
                  </div>
                )}

                {(body.trim() || photo) && (
                  <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-[#eef3f2] pt-3">
                    <span className="rounded-full bg-[#e3efee] px-3 py-1.5 text-sm font-semibold text-[#0f5c5a]">
                      {`Category: ${current.label}`}
                    </span>
                    {category !== 'confession' && (
                      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                        <input type="checkbox" checked={allowTips} onChange={e => setAllowTips(e.target.checked)} className="h-4 w-4 accent-[#0f5c5a]" />
                        {category === 'campaign' ? 'Allow donations' : 'Allow Treat Creator'}
                      </label>
                    )}
                    <button
                      disabled={posting}
                      className="ml-auto rounded-full bg-[#0f5c5a] px-6 py-2 text-sm font-bold text-white transition hover:bg-[#0b4846] disabled:opacity-50"
                    >
                      {posting ? 'Posting...' : 'Post'}
                    </button>
                  </div>
                )}
                {msg && <p className="mt-3 text-sm font-medium text-[#0f5c5a]">{msg}</p>}
                {error && <p role="alert" className="mt-3 text-sm font-medium text-[#c0392b]">{error}</p>}
              </form>

              {/* Feed */}
              {posts.length === 0 ? (
                <div className="rounded-2xl border border-[#e5eceb] p-10 text-center text-[#5d7776]">
                  No posts in {cityName} yet. Be the first to share something!
                </div>
              ) : (
                posts.map(p => {
                  const a = one(p.profiles)
                  const anon = p.category === 'confession'
                  const author = anon ? 'Anonymous' : a?.full_name ?? 'MilapHub user'
                  const mine = p.author_id === profile.id
                  const isAdmin = profile.role === 'admin'
                  return (
                    <article key={p.id} className="rounded-2xl border border-[#e5eceb] bg-white p-4 shadow-sm">
                      <div className="flex items-center gap-3">
                        <Avatar name={author} />
                        <div className="min-w-0">
                          <p className="truncate font-bold leading-tight">{author}</p>
                          {(!anon || p.edited_at) && (
                            <p className="text-xs text-[#5d7776]">
                              {[!anon ? `@${a?.username ?? 'user'}` : '', p.edited_at ? 'Edited' : ''].filter(Boolean).join(' · ')}
                            </p>
                          )}
                        </div>
                        <div className="ml-auto flex items-center gap-2">
                          {p.category !== 'general' && (
                            <span className="rounded-full bg-[#e3efee] px-3 py-1 text-xs font-bold text-[#0f5c5a]">
                              {CATEGORIES.find(c => c.id === p.category)?.label ?? p.category}
                            </span>
                          )}
                          <div className="relative" data-postmenu>
                            <button
                              onClick={() => setPostMenu(m => (m === p.id ? null : p.id))}
                              aria-haspopup="menu"
                              aria-expanded={postMenu === p.id}
                              aria-label="Post options"
                              title="More options"
                              className="grid h-9 w-9 place-items-center rounded-full text-[#5d7776] hover:bg-[#f3f7f6]"
                            >
                              <Icon name="Dots" size={20} />
                            </button>
                            {postMenu === p.id && (
                              <div role="menu" className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-2xl border border-[#e5eceb] bg-white p-1.5 shadow-xl">
                                <button role="menuitem" className={MENU_ITEM} onClick={() => toggleSave(p.id)}>
                                  <Icon name="Bookmark" size={18} fill={saved.has(p.id)} />
                                  {saved.has(p.id) ? 'Unsave post' : 'Save post'}
                                </button>
                                <button role="menuitem" className={MENU_ITEM} onClick={() => { copyLink(p.id); setPostMenu(null) }}>
                                  <Icon name="Chain" size={18} />Copy link
                                </button>
                                {mine && (
                                  <button role="menuitem" className={MENU_ITEM}
                                    onClick={() => { setEditingId(p.id); setEditText(p.body ?? ''); setPostMenu(null) }}>
                                    <Icon name="Edit" size={18} />Edit post
                                  </button>
                                )}
                                {!mine && (
                                  <button role="menuitem" className={MENU_ITEM}
                                    onClick={() => { setReportKind('post'); setReportId(p.id); setPostMenu(null) }}>
                                    <Icon name="Flag" size={18} />Report post
                                  </button>
                                )}
                                {(mine || isAdmin) && (
                                  <>
                                    <div className="my-1 border-t border-[#eef3f2]" />
                                    <button role="menuitem" className={MENU_ITEM_RED} onClick={() => deletePost(p.id)}>
                                      <Icon name="Trash" size={18} />Delete post
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      {editingId === p.id ? (
                        <div className="mt-3 space-y-2">
                          <textarea
                            value={editText}
                            onChange={e => setEditText(e.target.value)}
                            maxLength={2000}
                            rows={3}
                            aria-label="Edit post"
                            className="w-full resize-y rounded-xl bg-[#f3f7f6] px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-[#0f5c5a]/30"
                          />
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setEditingId(null)} className="rounded-full px-4 py-1.5 text-sm font-semibold hover:bg-[#f3f7f6]">Cancel</button>
                            <button type="button" onClick={() => saveEdit(p.id)} className="rounded-full bg-[#0f5c5a] px-5 py-1.5 text-sm font-bold text-white hover:bg-[#0b4846]">Save</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {p.body && (
                            <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed">{p.body}</p>
                          )}
                          {p.media_url && (
                            <a href={p.media_url} target="_blank" rel="noopener noreferrer" className="mt-3 block overflow-hidden rounded-xl bg-[#f3f7f6]">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={p.media_url} alt="Photo shared in this post" loading="lazy" className="max-h-[520px] w-full object-contain" />
                            </a>
                          )}
                        </>
                      )}
                      <div className="mt-3 flex items-center gap-2 border-t border-[#eef3f2] pt-2 text-sm font-semibold text-[#5d7776]">
                        <button
                          onClick={() => toggleLike(p)}
                          aria-pressed={liked.has(p.id)}
                          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 hover:bg-[#f3f7f6] ${liked.has(p.id) ? 'text-[#0f5c5a]' : ''}`}
                        >
                          <Icon name="Like" size={18} fill={liked.has(p.id)} />
                          Like{likeCount(p) > 0 ? ` ${likeCount(p)}` : ''}
                        </button>
                        <button
                          onClick={() => toggleComments(p)}
                          aria-expanded={openC.has(p.id)}
                          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 hover:bg-[#f3f7f6] ${openC.has(p.id) ? 'text-[#0f5c5a]' : ''}`}
                        >
                          <Icon name="Comment" size={18} />
                          Comment{commentCount(p) > 0 ? ` ${commentCount(p)}` : ''}
                        </button>
                        <button
                          onClick={() => sharePost(p)}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 hover:bg-[#f3f7f6]"
                        >
                          <Icon name="Share" size={18} />Share
                        </button>
                        {p.allow_tips && (
                          <button
                            onClick={() => setMsg('Treat Creator is coming soon. Razorpay is not connected yet.')}
                            className="flex-1 rounded-lg bg-[#f0a500] py-2 font-bold text-[#3a2900] hover:brightness-105"
                          >
                            {p.category === 'campaign' ? 'Donate' : 'Treat Creator'}
                          </button>
                        )}
                      </div>
                      {openC.has(p.id) && (
                        <div className="mt-3 space-y-3 border-t border-[#eef3f2] pt-3">
                          {(comments[p.id] ?? []).length === 0 && (
                            <p className="text-sm text-[#5d7776]">No comments yet. Start the conversation.</p>
                          )}
                          {(comments[p.id] ?? []).filter(c => !c.parent_id).map(c => {
                            const replies = (comments[p.id] ?? []).filter(r => r.parent_id === c.id)
                            return (
                              <div key={c.id} className="space-y-2">
                                {renderComment(p, c, false)}
                                {replies.length > 0 && (
                                  <div className="ml-10 space-y-2 border-l-2 border-[#eef3f2] pl-3">
                                    {replies.map(r => renderComment(p, r, true))}
                                  </div>
                                )}
                                {replyingTo === c.id && (
                                  <form
                                    onSubmit={e => { e.preventDefault(); addComment(p, c.id) }}
                                    className="ml-10 flex items-center gap-2"
                                  >
                                    <Avatar name={name} size={28} />
                                    <input
                                      autoFocus
                                      value={drafts[c.id] ?? ''}
                                      onChange={e => setDrafts(prev => ({ ...prev, [c.id]: e.target.value }))}
                                      maxLength={1000}
                                      placeholder="Write a reply..."
                                      aria-label="Write a reply"
                                      className="min-w-0 flex-1 rounded-full bg-[#f3f7f6] px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f5c5a]/30"
                                    />
                                    <button
                                      disabled={cBusy === c.id || !(drafts[c.id] ?? '').trim()}
                                      className="rounded-full bg-[#0f5c5a] px-4 py-2 text-sm font-bold text-white hover:bg-[#0b4846] disabled:opacity-50"
                                    >
                                      Reply
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setReplyingTo(null)}
                                      className="rounded-full px-3 py-2 text-sm font-semibold hover:bg-[#f3f7f6]"
                                    >
                                      Cancel
                                    </button>
                                  </form>
                                )}
                              </div>
                            )
                          })}
                          <form
                            onSubmit={e => { e.preventDefault(); addComment(p) }}
                            className="flex items-center gap-2"
                          >
                            <Avatar name={name} size={32} />
                            <input
                              value={drafts[p.id] ?? ''}
                              onChange={e => setDrafts(prev => ({ ...prev, [p.id]: e.target.value }))}
                              maxLength={1000}
                              placeholder="Write a comment..."
                              aria-label="Write a comment"
                              className="min-w-0 flex-1 rounded-full bg-[#f3f7f6] px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f5c5a]/30"
                            />
                            <button
                              disabled={cBusy === p.id || !(drafts[p.id] ?? '').trim()}
                              className="rounded-full bg-[#0f5c5a] px-4 py-2 text-sm font-bold text-white hover:bg-[#0b4846] disabled:opacity-50"
                            >
                              Post
                            </button>
                          </form>
                        </div>
                      )}
                    </article>
                  )
                })
              )}
            </>
          )}
        </main>

        {/* RIGHT SIDEBAR */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 flex h-[calc(100vh-7rem)] flex-col">
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 [scrollbar-width:thin]">
              <FriendsPanel me={profile.id} onOpenChat={id => router.push(`/messages?with=${id}`)} />
            </div>
            <div className="shrink-0 space-y-3 pt-3">
              <AdSlot ads={adMap.right_1} cityName={cityName} imgClass="aspect-[2/1]" boxClass="min-h-[150px]" />
              <AdSlot ads={adMap.right_2} cityName={cityName} imgClass="aspect-[2/1]" boxClass="min-h-[150px]" />
            </div>
          </div>
        </aside>
      </div>

      {reportId && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          onMouseDown={e => { if (e.target === e.currentTarget) setReportId(null) }}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="report-title" className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <h2 id="report-title" className="text-lg font-extrabold">{`Report this ${reportKind}`}</h2>
            <p className="mt-1 text-sm text-[#5d7776]">Why are you reporting it?</p>
            <div className="mt-3 space-y-1">
              {REASONS.map(r => (
                <label key={r.id} className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-sm font-medium hover:bg-[#f3f7f6]">
                  <input type="radio" name="reason" checked={reason === r.id} onChange={() => setReason(r.id)} className="h-4 w-4 accent-[#0f5c5a]" />
                  {r.label}
                </label>
              ))}
            </div>
            <textarea
              value={details}
              onChange={e => setDetails(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="More details (optional)"
              className="mt-3 w-full resize-none rounded-xl bg-[#f3f7f6] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#0f5c5a]/30"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setReportId(null)} className="rounded-full px-4 py-2 text-sm font-semibold hover:bg-[#f3f7f6]">Cancel</button>
              <button type="button" disabled={reporting} onClick={submitReport} className="rounded-full bg-[#0f5c5a] px-5 py-2 text-sm font-bold text-white hover:bg-[#0b4846] disabled:opacity-50">
                {reporting ? 'Sending...' : 'Submit report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div role="status" className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#12302f] px-5 py-3 text-sm font-semibold text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  )
}
