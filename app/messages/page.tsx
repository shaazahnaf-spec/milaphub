// FILE: app/messages/page.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import FriendsPanel from '@/components/FriendsPanel'
import ItemChats, { fetchConvs, type ConvSummary } from '@/components/ItemChats'
import { CHIPS, priceLabel } from '@/lib/bazaar'

type Msg = { id: string; sender_id: string; receiver_id: string; body: string; created_at: string }
type Active =
  | { kind: 'friend'; id: string; name: string }
  | { kind: 'conv'; conv: ConvSummary }
  | null

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

export default function MessagesPage() {
  const [supabase] = useState(() => createClient())
  const router = useRouter()
  const [me, setMe] = useState<string | null>(null)
  const [active, setActive] = useState<Active>(null)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      setMe(user.id)
      const params = new URLSearchParams(window.location.search)
      const w = params.get('with')
      const c = params.get('c')
      if (c) {
        const [conv] = await fetchConvs(supabase, user.id, c)
        if (conv) setActive({ kind: 'conv', conv })
      } else if (w) {
        const { data } = await supabase.from('profiles').select('full_name').eq('id', w).maybeSingle()
        setActive({ kind: 'friend', id: w, name: data?.full_name ?? 'Friend' })
      }
    }
    init()
  }, [supabase, router])

  const activeKey = active ? (active.kind === 'conv' ? `c:${active.conv.id}` : `f:${active.id}`) : ''

  // Thread load + realtime
  useEffect(() => {
    if (!me || !active) return
    const meId = me
    const act = active
    let cancelled = false

    async function load() {
      let q = supabase.from('messages').select('id, sender_id, receiver_id, body, created_at')
      if (act.kind === 'conv') {
        q = q.eq('conversation_id', act.conv.id)
      } else {
        q = q
          .is('conversation_id', null)
          .or(`and(sender_id.eq.${meId},receiver_id.eq.${act.id}),and(sender_id.eq.${act.id},receiver_id.eq.${meId})`)
      }
      const { data, error } = await q.order('created_at', { ascending: false }).limit(100)
      if (cancelled) return
      if (error) { setError(error.message); return }
      setMsgs(((data ?? []) as Msg[]).reverse())

      let u = supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('receiver_id', meId).is('read_at', null)
      u = act.kind === 'conv' ? u.eq('conversation_id', act.conv.id) : u.eq('sender_id', act.id).is('conversation_id', null)
      await u
    }
    load()

    const ch = supabase
      .channel(`chat-${meId}-${activeKey}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${meId}` },
        payload => {
          const m = payload.new as unknown as Msg & { conversation_id: string | null }
          const belongs = act.kind === 'conv'
            ? m.conversation_id === act.conv.id
            : m.sender_id === act.id && !m.conversation_id
          if (!belongs) return
          setMsgs(list => (list.some(x => x.id === m.id) ? list : [...list, m]))
          supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('id', m.id).then(() => {})
        })
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(ch)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, me, activeKey])

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [msgs])

  function openFriend(id: string, name: string) {
    setActive({ kind: 'friend', id, name })
    setMsgs([]); setError('')
    window.history.replaceState(null, '', `/messages?with=${id}`)
  }

  function openConv(conv: ConvSummary) {
    setActive({ kind: 'conv', conv })
    setMsgs([]); setError('')
    window.history.replaceState(null, '', `/messages?c=${conv.id}`)
  }

  async function sendText(body: string) {
    const clean = body.trim()
    if (!clean || !me || !active) return
    setSending(true); setError('')
    const row = {
      sender_id: me,
      receiver_id: active.kind === 'conv' ? active.conv.otherId : active.id,
      conversation_id: active.kind === 'conv' ? active.conv.id : null,
      body: clean,
    }
    const { data, error } = await supabase
      .from('messages').insert(row).select('id, sender_id, receiver_id, body, created_at').single()
    setSending(false)
    if (error) {
      return setError(error.message.includes('row-level') ? 'This chat is closed or you can no longer message this person.' : error.message)
    }
    setText('')
    setMsgs(list => [...list, data as Msg])
  }

  async function unfriend() {
    if (!me || active?.kind !== 'friend') return
    if (!window.confirm(`Remove ${active.name} from your friends?`)) return
    const id = active.id
    const { error } = await supabase
      .from('friendships').delete()
      .or(`and(requester_id.eq.${me},receiver_id.eq.${id}),and(requester_id.eq.${id},receiver_id.eq.${me})`)
    if (error) return setError(error.message)
    setActive(null); setMsgs([])
    window.history.replaceState(null, '', '/messages')
  }

  async function closeChat() {
    if (active?.kind !== 'conv') return
    if (!window.confirm('Close this chat? Neither of you will be able to send more messages.')) return
    const { error } = await supabase.from('conversations').update({ status: 'closed' }).eq('id', active.conv.id)
    if (error) return setError(error.message)
    setActive({ kind: 'conv', conv: { ...active.conv, status: 'closed' } })
  }

  if (!me) {
    return <div className="grid min-h-screen place-items-center font-semibold text-[#0f5c5a]">Loading...</div>
  }

  const conv = active?.kind === 'conv' ? active.conv : null
  const title = active ? (active.kind === 'conv' ? active.conv.otherName : active.name) : ''
  const chips = conv
    ? CHIPS[conv.kind === 'matrimony' ? 'matrimony' : conv.listing?.listing_type === 'wanted' ? 'wanted' : 'sell']
    : []
  const closed = conv?.status === 'closed'

  return (
    <div className="min-h-screen bg-white text-[#12302f]">
      <header className="border-b border-[#e5eceb]">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <h1 className="text-xl font-extrabold">Messages</h1>
          <Link href="/home" className="rounded-full border border-[#dbe5e4] px-4 py-2 text-sm font-semibold hover:bg-[#f3f7f6]">
            Back to MilapHub
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-4 p-4 md:grid-cols-[320px_minmax(0,1fr)]">
        <div className={`${active ? 'hidden md:block' : 'block'} space-y-3`}>
          <ItemChats me={me} activeId={conv?.id ?? null} onOpen={openConv} kind="matrimony" title="Matrimony chats" />
          <ItemChats me={me} activeId={conv?.id ?? null} onOpen={openConv} />
          <FriendsPanel me={me} activeId={active?.kind === 'friend' ? active.id : null} onOpenChat={openFriend} />
        </div>

        <section className={`${active ? 'flex' : 'hidden md:flex'} h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-2xl border border-[#e5eceb]`}>
          {!active ? (
            <div className="grid flex-1 place-items-center p-6 text-center text-[#5d7776]">
              Select a chat to start talking.
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-[#e5eceb] px-4 py-3">
                <button onClick={() => setActive(null)} aria-label="Back to chats" className="rounded-full px-2 py-1 text-lg font-bold hover:bg-[#f3f7f6] md:hidden">←</button>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#f0a500] text-sm font-bold text-[#3a2900]">
                  {title.charAt(0).toUpperCase()}
                </span>
                <p className="font-bold">{title}</p>
                {conv ? (
                  !closed && (
                    <button onClick={closeChat} className="ml-auto rounded-full px-3 py-1.5 text-xs font-semibold text-[#c0392b] hover:bg-[#fdf3f2]">Close chat</button>
                  )
                ) : (
                  <button onClick={unfriend} className="ml-auto rounded-full px-3 py-1.5 text-xs font-semibold text-[#c0392b] hover:bg-[#fdf3f2]">Unfriend</button>
                )}
              </div>

              {conv && (
                conv.listing ? (
                  <Link href={`/bazaar/${conv.listing.id}`} className="flex items-center gap-3 border-b border-[#e5eceb] bg-[#f8fbfa] px-4 py-2 hover:bg-[#f1f8f7]">
                    <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#f3f7f6]">
                      {conv.listing.image_urls[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={conv.listing.image_urls[0]} alt="" className="h-full w-full object-cover" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">{conv.listing.title}</span>
                      <span className="block text-sm font-extrabold text-[#0f5c5a]">{priceLabel(conv.listing.listing_type, conv.listing.price)}</span>
                    </span>
                    {conv.listing.listing_type === 'wanted' && (
                      <span className="ml-auto rounded-full bg-[#f0a500] px-3 py-1 text-xs font-extrabold text-[#3a2900]">WANTED</span>
                    )}
                  </Link>
                ) : (
                  <p className="border-b border-[#e5eceb] bg-[#f8fbfa] px-4 py-2 text-sm text-[#5d7776]">
                    {conv.kind === 'matrimony'
                      ? 'Matrimony chat. MilapHub never shows phone numbers. Share your number yourself only when you and your family are comfortable. Never send money to anyone you have met online.'
                      : 'This listing is no longer available.'}
                  </p>
                )
              )}

              <div className="flex-1 space-y-2 overflow-y-auto p-4">
                {msgs.length === 0 && <p className="text-center text-sm text-[#5d7776]">No messages yet. Say salaam!</p>}
                {msgs.map(m => {
                  const mine = m.sender_id === me
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${mine ? 'bg-[#0f5c5a] text-white' : 'bg-[#f3f7f6]'}`}>
                        <p className="whitespace-pre-wrap break-words text-sm">{m.body}</p>
                        <p className={`mt-0.5 text-right text-[10px] ${mine ? 'text-white/70' : 'text-[#5d7776]'}`}>{time(m.created_at)}</p>
                      </div>
                    </div>
                  )
                })}
                <div ref={endRef} />
              </div>

              {error && <p role="alert" className="px-4 pb-1 text-sm font-medium text-[#c0392b]">{error}</p>}
              {closed && <p className="px-4 pb-2 text-center text-sm text-[#5d7776]">This chat is closed.</p>}

              {!closed && chips.length > 0 && !text && (
                <div className="flex gap-2 overflow-x-auto px-3 pt-2" role="group" aria-label="Quick replies">
                  {chips.map(c => (
                    <button key={c} onClick={() => sendText(c)} disabled={sending}
                      className="shrink-0 rounded-full border border-[#dbe5e4] px-3 py-1.5 text-xs font-semibold hover:bg-[#f3f7f6] disabled:opacity-50">
                      {c}
                    </button>
                  ))}
                </div>
              )}

              <form onSubmit={e => { e.preventDefault(); sendText(text) }} className="flex items-center gap-2 border-t border-[#e5eceb] p-3">
                <input
                  value={text}
                  onChange={e => setText(e.target.value)}
                  maxLength={2000}
                  disabled={closed}
                  placeholder="Write a message..."
                  aria-label="Write a message"
                  className="min-w-0 flex-1 rounded-full bg-[#f3f7f6] px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0f5c5a]/30 disabled:opacity-60"
                />
                <button disabled={sending || closed || !text.trim()}
                  className="rounded-full bg-[#0f5c5a] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0b4846] disabled:opacity-50">
                  Send
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
