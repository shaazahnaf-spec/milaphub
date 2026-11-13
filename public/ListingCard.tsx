// FILE: components/public/ListingCard.tsx  (Facebook-Marketplace-style card)
import Link from 'next/link'
import { priceLabel } from '@/lib/bazaar'

export type CardListing = {
  id: string; title: string; price: number; listing_type: string
  locality: string | null; image_urls: string[] | null; category: string
}

export default function ListingCard({ l, cityName }: { l: CardListing; cityName?: string | null }) {
  const img = l.image_urls?.[0]
  return (
    <li>
      <Link href={`/bazaar/${l.id}`} className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0f5c5a]">
        <div className="aspect-square w-full overflow-hidden rounded-xl bg-[#e3efee]">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt={l.title} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
          ) : (
            <div className="grid h-full w-full place-items-center text-3xl font-bold text-[#0f5c5a]/40">{l.title.charAt(0).toUpperCase()}</div>
          )}
        </div>
        <p className="mt-2 text-[17px] font-extrabold leading-tight text-[#12302f]">{priceLabel(l.listing_type, l.price)}</p>
        <p className="truncate text-[15px] text-[#12302f]">{l.title}</p>
        <p className="truncate text-xs text-[#5d7776]">{[l.locality, cityName].filter(Boolean).join(', ')}</p>
      </Link>
    </li>
  )
}
