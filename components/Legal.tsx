// FILE: components/Legal.tsx
import Link from 'next/link'
import { SITE } from '@/lib/site'

const LINKS: [string, string][] = [
  ['/privacy', 'Privacy Policy'],
  ['/terms', 'Terms of Use'],
  ['/refund', 'Refund Policy'],
  ['/guidelines', 'Community Guidelines'],
  ['/contact', 'Contact and Grievance'],
]

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-[#12302f]">
      <header className="border-b border-[#e5eceb]">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Link href="/home" className="text-xl font-extrabold text-[#0f5c5a]">{SITE.brand}</Link>
          <Link href="/home" className="rounded-full border border-[#dbe5e4] px-4 py-2 text-sm font-semibold hover:bg-[#f3f7f6]">
            Back to {SITE.brand}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-[#5d7776]">Last updated: {SITE.updated}</p>
        <div className="mt-6 space-y-6 text-[15px] leading-relaxed">{children}</div>
      </main>

      <footer className="border-t border-[#e5eceb]">
        <nav className="mx-auto flex max-w-3xl flex-wrap gap-x-5 gap-y-2 px-4 py-6 text-sm" aria-label="Legal">
          {LINKS.map(([href, label]) => (
            <Link key={href} href={href} className="font-semibold text-[#0f5c5a] hover:underline">{label}</Link>
          ))}
        </nav>
        <p className="mx-auto max-w-3xl px-4 pb-8 text-xs text-[#5d7776]">
          © 2026 {SITE.company}. {SITE.brand} is operated by {SITE.company}.
        </p>
      </footer>
    </div>
  )
}

export function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-extrabold">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

export function UL({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5">
      {items.map(i => <li key={i}>{i}</li>)}
    </ul>
  )
}
