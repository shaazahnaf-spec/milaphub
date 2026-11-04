'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function HomePage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*, cities(name, state)')
          .eq('id', user.id)
          .single()
        
        setProfile(data)
      }
      setLoading(false)
    }

    loadProfile()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F9F6] flex items-center justify-center text-[#0D463B] font-medium">
        Loading dashboard...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F4F9F6] p-6">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#0D463B]">
              Welcome, {profile?.full_name || 'User'}!
            </h1>
            <p className="text-gray-600 text-sm">
              @{profile?.username} • {profile?.cities?.name || 'Hyderabad'}, {profile?.cities?.state || 'Telangana'}
            </p>
          </div>
          <button
            onClick={async () => {
              await supabase.auth.signOut()
              window.location.href = '/login'
            }}
            className="text-sm border border-red-200 text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 transition"
          >
            Sign Out
          </button>
        </header>

        <main className="bg-white p-8 rounded-2xl shadow-sm border border-emerald-100 text-center text-gray-500">
          <p className="text-lg font-medium text-gray-700 mb-2">You are all set on MilapHub!</p>
          <p className="text-sm">Your city feed and local community features are ready.</p>
        </main>
      </div>
    </div>
  )
}
