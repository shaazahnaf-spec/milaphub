// FILE: components/public/PublicBazaar.tsx
// Public Bazaar for visitors: Facebook-Marketplace-style grid, filtered on the server
// (city, category, search come from the URL), so the first HTML already has the listings.

import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import PublicShell from '@/components/public/PublicShell'
import ListingCard, { type CardListing } from '@/components/public/ListingCard'
import CitySelect from '@/components/public/CitySelect'
import { CATEGORIES, categoryLabel } from '@/lib/bazaar'

type City = { id: number; name: string; state: string }
type Params = Record<string, string | string[] | undefined>

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''

export default async function PublicBazaar({ params }: { params: Params }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

  const { data: citiesRaw } = await supabase.from('cities').select('id, name, state').order('name')
  const cities = (citiesRaw ?? []) as City[]
  const wanted = Number(first(params.city))
  const city =
    cities.find(c => c.id === wanted) ??
    cities.find(c => c.name.toLowerCase() === 'hyderabad') ??
    cities[0] ?? null

  const category = CATEGORIES.some(c => c.id === first(params.category)) ? first(params.category) : ''
  const term = first(params.q).replace(/[%_,()\\*]/g, ' ').trim().slice(0, 60)

  let items: CardListing[] = []
  let failed = false
  if (city) {
    let query = supabase
      .from('listings')
      .select('id, title, price, listing_type, locality, image_urls, category')
      .eq('status', 'approved')
      .gt('expires_at', new Date().toISOString())
      .eq('city_id', city.id)
      .order('created_at', { ascending: false })
      .limit(48)
    if (category) query = query.eq('category', category)
    if (term) query = query.ilike('title', `%${term}%`)
    const { data, error } = await query
    if (error) failed = true
    items = (data ?? []) as CardListing[]
  }

  const heading = category ? categoryLabel(category) : term ? `Results for "${term}"` : "Today's picks"
  const chip = (active: boolean) =>
    `shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold ${active ? 'bg-[#0f5c5a] text-white' : 'bg-white text-[#12302f] border border-[#dbe5e4]'}`
  const catHref = (id: string) => {
    const p = new URLSearchParams()
    if (city) p.set('city', String(city.id))
    if (id) p.set('category', id)
    const qs = p.toString()
    return qs ? `/bazaar?${qs}` : '/bazaar'
  }

  return (
    <PublicShell active="bazaar" category={category} cityId={city?.id ?? null} q={term}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">{heading}</h1>
        {cities.length > 0 && <CitySelect cities={cities} cityId={city?.id ?? null} category={category} q={term} />}
      </div>

      {/* categories for small screens (the sidebar is hidden there) */}
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
        <Link href={catHref('')} className={chip(!category)}>All</Link>
        {CATEGORIES.map(c => <Link key={c.id} href={catHref(c.id)} className={chip(category === c.id)}>{c.label}</Link>)}
      </div>

      {failed && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">Listings could not be loaded. Please try again in a moment.</p>}

      {!failed && items.length === 0 && (
        <p className="mt-6 rounded-2xl bg-white p-8 text-center text-[#5d7776]">
          {city ? `No listings in ${city.name} yet.` : 'The city list could not be loaded.'}
        </p>
      )}

      <ul className="mt-5 grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-4">
        {items.map(l => <ListingCard key={l.id} l={l} cityName={city?.name} />)}
      </ul>
    </PublicShell>
  )
}
