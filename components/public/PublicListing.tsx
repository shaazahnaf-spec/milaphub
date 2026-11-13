// FILE: components/public/PublicListing.tsx  (one listing, for visitors)
import Link from 'next/link'
import PublicShell from '@/components/public/PublicShell'
import ListingGallery from '@/components/public/ListingGallery'
import ListingCard, { type CardListing } from '@/components/public/ListingCard'
import { categoryLabel, one, priceLabel, type Listing } from '@/lib/bazaar'

export default function PublicListing({
  listing, cityName, similar,
}: { listing: Listing; cityName: string | null; similar: CardListing[] }) {
  const wanted = listing.listing_type === 'wanted'
  const seller = one(listing.profiles)
  const where = [listing.locality, cityName].filter(Boolean).join(', ')
  const tags = [categoryLabel(listing.category), wanted ? 'Wanted' : listing.condition === 'new' ? 'New' : 'Used']

  return (
    <PublicShell active="bazaar" category={listing.category}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <ListingGallery images={listing.image_urls ?? []} title={listing.title} />

        <section className="rounded-2xl border border-[#e5eceb] bg-white p-5">
          <h1 className="text-2xl font-extrabold leading-tight">{listing.title}</h1>
          <p className="mt-1 text-2xl font-extrabold text-[#0f5c5a]">{priceLabel(listing.listing_type, listing.price)}</p>
          {where && <p className="mt-1 text-sm text-[#5d7776]">{where}</p>}

          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map(t => <span key={t} className="rounded-full bg-[#e3efee] px-3 py-1 text-xs font-bold text-[#0f5c5a]">{t}</span>)}
          </div>

          <Link href="/login" className="mt-5 block rounded-xl bg-[#0f5c5a] px-5 py-3 text-center font-bold text-white hover:bg-[#0c4a48]">
            Log in to message the seller
          </Link>
          <p className="mt-2 text-center text-xs text-[#5d7776]">Free to join. Save items, chat and post your own.</p>

          {listing.description && (
            <>
              <h2 className="mt-6 text-sm font-bold uppercase tracking-wide text-[#5d7776]">Description</h2>
              <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed">{listing.description}</p>
            </>
          )}

          {seller && (seller.full_name || seller.username) && (
            <p className="mt-6 text-sm text-[#5d7776]">Seller: <span className="font-semibold text-[#12302f]">{seller.full_name ?? `@${seller.username}`}</span></p>
          )}
          <p className="mt-4 rounded-lg bg-[#f3f7f6] p-3 text-xs text-[#5d7776]">
            Safety tip: pehle chat mein baat kijiye, saamne milkar saaman dekhiye aur paise baad mein dijiye.
          </p>
        </section>
      </div>

      {similar.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-extrabold">More in {cityName ?? 'your city'}</h2>
          <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-4">
            {similar.map(l => <ListingCard key={l.id} l={l} cityName={cityName} />)}
          </ul>
        </section>
      )}
    </PublicShell>
  )
}
