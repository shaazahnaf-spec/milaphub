// FILE: components/public/CitySelect.tsx
'use client'
import { useRouter } from 'next/navigation'

export default function CitySelect({
  cities, cityId, category, q,
}: { cities: { id: number; name: string }[]; cityId: number | null; category?: string; q?: string }) {
  const router = useRouter()
  function change(id: string) {
    const p = new URLSearchParams({ city: id })
    if (category) p.set('category', category)
    if (q) p.set('q', q)
    router.push(`/bazaar?${p.toString()}`)
  }
  return (
    <label className="flex items-center gap-2 text-sm font-semibold text-[#0f5c5a]">
      <span>City</span>
      <select value={cityId ?? ''} onChange={e => change(e.target.value)}
        className="rounded-full border border-[#dbe5e4] bg-white px-4 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-[#0f5c5a]/30">
        {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
    </label>
  )
}
