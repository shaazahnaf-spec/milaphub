// FILE: app/bazaar/[id]/page.tsx
// Visitors: public listing page inside the Facebook-style frame.
// Logged-in users: the full interactive page (ListingClient.tsx), as before.
// Both get the WhatsApp / social preview card (photo + title + price + MilapHub).

import { cache } from 'react'
import type { Metadata } from 'next'
import { createClient as createAnon } from '@supabase/supabase-js'
import { createClient as createServer } from '@/lib/supabase/server'
import ListingClient from './ListingClient'
import PublicListing from '@/components/public/PublicListing'
import type { CardListing } from '@/components/public/ListingCard'
import { categoryLabel, priceLabel, type Listing } from '@/lib/bazaar'
import { SITE_URL, previewImage, textCard } from '@/lib/og'

export const dynamic = 'force-dynamic'

const SELECT =
  'id, seller_id, city_id, title, description, price, category, condition, locality, image_urls, status, reject_reason, listing_type, lat, lng, profiles!seller_id(full_name, username)'

type Found = { listing: Listing; cityName: string | null }

const anon = () =>
  createAnon(process.env.NEXT_PUBLIC_SUPABASE_URL as string, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

// One anonymous read shared by generateMetadata and the page. RLS decides what is public.
const getListing = cache(async (id: string): Promise<Found | null> => {
  const supabase = anon()
  const { data, error } = await supabase.from('listings').select(SELECT).eq('id', id).maybeSingle()
  if (error || !data) return null
  const listing = data as unknown as Listing
  const { data: city } = await supabase.from('cities').select('name').eq('id', listing.city_id).maybeSingle()
  return { listing, cityName: (city as { name: string } | null)?.name ?? null }
})

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const found = await getListing(id)
  if (!found) return { title: 'Listing not found | MilapHub Bazaar', robots: { index: false } }

  const { listing: l, cityName } = found
  const price = priceLabel(l.listing_type, l.price)
  const title = `${l.title} - ${price}`
  const where = [l.locality, cityName].filter(Boolean).join(', ')
  const base = [categoryLabel(l.category), where].filter(Boolean).join(' · ')
  const description = (l.description ? `${base}. ${l.description}` : base).replace(/\s+/g, ' ').slice(0, 200)
  const image = previewImage(l.image_urls?.[0]) ?? textCard({ kind: 'Bazaar', text: title, by: cityName })
  const url = `${SITE_URL}/bazaar/${l.id}`

  return {
    metadataBase: new URL(SITE_URL),
    title: `${title} | MilapHub Bazaar`,
    description,
    alternates: { canonical: url },
    openGraph: { type: 'website', siteName: 'MilapHub', url, title: `${title} | MilapHub`, description, images: [{ url: image, alt: l.title }] },
    twitter: { card: 'summary_large_image', title: `${title} | MilapHub`, description, images: [image] },
  }
}

export default async function ListingRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const found = await getListing(id)

  const supabase = await createServer()
  const { data: { user } } = await supabase.auth.getUser()

  if (user || !found) {
    // logged-in users (or a listing visitors cannot see): the full interactive page
    return <ListingClient initialListing={found?.listing ?? null} initialCityName={found?.cityName ?? null} />
  }

  const { data: more } = await anon()
    .from('listings')
    .select('id, title, price, listing_type, locality, image_urls, category')
    .eq('status', 'approved')
    .gt('expires_at', new Date().toISOString())
    .eq('city_id', found.listing.city_id)
    .eq('category', found.listing.category)
    .neq('id', found.listing.id)
    .order('created_at', { ascending: false })
    .limit(8)

  return <PublicListing listing={found.listing} cityName={found.cityName} similar={(more ?? []) as CardListing[]} />
}
