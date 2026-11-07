// FILE: components/BazaarHeader.tsx
'use client'

import Link from 'next/link'
import NotificationBell from '@/components/NotificationBell'

export default function BazaarHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <header className="border-b border-[#e5eceb] bg-white">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-3 px-4">
        <Link href="/home" className="text-xl font-extrabold text-[#0f5c5a]">MilapHub</Link>
        <span className="text-[#c9d9d7]" aria-hidden="true">/</span>
        <h1 className="text-lg font-extrabold text-[#12302f]">{title}</h1>
        <div className="ml-auto flex items-center gap-2">
          {children}
          <NotificationBell />
        </div>
      </div>
    </header>
  )
}
