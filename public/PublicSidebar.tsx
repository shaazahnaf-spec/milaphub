// FILE: components/public/PublicSidebar.tsx
// Left sidebar for visitors. It scrolls on its own (sticky + overflow-y-auto), like Facebook's.
import Link from 'next/link'
import { CATEGORIES } from '@/lib/bazaar'

export type ServiceKey = 'reels' | 'bazaar' | 'pages' | 'matrimony' | ''

const SERVICES: { key: ServiceKey; href: string; label: string; badge: string }[] = [
  { key: 'reels', href: '/reels', label: 'Reels', badge: 'Rl' },
  { key: 'bazaar', href: '/bazaar', label: 'Bazaar', badge: 'Bz' },
  { key: 'pages', href: '/pages', label: 'Pages', badge: 'Pg' },
  { key: 'matrimony', href: '/matrimony', label: 'Matrimony', badge: 'Mt' },
]

const bazaarHref = (cityId: number | null | undefined, category?: string) => {
  const p = new URLSearchParams()
  if (cityId) p.set('city', String(cityId))
  if (category) p.set('category', category)
  const qs = p.toString()
  return qs ? `/bazaar?${qs}` : '/bazaar'
}

export default function PublicSidebar({
  active = '', category = '', cityId = null, q = '',
}: { active?: ServiceKey; category?: string; cityId?: number | null; q?: string }) {
  const row = (isActive: boolean) =>
    `flex items-center gap-3 rounded-lg px-2 py-2 text-[15px] font-semibold ${isActive ? 'bg-[#e3efee] text-[#0f5c5a]' : 'text-[#12302f] hover:bg-[#f3f7f6]'}`

  return (
    <aside aria-label="MilapHub services"
      className="sticky top-16 hidden h-[calc(100vh-4rem)] w-[300px] shrink-0 overflow-y-auto border-r border-[#e5eceb] bg-white p-3 lg:block">
      <form action="/bazaar" method="get" role="search" className="mb-4">
        {cityId ? <input type="hidden" name="city" value={cityId} /> : null}
        <input name="q" defaultValue={q} placeholder="Search Bazaar" aria-label="Search Bazaar"
          className="w-full rounded-full bg-[#f3f7f6] px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f5c5a]/30" />
      </form>

      <p className="px-2 pb-1 text-xs font-bold uppercase tracking-wide text-[#5d7776]">Services</p>
      <nav className="space-y-0.5">
        {SERVICES.map(s => (
          <Link key={s.key} href={s.href} aria-current={active === s.key ? 'page' : undefined} className={row(active === s.key)}>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#e3efee] text-xs font-bold text-[#0f5c5a]">{s.badge}</span>
            {s.label}
          </Link>
        ))}
      </nav>

      <hr className="my-4 border-[#e5eceb]" />

      <p className="px-2 pb-1 text-xs font-bold uppercase tracking-wide text-[#5d7776]">Bazaar categories</p>
      <nav className="space-y-0.5">
        <Link href={bazaarHref(cityId)} className={row(active === 'bazaar' && !category)}>
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[#0f5c5a] text-xs font-bold text-white">All</span>
          Browse all
        </Link>
        {CATEGORIES.map(c => (
          <Link key={c.id} href={bazaarHref(cityId, c.id)} aria-current={category === c.id ? 'page' : undefined} className={row(category === c.id)}>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#e3efee] text-xs font-bold text-[#0f5c5a]">
              {c.label.charAt(0)}
            </span>
            {c.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
