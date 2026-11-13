// FILE: components/public/ListingGallery.tsx
'use client'
import { useState } from 'react'

export default function ListingGallery({ images, title }: { images: string[]; title: string }) {
  const [i, setI] = useState(0)
  if (images.length === 0) {
    return <div className="grid aspect-square place-items-center rounded-2xl bg-[#e3efee] text-[#5d7776]">No photo</div>
  }
  return (
    <div>
      <div className="overflow-hidden rounded-2xl bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[i]} alt={`${title}, photo ${i + 1}`} className="aspect-square w-full object-contain" />
      </div>
      {images.length > 1 && (
        <div role="group" aria-label="Photos" className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((src, n) => (
            <button key={`${src}-${n}`} type="button" onClick={() => setI(n)} aria-label={`Photo ${n + 1}`} aria-current={n === i}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${n === i ? 'border-[#0f5c5a]' : 'border-transparent'}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
