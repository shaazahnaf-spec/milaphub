// FILE: components/ItemChats.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { priceLabel } from '@/lib/bazaar'

type Client = ReturnType<typeof createClient>
type Mini = { id: string; full_name: string | null }
type ListingMini = { id: string; title: string; price: number; image_urls: string[]; listing_type: string }

export type ConvSummary = {
  id: string
  listing_id: string
  status: string
  started_by: string
  otherId: string
  otherName: string
  listing: ListingMini | null
}

type Row = {
  id: string
  listing_id: string
  buyer_id: string
  seller_id: string
  started_by: string
  status: string
  listings: ListingMini | ListingMini[] | null
  buyer: Mini | Mini[] | null
  seller: Mini | Mini[] | null
}

const one = <T,>(v: T | T[] | null | undefined): T | null =>
  Array.isArray(v) ? (v[0] ?? null) : (v ?? null)

export async function fetchConvs(supabase: Client, me: string, id?: string): Promise<ConvSummary[]> {
  let q = supabase
    .from('conversations')
    .select('id, listing_id, buyer_id, seller_id, started_by, status, listings(id, title, price, image_urls, listing_type), buyer:profiles!buyer_id(id, full_name), seller:profiles!seller_id(id, full_name)')
  if (id) q = q.eq('id', id)
  const { data } = await q.order('last_message_at', { ascending: false }).limit(50)
  return ((data ?? []) as unknown as Row[]).map(r => {
    const iAmBuyer = r.buyer_id === me
    const other = one(iAmBuyer ? r.seller : r.buyer)
    return {
      id: r.id,
      listing_id: r.listing_id,
      status: r.status,
      started_by: r.started_by,
      otherId: iAmBuyer ? r.seller_id : r.buyer_id,
      otherName: other?.full_name ?? 'MilapHub user',
      listing: one(r.listings),
    }
  })
}

type Props = { me: string; activeId?: string | null; onOpen: (c: ConvSummary) => void }

export default function ItemChats({ me, activeId = null, onOpen }: Props) {
  const [supabase] = useState(() => createClient())
  const [convs, setConvs] = useState<ConvSummary[]>([])
  const [unread, setUnread] = useState<Record<string, number>>({})

  const reload = useCallback(async () => {
    setConvs(await fetchConvs(supabase, me))
    const { data } = await supabase
      .from('messages').select('conversation_id').eq('receiver_id', me).is('read_at', null).not('conversation_id', 'is', null)
    const counts: Record<string, number> = {}
    for (const m of data ?? []) {
      const id = m.conversation_id as string
      counts[id] = (counts[id] ?? 0) + 1
    }
    setUnread(counts)
  }, [supabase, me])

  useEffect(() => {
    reload()
    const ch = supabase
      .channel(`item-chats-${me}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => { reload() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `receiver_id=eq.${me}` }, () => { reload() })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [supabase, me, reload])

  return (
    <section className="rounded-2xl border border-[#e5eceb] bg-white p-3">
      <h3 className="mb-2 text-sm font-extrabold">Item chats</h3>
      {convs.length === 0 ? (
        <p className="text-sm text-[#5d7776]">Chats about Bazaar listings will show up here.</p>
      ) : (
        <ul className="space-y-1">
          {convs.map(c => {
            const n = unread[c.id] ?? 0
            return (
              <li key={c.id}>
                <button
                  onClick={() => onOpen(c)}
                  className={`flex w-full items-center gap-2 rounded-xl p-1.5 text-left hover:bg-[#f3f7f6] ${activeId === c.id ? 'bg-[#e3efee]' : ''}`}
                >
                  <span className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[#f3f7f6]">
                    {c.listing?.image_urls?.[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.listing.image_urls[0]} alt="" className="h-full w-full object-cover" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{c.otherName}</span>
                    <span className="block truncate text-xs text-[#5d7776]">
                      {c.listing ? `${c.listing.title} · ${priceLabel(c.listing.listing_type, c.listing.price)}` : 'Listing unavailable'}
                    </span>
                  </span>
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
  )
}
