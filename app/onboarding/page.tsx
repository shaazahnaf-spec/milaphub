'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    city: '',
    state: '',
    area: '',
  })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setError('User not authenticated')
      setLoading(false)
      return
    }

    try {
      // 1. Get or create city using database function from migration 002
      const { data: cityId, error: cityError } = await supabase.rpc('get_or_create_city', {
        p_name: formData.city,
        p_state: formData.state,
      })

      if (cityError) throw cityError

      // 2. Insert profile details with city_id
      const { error: insertError } = await supabase.from('profiles').insert({
        id: user.id,
        full_name: formData.fullName,
        username: formData.username.toLowerCase().trim(),
        city_id: cityId,
        area: formData.area,
      })

      if (insertError) throw insertError

      router.push('/home')
    } catch (err: any) {
      setError(err.message || 'An error occurred during onboarding')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F9F6] flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-emerald-100 max-w-md w-full">
        <h2 className="text-2xl font-bold text-[#0D463B] mb-2">Set Up Your Profile</h2>
        <p className="text-gray-600 text-sm mb-6">Enter your details to connect with people and local spaces on MilapHub.</p>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Abdul Ahnaf"
              className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#0D463B] outline-none"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              required
              placeholder="e.g. ahnaf_shaaz"
              className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#0D463B] outline-none"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input
              type="text"
              required
              placeholder="e.g. Hyderabad"
              className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#0D463B] outline-none"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
            <input
              type="text"
              required
              placeholder="e.g. Telangana"
              className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#0D463B] outline-none"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Area / Locality (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Banjara Hills"
              className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#0D463B] outline-none"
              value={formData.area}
              onChange={(e) => setFormData({ ...formData, area: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0D463B] hover:bg-[#09332b] text-white py-3 rounded-lg font-medium transition"
          >
            {loading ? 'Saving Profile...' : 'Continue to Dashboard'}
          </button>
        </form>
      </div>
    </div>
  )
}
