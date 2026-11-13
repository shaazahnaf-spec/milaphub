// FILE: app/bazaar/[id]/page.tsx
// PUBLIC listing page. Server-rendered so the first HTML already has the listing and the
// WhatsApp / social preview (Open Graph). The interactive part lives in ListingClient.tsx.

import { cache } from 'react'
import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import ListingClient from './ListingClient'
import { categoryLabel, priceLabel, type Listing } from '@/lib/bazaar'

export const dynamic = 'force-dynamic'

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://milaphub.vercel.app').replace(/\/$/, '')

const SELECT =
  'id, seller_id, city_id, title, description, price, category, condition, locality, image_urls, status, reject_reason, listing_type, lat, lng, profiles!seller_id(full_name, username)'

type Found = { listing: Listing; cityName: string | null }

// One anonymous read shared by generateMetadata and the page. RLS decides what is public.
const getListing = cache(async (id: string): Promise<Found | null> => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
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
  const title = `${l.title} - ${priceLabel(l.listing_type, l.price)}`
  const where = [l.locality, cityName].filter(Boolean).join(', ')
  const base = [categoryLabel(l.category), where].filter(Boolean).join(' · ')
  const description = (l.description ? `${base}. ${l.description}` : base).replace(/\s+/g, ' ').slice(0, 200)
  const image = l.image_urls?.[0]
  const url = `${SITE_URL}/bazaar/${l.id}`

  return {
    metadataBase: new URL(SITE_URL),
    title: `${title} | MilapHub Bazaar`,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      siteName: 'MilapHub',
      url,
      title,
      description,
      ...(image ? { images: [{ url: image, alt: l.title }] } : {}),
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  }
}

export default async function ListingRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const found = await getListing(id)
  return <ListingClient initialListing={found?.listing ?? null} initialCityName={found?.cityName ?? null} />
}
