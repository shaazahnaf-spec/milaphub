// FILE: lib/bazaar.ts

export const CATEGORIES = [
  { id: 'mobiles', label: 'Mobiles and tablets' },
  { id: 'electronics', label: 'Electronics' },
  { id: 'vehicles', label: 'Vehicles' },
  { id: 'furniture', label: 'Furniture' },
  { id: 'home', label: 'Home and kitchen' },
  { id: 'fashion', label: 'Fashion' },
  { id: 'books', label: 'Books and hobbies' },
  { id: 'property', label: 'Property for rent' },
  { id: 'services', label: 'Services' },
  { id: 'other', label: 'Other' },
]

export const categoryLabel = (id: string) => CATEGORIES.find(c => c.id === id)?.label ?? id
export const inr = (n: number) => (n === 0 ? 'Free' : `₹${n.toLocaleString('en-IN')}`)

// Sell listing mein price, Wanted listing mein budget
export const priceLabel = (type: string, price: number) =>
  type === 'wanted'
    ? price === 0 ? 'Open budget' : `Budget ₹${price.toLocaleString('en-IN')}`
    : inr(price)

export const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Pending approval', cls: 'bg-[#fff4d6] text-[#7a5600]' },
  approved: { label: 'Live', cls: 'bg-[#e3f6e8] text-[#1c7a37]' },
  rejected: { label: 'Rejected', cls: 'bg-[#fdecea] text-[#c0392b]' },
  sold: { label: 'Sold', cls: 'bg-[#f3f7f6] text-[#5d7776]' },
  removed: { label: 'Removed', cls: 'bg-[#fdecea] text-[#c0392b]' },
}

export type Person = { full_name: string | null; username: string | null }

export type Listing = {
  id: string
  seller_id: string
  city_id: number
  title: string
  description: string | null
  price: number
  category: string
  condition: string
  locality: string | null
  image_urls: string[]
  status: string
  reject_reason: string | null
  listing_type: string
  lat: number | null
  lng: number | null
  profiles?: Person | Person[] | null
}

export const one = <T,>(v: T | T[] | null | undefined): T | null =>
  Array.isArray(v) ? (v[0] ?? null) : (v ?? null)

// Public URL se storage path (photo delete ke liye)
export function bazaarPath(url: string): string | null {
  const part = url.split('/object/public/bazaar/')[1]
  return part ? decodeURIComponent(part.split('?')[0]) : null
}

// Locality ka approximate coordinate (OpenStreetMap Nominatim, free). Database mein ~1 km tak round hota hai.
export async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=in&q=${encodeURIComponent(query)}`,
      { headers: { Accept: 'application/json' } }
    )
    if (!res.ok) return null
    const arr = (await res.json()) as { lat: string; lon: string }[]
    if (!arr[0]) return null
    const lat = Number(arr[0].lat)
    const lng = Number(arr[0].lon)
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
  } catch {
    return null
  }
}

// Chat ke quick reply chips
export const CHIPS: Record<string, string[]> = {
  sell: ['Is this available?', 'Is the price negotiable?', 'Where can we meet?'],
  wanted: ['I have this item', 'What is your budget?', 'I can share photos'],
}
