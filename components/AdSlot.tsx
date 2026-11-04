'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type Ad = {
  id: string
  slot: string
  title: string
  body: string | null
  image_url: string | null
  link_url: string
  advertiser: string | null
}

type Props = { ad?: Ad; cityName: string; imgClass?: string; boxClass?: string }

export default function AdSlot({ ad, cityName, imgClass = 'aspect-[4/3]', boxClass = 'min-h-[140px]' }: Props) {
  const [supabase] = useState(() => createClient())
  const adId = ad?.id

  // Impression count (advertiser ko report dikhane ke liye)
  useEffect(() => {
    if (adId) supabase.rpc('ad_impression', { p_id: adId }).then(() => {})
  }, [adId, supabase])

  if (!ad) {
    return (
      <a
        href="mailto:ads@milaphub.com?subject=Advertise%20on%20MilapHub"
        className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#c9d9d7] p-4 text-center transition hover:bg-[#f3f7f6] ${boxClass}`}
      >
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#5d7776]">Advertise here</p>
        <p className="mt-1 text-sm font-bold">Reach people in {cityName}</p>
        <p className="text-xs text-[#5d7776]">Contact us to book this space</p>
      </a>
    )
  }

  return (
    <a
      href={ad.link_url}
      target="_blank"
      rel="noopener noreferrer sponsored"
      onClick={() => { supabase.rpc('ad_click', { p_id: ad.id }).then(() => {}) }}
      className="block overflow-hidden rounded-2xl border border-[#e5eceb] bg-white transition hover:shadow-md"
    >
      {ad.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={ad.image_url} alt="" loading="lazy" className={`w-full object-cover ${imgClass}`} />
      )}
      <div className="p-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#5d7776]">Sponsored</p>
        <p className="font-bold leading-snug">{ad.title}</p>
        {ad.body && <p className="mt-0.5 text-sm text-[#5d7776]">{ad.body}</p>}
        {ad.advertiser && <p className="mt-1 text-xs text-[#5d7776]">{ad.advertiser}</p>}
      </div>
    </a>
  )
}
