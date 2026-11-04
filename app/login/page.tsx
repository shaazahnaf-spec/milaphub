'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    const { error: magicLinkError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/onboarding`,
      },
    })

    if (magicLinkError) {
      setError(magicLinkError.message)
    } else {
      setMessage('A confirmation link has been sent to your email. Please check your inbox and click the link to continue.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#F4F9F6] flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-emerald-100 max-w-md w-full text-center">
        <h1 className="text-3xl font-bold text-[#0D463B] mb-2">MilapHub</h1>
        <p className="text-gray-600 text-sm mb-6">Connect with people, groups, and local spaces in your city.</p>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 text-left">
            {error}
          </div>
        )}

        {message ? (
          <div className="bg-emerald-50 border border-emerald-200 text-[#0D463B] p-4 rounded-xl text-sm mb-4 text-left">
            <p className="font-semibold mb-1">Check your email!</p>
            <p>{message}</p>
          </div>
        ) : (
          <form onSubmit={handleMagicLinkLogin} className="space-y-4 text-left">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                placeholder="enter your email address"
                className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#0D463B] outline-none text-gray-800"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0D463B] hover:bg-[#09332b] text-white py-3 rounded-lg font-medium transition"
            >
              {loading ? 'Sending link...' : 'Send Magic Link'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
