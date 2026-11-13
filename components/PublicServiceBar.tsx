// FILE: components/PublicServiceBar.tsx
// Service links for visitors on public pages (the home sidebar needs a login).
import Link from 'next/link'

const SERVICES = [
  { href: '/reels', label: 'Reels' },
  { href: '/bazaar', label: 'Bazaar' },
  { href: '/pages', label: 'Pages' },
  { href: '/matrimony', label: 'Matrimony' },
]

export default function PublicServiceBar({ current }: { current?: string }) {
  return (
    <nav aria-label="MilapHub services" className="border-b border-[#e5eceb] bg-white">
      <div className="mx-auto flex max-w-[1400px] gap-2 overflow-x-auto px-4 py-2">
        {SERVICES.map(s => (
          <Link
            key={s.href}
            href={s.href}
            aria-current={current === s.href ? 'page' : undefined}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold ${current === s.href ? 'bg-[#0f5c5a] text-white' : 'bg-[#f3f7f6] text-[#12302f] hover:bg-[#e3efee]'}`}
          >
            {s.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
