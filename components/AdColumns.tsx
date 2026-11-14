// FILE: components/AdColumns.tsx
'use client'

import AdSlot, { type Ad } from '@/components/AdSlot'

// Exactly 4 ad columns on every Matrimony page (the layout never changes)
export default function AdColumns({ ads, cityName }: { ads: Record<string, Ad[]>; cityName: string }) {
  return (
    <section aria-label="Sponsored">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#5d7776]">Sponsored</p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[1, 2, 3, 4].map(n => (
          <AdSlot
            key={n}
            ads={ads[`matri_${n}`]}
            cityName={cityName}
            startAt={n - 1}
            imgClass="aspect-[3/2]"
            boxClass="min-h-[0px]"
          />
        ))}
      </div>
    </section>
  )
}
