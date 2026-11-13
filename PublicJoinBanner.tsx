// FILE: components/PublicJoinBanner.tsx
'use client'

// Subtle bottom banner for visitors who are not logged in. Never blocks the content:
// it appears after the page has loaded, can be closed, and never shows to logged-in users.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const KEY = 'milaphub-join-dismissed'

export default function PublicJoinBanner({ message }: { message: string }) {
  const [supabase] = useState(() => createClient())
  const [show, setShow] = useState(false)

  useEffect(() => {
    let off = false
    try {
      if (sessionStorage.getItem(KEY) === '1') return
    } catch { /* storage blocked: show the banner */ }
    supabase.auth.getSession()
      .then(({ data }) => { if (!off && !data.session) setShow(true) })
      .catch(() => { if (!off) setShow(true) })
    return () => { off = true }
  }, [supabase])

  function dismiss() {
    setShow(false)
    try { sessionStorage.setItem(KEY, '1') } catch { /* ignore */ }
  }

  if (!show) return null

  return (
    <div role="region" aria-label="Join MilapHub" className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-xl items-center gap-3 rounded-2xl border border-[#e5eceb] bg-white p-3 shadow-xl">
        <p className="min-w-0 flex-1 text-sm text-[#12302f]">
          <span aria-hidden="true">👋 </span>{message}
        </p>
        <Link href="/login" className="shrink-0 rounded-full bg-[#0f5c5a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0c4a48]">
          Join Now
        </Link>
        <button type="button" onClick={dismiss} aria-label="Close" className="shrink-0 rounded-full p-1 text-xl leading-none text-stone-400 hover:text-stone-700">
          ×
        </button>
      </div>
    </div>
  )
}
