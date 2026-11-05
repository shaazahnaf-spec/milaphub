// FILE: components/FriendsPanel.tsx  (GitHub mein is path par paste karo)
'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Person = { id: string; full_name: string | null; username: string | null }
type Row = {
  id: string
  requester_id: string
  receiver_id: string
  status: string
  requester: Person | Person[] | null
  receiver: Person | Person[] | null
}

const one = <T,>(v: T | T[] | null | undefined): T | null =>
  Array.isArray(v) ? (v[0] ?? null) : (v ?? null)

function Avatar({ name }: { name: string }) {
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f0a500] text-sm font-bold text-[#3a2900]">
      {name.charAt(0).toUpperCase() || 'U'}
    </span>
  )
}

type Props = {
  me: string
  activeId?: string | null
  onOpenChat: (id: string, name: string) => void
}

export default function FriendsPanel({ me, activeId = null, onOpenChat }: Props) {
  const [supabase] = useState(() => createClient())
  const [rows, setRows] = useState<Row[]>([])
  const [unread, setUnread] = useState<Record<string, number>>({})
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Person[]>([])
  const [note, setNote] = useState('')

  const notify = useCallback((t: string) => {
    setNote(t)
    setTimeout(() => setNote(''), 3500)
  }, [])

  const reload = useCallback(async () => {
    const { data } = await supabase
      .from('friendships')
      .select('id, requester_id, receiver_id, status, requester:profiles!requester_id(id, full_name, username), receiver:profiles!receiver_id(id, full_name, username)')
      .in('status', ['pending', 'accepted'])
    setRows((data ?? []) as unknown as Row[])

    const { data: un } = await supabase
      .from('messages').select('sender_id').eq('receiver_id', me).is('read_at', null)
    const counts: Record<string, number> = {}
    for (const m of un ?? []) {
      const id = m.sender_id as string
      counts[id] = (counts[id] ?? 0) + 1
    }
    setUnread(counts)
  }, [supabase, me])

  useEffect(() => {
    reload()
    const ch = supabase
      .channel(`friends-${me}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => { reload() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `receiver_id=eq.${me}` }, () => { reload() })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [supabase, me, reload])

  // Naam ya username se logon ko dhundho
  useEffect(() => {
    const term = q.trim().replace(/[%,()*]/g, ' ').trim()
    if (term.length < 2) { setResults([]); return }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, username')
        .neq('id', me)
        .or(`username.ilike.%${term}%,full_name.ilike.%${term}%`)
        .limit(8)
      setResults((data ?? []) as Person[])
    }, 300)
    return () => clearTimeout(t)
  }, [q, me, supabase])

  const relation = (id: string) =>
    rows.find(r => (r.requester_id === me && r.receiver_id === id) || (r.requester_id === id && r.receiver_id === me))

  const incoming = rows.filter(r => r.status === 'pending' && r.receiver_id === me)
  const outgoing = rows.filter(r => r.status === 'pending' && r.requester_id === me)
  const friends = rows
    .filter(r => r.status === 'accepted')
    .map(r => one(r.requester_id === me ? r.receiver : r.requester))
    .filter((p): p is Person => !!p)
    .sort((a, b) => (unread[b.id] ?? 0) - (unread[a.id] ?? 0) || (a.full_name ?? '').localeCompare(b.full_name ?? ''))

  async function sendRequest(id: string) {
    const { error } = await supabase
      .from('friendships').insert({ requester_id: me, receiver_id: id, status: 'pending' })
    if (error) return notify(error.code === '23505' ? 'You cannot send another request to this person.' : error.message)
    notify('Friend request sent.')
    reload()
  }

  async function respond(row: Row, status: 'accepted' | 'rejected') {
    const { data, error } = await supabase
      .from('friendships').update({ status }).eq('id', row.id).select('id')
    if (error) return notify(error.message)
    if (!data || data.length === 0) return notify('Could not update the request.')
    notify(status === 'accepted' ? 'You are now friends.' : 'Request declined.')
    reload()
  }

  async function cancel(id: string) {
    const { error } = await supabase.from('friendships').delete().eq('id', id)
    if (error) return notify(error.message)
    notify('Request cancelled.')
    reload()
  }

  const card = 'rounded-2xl border border-[#e5eceb] bg-white p-3'
  const small = 'rounded-full px-3 py-1.5 text-xs font-bold'

  return (
    <div className="space-y-3">
      <section className={card}>
        <h3 className="mb-2 text-sm font-extrabold">Find people</h3>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search by name or username"
          aria-label="Search people"
          className="w-full rounded-full bg-[#f3f7f6] px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f5c5a]/30"
        />
        {results.length > 0 && (
          <ul className="mt-2 space-y-2">
            {results.map(p => {
              const name = p.full_name ?? 'MilapHub user'
              const rel = relation(p.id)
              return (
                <li key={p.id} className="flex items-center gap-2">
                  <Avatar name={name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold leading-tight">{name}</p>
                    <p className="truncate text-xs text-[#5d7776]">@{p.username}</p>
                  </div>
                  {!rel && (
                    <button onClick={() => sendRequest(p.id)} className={`${small} bg-[#0f5c5a] text-white hover:bg-[#0b4846]`}>Add friend</button>
                  )}
                  {rel?.status === 'pending' && rel.requester_id === me && (
                    <button onClick={() => cancel(rel.id)} className={`${small} bg-[#f3f7f6] text-[#5d7776] hover:bg-[#e3efee]`}>Requested</button>
                  )}
                  {rel?.status === 'pending' && rel.receiver_id === me && (
                    <button onClick={() => respond(rel, 'accepted')} className={`${small} bg-[#0f5c5a] text-white hover:bg-[#0b4846]`}>Accept</button>
                  )}
                  {rel?.status === 'accepted' && (
                    <button onClick={() => onOpenChat(p.id, name)} className={`${small} bg-[#e3efee] text-[#0f5c5a] hover:bg-[#d3e6e4]`}>Message</button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className={card}>
        <h3 className="mb-2 text-sm font-extrabold">
          Friend requests{incoming.length > 0 ? ` (${incoming.length})` : ''}
        </h3>
        {incoming.length === 0 && outgoing.length === 0 && (
          <p className="text-sm text-[#5d7776]">No pending requests.</p>
        )}
        <ul className="space-y-2">
          {incoming.map(r => {
            const p = one(r.requester)
            const name = p?.full_name ?? 'MilapHub user'
            return (
              <li key={r.id} className="flex items-center gap-2">
                <Avatar name={name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold leading-tight">{name}</p>
                  <div className="mt-1 flex gap-2">
                    <button onClick={() => respond(r, 'accepted')} className={`${small} bg-[#0f5c5a] text-white hover:bg-[#0b4846]`}>Accept</button>
                    <button onClick={() => respond(r, 'rejected')} className={`${small} bg-[#f3f7f6] hover:bg-[#e3efee]`}>Decline</button>
                  </div>
                </div>
              </li>
            )
          })}
          {outgoing.map(r => {
            const p = one(r.receiver)
            return (
              <li key={r.id} className="flex items-center gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate text-[#5d7776]">Sent to {p?.full_name ?? 'user'}</span>
                <button onClick={() => cancel(r.id)} className={`${small} bg-[#f3f7f6] hover:bg-[#e3efee]`}>Cancel</button>
              </li>
            )
          })}
        </ul>
      </section>

      <section className={card}>
        <h3 className="mb-2 text-sm font-extrabold">Friends</h3>
        {friends.length === 0 ? (
          <p className="text-sm text-[#5d7776]">Search for people above and add them as friends. Chat is available only between friends.</p>
        ) : (
          <ul className="space-y-1">
            {friends.map(p => {
              const name = p.full_name ?? 'MilapHub user'
              const n = unread[p.id] ?? 0
              return (
                <li key={p.id}>
                  <button
                    onClick={() => onOpenChat(p.id, name)}
                    className={`flex w-full items-center gap-2 rounded-xl p-1.5 text-left hover:bg-[#f3f7f6] ${activeId === p.id ? 'bg-[#e3efee]' : ''}`}
                  >
                    <Avatar name={name} />
                    <span className="min-w-0 flex-1 truncate text-sm font-bold">{name}</span>
                    {n > 0 && (
                      <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#c0392b] px-1 text-[11px] font-bold text-white">{n}</span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {note && <p role="status" className="px-1 text-xs font-semibold text-[#0f5c5a]">{note}</p>}
    </div>
  )
}
