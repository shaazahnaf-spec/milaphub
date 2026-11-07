// FILE: components/NotificationBell.tsx
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Notif = {
  id: string
  type: string
  title: string
  message: string | null
  link: string | null
  is_read: boolean
  created_at: string
}

type PushState = 'unknown' | 'unsupported' | 'off' | 'on' | 'blocked'

function b64ToBytes(b64: string) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

function ago(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return 'now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

export default function NotificationBell() {
  const [supabase] = useState(() => createClient())
  const router = useRouter()
  const [me, setMe] = useState<string | null>(null)
  const [items, setItems] = useState<Notif[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const [push, setPush] = useState<PushState>('unknown')
  const [msg, setMsg] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const load = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from('notifications')
      .select('id, type, title, message, link, is_read, created_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(20)
    setItems((data ?? []) as Notif[])
    const { count } = await supabase
      .from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('is_read', false)
    setUnread(count ?? 0)
  }, [supabase])

  useEffect(() => {
    let cancelled = false
    let channel: ReturnType<typeof supabase.channel> | null = null
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return
      setMe(user.id)

      // "Tumhare shehar mein nayi listings": 30 minute mein ek baar check
      const last = Number(sessionStorage.getItem('digestAt') ?? 0)
      if (Date.now() - last > 30 * 60 * 1000) {
        sessionStorage.setItem('digestAt', String(Date.now()))
        await supabase.rpc('refresh_city_digest')
      }
      await load(user.id)

      channel = supabase
        .channel(`notif-${user.id}`)
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          () => { load(user.id) })
        .subscribe()
    }
    init()
    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [supabase, load])

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window) || !VAPID) {
      setPush('unsupported'); return
    }
    if (Notification.permission === 'denied') setPush('blocked')
    else setPush(Notification.permission === 'granted' ? 'on' : 'off')
  }, [])

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
  }, [open])

  async function markAll() {
    if (!me) return
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', me).eq('is_read', false)
    load(me)
  }

  async function openItem(n: Notif) {
    setOpen(false)
    if (!n.is_read) await supabase.from('notifications').update({ is_read: true }).eq('id', n.id)
    if (me) load(me)
    if (n.link) router.push(n.link)
  }

  async function enablePush() {
    if (!me || !VAPID) return
    setMsg('')
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') { setPush(perm === 'denied' ? 'blocked' : 'off'); return setMsg('Notifications are not allowed in your browser.') }
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(VAPID) })
      const json = sub.toJSON()
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return setMsg('Could not turn on push alerts.')
      const { error } = await supabase.from('push_subscriptions').upsert(
        { user_id: me, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth, user_agent: navigator.userAgent.slice(0, 200) },
        { onConflict: 'endpoint' }
      )
      if (error) return setMsg(error.message)
      setPush('on')
      setMsg('Push alerts are on for this device.')
    } catch {
      setMsg('Push alerts are not supported here. On iPhone, add MilapHub to your Home Screen first.')
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        title="Notifications"
        className="relative grid h-10 w-10 place-items-center rounded-full bg-[#f3f7f6] hover:bg-[#e3efee]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#c0392b] px-1 text-[11px] font-bold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div role="menu" className="absolute right-0 z-50 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-2xl border border-[#e5eceb] bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-[#eef3f2] px-4 py-3">
            <p className="font-extrabold">Notifications</p>
            {unread > 0 && (
              <button onClick={markAll} className="text-xs font-bold text-[#0f5c5a] hover:underline">Mark all as read</button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-[#5d7776]">Nothing new yet.</p>
            ) : (
              items.map(n => (
                <button
                  key={n.id}
                  role="menuitem"
                  onClick={() => openItem(n)}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-[#f3f7f6] ${n.is_read ? '' : 'bg-[#f1f8f7]'}`}
                >
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.is_read ? 'bg-transparent' : 'bg-[#0f5c5a]'}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{n.title}</span>
                    {n.message && <span className="block truncate text-sm text-[#5d7776]">{n.message}</span>}
                  </span>
                  <span className="shrink-0 text-xs text-[#5d7776]">{ago(n.created_at)}</span>
                </button>
              ))
            )}
          </div>

          {(push === 'off' || msg) && (
            <div className="border-t border-[#eef3f2] px-4 py-3">
              {push === 'off' && (
                <button onClick={enablePush} className="w-full rounded-full bg-[#0f5c5a] py-2 text-sm font-bold text-white hover:bg-[#0b4846]">
                  Turn on push alerts
                </button>
              )}
              {msg && <p className="mt-2 text-xs font-medium text-[#5d7776]">{msg}</p>}
            </div>
          )}
          {push === 'blocked' && (
            <p className="border-t border-[#eef3f2] px-4 py-3 text-xs text-[#5d7776]">
              Push alerts are blocked in your browser settings.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
