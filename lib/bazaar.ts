// FILE: lib/bazaar.ts  (GitHub mein is path par paste karo)

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
  profiles?: Person | Person[] | null
}

export const one = <T,>(v: T | T[] | null | undefined): T | null =>
  Array.isArray(v) ? (v[0] ?? null) : (v ?? null)

// Public URL se storage path (photo delete ke liye)
export function bazaarPath(url: string): string | null {
  const part = url.split('/object/public/bazaar/')[1]
  return part ? decodeURIComponent(part.split('?')[0]) : null
}
