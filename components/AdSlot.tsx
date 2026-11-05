// FILE: components/AdSlot.tsx  (GitHub mein is path par paste karo)
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type Ad = {
  id: string
  slot: string
  title: string
  body: string | null
  image_url: string | null
  media_type: string
  link_url: string
  advertiser: string | null
}

type Props = { ads?: Ad[]; cityName: string; imgClass?: string; boxClass?: string }

export default function AdSlot({
  ads = [],
  cityName,
  imgClass = 'aspect-[4/3]',
  boxClass = 'min-h-[140px]',
}: Props) {
  const [supabase] = useState(() => createClient())
  const [idx, setIdx] = useState(0)
  const [fade, setFade] = useState(true)
  const [paused, setPaused] = useState(false)
  const [reduced, setReduced] = useState(false)

  const count = ads.length
  const current = count ? idx % count : 0
  const ad = count ? ads[current] : undefined
  const adId = ad?.id
  const mediaType = ad?.media_type

  // "Reduce motion" wale logon ke liye auto slideshow aur video autoplay band
  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  // Har baar jab koi ad dikhta hai, ek impression ginti hoti hai (sirf jab tab khula ho)
  useEffect(() => {
    if (adId && document.visibilityState === 'visible') {
      supabase.rpc('ad_impression', { p_id: adId }).then(() => {})
    }
  }, [adId, supabase])

  // Slideshow: image 6 second, video 10 second. Mouse upar ho to ruk jata hai.
  useEffect(() => {
    if (count < 2 || paused || reduced) return
    let inner: ReturnType<typeof setTimeout> | undefined
    const t = setTimeout(() => {
      setFade(false)
      inner = setTimeout(() => {
        setIdx(i => (i + 1) % count)
        setFade(true)
      }, 300)
    }, mediaType === 'video' ? 10000 : 6000)
    return () => {
      clearTimeout(t)
      if (inner) clearTimeout(inner)
    }
  }, [idx, count, paused, reduced, mediaType])

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
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <a
        href={ad.link_url}
        target="_blank"
        rel="noopener noreferrer sponsored"
        onClick={() => { supabase.rpc('ad_click', { p_id: ad.id }).then(() => {}) }}
        className={`block overflow-hidden rounded-2xl border border-[#e5eceb] bg-white transition-opacity duration-300 hover:shadow-md ${fade ? 'opacity-100' : 'opacity-0'} ${boxClass}`}
      >
        {ad.image_url && (
          ad.media_type === 'video' ? (
            <video
              key={ad.id}
              src={ad.image_url}
              muted
              loop
              playsInline
              autoPlay={!reduced}
              preload="metadata"
              aria-hidden="true"
              className={`w-full object-cover ${imgClass}`}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={ad.id} src={ad.image_url} alt="" loading="lazy" className={`w-full object-cover ${imgClass}`} />
          )
        )}
        <div className="p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#5d7776]">Sponsored</p>
          <p className="font-bold leading-snug">{ad.title}</p>
          {ad.body && <p className="mt-0.5 text-sm text-[#5d7776]">{ad.body}</p>}
          {ad.advertiser && <p className="mt-1 text-xs text-[#5d7776]">{ad.advertiser}</p>}
        </div>
      </a>

      {count > 1 && (
        <div className="mt-1 flex justify-center" role="group" aria-label="Choose ad">
          {ads.map((a, i) => (
            <button
              key={a.id}
              type="button"
              onClick={() => { setIdx(i); setFade(true) }}
              aria-label={`Show ad ${i + 1} of ${count}`}
              aria-current={i === current}
              className="grid h-5 w-5 place-items-center"
            >
              <span className={`block h-2 rounded-full transition-all ${i === current ? 'w-5 bg-[#0f5c5a]' : 'w-2 bg-[#c9d9d7]'}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
