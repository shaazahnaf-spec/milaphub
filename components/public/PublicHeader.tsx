// FILE: components/public/PublicHeader.tsx
'use client'

// Top bar for visitors, like Facebook's: brand on the left, a login form on the right
// (small screens get Log in / Sign up buttons instead).

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function PublicHeader() {
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function login(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (err) {
      setError(err.message.toLowerCase().includes('confirm')
        ? 'Please verify your email first.'
        : 'Incorrect email or password.')
      return
    }
    router.refresh() // the same page now renders for a logged-in user
  }

  const field = 'w-44 rounded-lg border border-[#dbe5e4] bg-white px-3 py-2 text-sm outline-none focus:border-[#0f5c5a] focus:ring-2 focus:ring-[#0f5c5a]/20 xl:w-52'

  return (
    <header className="sticky top-0 z-30 border-b border-[#e5eceb] bg-white">
      <div className="relative mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4">
        <Link href="/bazaar" className="text-2xl font-extrabold text-[#0f5c5a]">MilapHub</Link>

        <form onSubmit={login} className="ml-auto hidden items-center gap-2 lg:flex">
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Email address" autoComplete="email" aria-label="Email" className={field} />
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Password" autoComplete="current-password" aria-label="Password" className={field} />
          <button type="submit" disabled={busy}
            className="rounded-lg bg-[#0f5c5a] px-5 py-2 text-sm font-bold text-white hover:bg-[#0c4a48] disabled:opacity-60">
            {busy ? '...' : 'Log in'}
          </button>
          <Link href="/login" className="text-sm font-semibold text-[#0f5c5a] hover:underline">Forgotten account?</Link>
        </form>

        <div className="ml-auto flex gap-2 lg:hidden">
          <Link href="/login" className="rounded-full border border-[#dbe5e4] px-4 py-2 text-sm font-semibold">Log in</Link>
          <Link href="/login" className="rounded-full bg-[#0f5c5a] px-4 py-2 text-sm font-semibold text-white">Sign up</Link>
        </div>

        {error && (
          <p role="alert" className="absolute right-4 top-full mt-1 rounded-lg bg-red-50 px-3 py-1.5 text-sm text-red-700 shadow">
            {error}
          </p>
        )}
      </div>
    </header>
  )
}
