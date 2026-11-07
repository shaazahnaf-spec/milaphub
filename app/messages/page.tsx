// FILE: app/messages/page.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import FriendsPanel from '@/components/FriendsPanel'

type Msg = { 
  id: string; 
  sender_id: string; 
  receiver_id: string; 
  conversation_id?: string; 
  body: string; 
  created_at: string;
}

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

export default function MessagesPage() {
  const [supabase] = useState(() => createClient())
  const router = useRouter()
  const [me, setMe] = useState<string | null>(null)
  const [active, setActive] = useState<any | null>(null)
  const [activeName, setActiveName] = useState('')
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
      const w = new URLSearchParams(window.location.search).get('with')
      if (w) {
        const { data } = await supabase.from('profiles').select('full_name').eq('id', w).maybeSingle()
        setActive(w)
        setActiveName(data?.full_name ?? 'Friend')
      }
    }
    init()
  }, [supabase, router])

  useEffect(() => {
    if (!me || !active) return
    const meId = me
    const otherId = typeof active === 'string' ? active : active?.id
    if (!otherId) return
    let cancelled = false

    async function load() {
      const { data, error } = await (supabase.from('messages') as any)
        .select('id, sender_id, receiver_id, conversation_id, body, created_at')
        .or(`and(sender_id.eq.${meId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${meId})`)
        .order('created_at', { ascending: false })
        .limit(100)
      if (cancelled) return
      if (error) { setError(error.message); return }
      setMsgs(((data ?? []) as Msg[]).reverse())
      await (supabase.from('messages') as any)
        .update({ read_at: new Date().toISOString() })
        .eq('receiver_id', meId).eq('sender_id', otherId).is('read_at', null)
    }
    load()

    const ch = supabase
      .channel(`chat-${meId}-${otherId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${meId}` },
        payload => {
          const m = payload.new as unknown as Msg
          if (m.sender_id !== otherId) return
          setMsgs(list => (list.some(x => x.id === m.id) ? list : [...list, m]))
          ;(supabase.from('messages') as any).update({ read_at: new Date().toISOString() }).eq('id', m.id).then(() => {})
        })
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(ch)
    }
  }, [supabase, me, active])

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [msgs])

  function openChat(id: string, name: string) {
    setActive(id)
    setActiveName(name)
    setMsgs([])
    setError('')
    window.history.replaceState(null, '', `/messages?with=${id}`)
  }

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const clean = text.trim()
    const recipientId = typeof active === 'string' ? active : active?.id
    if (!clean || !me || !recipientId) return
    setSending(true); setError('')

    // Fallback dynamic connection key creation logic for database security mapping
    const computedConvId = `${[me, recipientId].sort().join('_')}`

    const { data, error } = await (supabase.from('messages') as any)
      .insert({
        sender_id: me,
        receiver_id: recipientId,
        conversation_id: computedConvId,
        body: clean
      })
      .select('id, sender_id, receiver_id, conversation_id, body, created_at')
      .single()

    setSending(false)
    if (error) {
      return setError(error.message.includes('row-level') ? 'You can only message your friends.' : error.message)
    }
    setText('')
    setMsgs(list => [...list, data as Msg])
  }

  async function unfriend() {
    const recipientId = typeof active === 'string' ? active : active?.id
    if (!me || !recipientId) return
    if (!window.confirm(`Remove ${activeName} from your friends?`)) return
    const { error } = await (supabase.from('friendships') as any)
      .delete()
      .or(`and(requester_id.eq.${me},receiver_id.eq.${recipientId}),and(requester_id.eq.${recipientId},receiver_id.eq.${me})`)
    if (error) return setError(error.message)
    setActive(null)
    setMsgs([])
    window.history.replaceState(null, '', '/messages')
  }

  if (!me) {
    return <div className="grid min-h-screen place-items-center font-semibold text-[#0f5c5a]">Loading...</div>
  }

  const activeIdStr = typeof active === 'string' ? active : active?.id

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
        <div className={activeIdStr ? 'hidden md:block' : 'block'}>
          <FriendsPanel me={me} activeId={activeIdStr} onOpenChat={openChat} />
        </div>

        <section className={`${activeIdStr ? 'flex' : 'hidden md:flex'} h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-2xl border border-[#e5eceb]`}>
          {!activeIdStr ? (
            <div className="grid flex-1 place-items-center p-6 text-center text-[#5d7776]">
              Select a friend to start chatting.
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-[#e5eceb] px-4 py-3">
                <button onClick={() => setActive(null)} aria-label="Back to friends" className="rounded-full px-2 py-1 text-lg font-bold hover:bg-[#f3f7f6] md:hidden">
                  ←
                </button>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#f0a500] text-sm font-bold text-[#3a2900]">
                  {activeName.charAt(0).toUpperCase()}
                </span>
                <p className="font-bold">{activeName}</p>
                <button onClick={unfriend} className="ml-auto rounded-full px-3 py-1.5 text-xs font-semibold text-[#c0392b] hover:bg-[#fdf3f2]">
                  Unfriend
                </button>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto p-4">
                {msgs.length === 0 && (
                  <p className="text-center text-sm text-[#5d7776]">No messages yet. Say salaam!</p>
                )}
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
              <form onSubmit={send} className="flex items-center gap-2 border-t border-[#e5eceb] p-3">
                <input
                  value={text}
                  onChange={e => setText(e.target.value)}
                  maxLength={2000}
                  placeholder="Write a message..."
                  aria-label="Write a message"
                  className="flex-1 rounded-full border border-[#dbe5e4] bg-[#f3f7f6] px-4 py-2 text-sm outline-none focus:border-[#0f5c5a] focus:bg-white"
                />
                <button 
                  type="submit" 
                  disabled={sending || !text.trim()} 
                  className="rounded-full bg-[#0f5c5a] px-4 py-2 text-sm font-bold text-white hover:bg-[#0c4947] disabled:opacity-50"
                >
                  {sending ? '...' : 'Send'}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
