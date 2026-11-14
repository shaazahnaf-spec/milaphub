'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana',
  'Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur',
  'Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Andaman and Nicobar Islands','Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu','Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry',
]

export default function Onboarding() {
  const [supabase] = useState(() => createClient())
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [state, setState] = useState('')
  const [city, setCity] = useState('')
  const [area, setArea] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!state) { setSuggestions([]); return }
    supabase.from('cities').select('name').eq('state', state).order('name').limit(50)
      .then(({ data }) => setSuggestions((data ?? []).map(c => c.name as string)))
  }, [state, supabase])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!/^[a-z0-9_]{3,20}$/.test(username))
      return setError('Username must be 3-20 characters: lowercase letters, numbers or underscore only.')
    if (!state) return setError('Please choose your state.')
    if (city.trim().length < 2) return setError('Please enter your city.')
    setBusy(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.replace('/login')

    const { data: cityId, error: cityErr } = await supabase.rpc('get_or_create_city', {
      p_name: city, p_state: state,
    })
    if (cityErr) { setBusy(false); return setError(cityErr.message) }

    const { error } = await supabase.from('profiles').upsert({
      id: user.id, full_name: fullName.trim(), username,
      city_id: cityId as number, area: area.trim() || null,
    })
    setBusy(false)
    if (error) return setError(error.code === '23505' ? 'That username is already taken.' : error.message)
    router.replace('/home')
    router.refresh()
  }

  const input = 'w-full rounded-lg border border-[#dbe5e4] px-3 py-3 outline-none focus:border-[#0f5c5a]'
  return (
    <main className="grid min-h-screen place-items-center bg-[#eef3f2] p-4">
      <form onSubmit={save} className="w-full max-w-sm space-y-3 rounded-2xl border border-[#dbe5e4] bg-white p-8">
        <h1 className="text-xl font-bold text-[#12302f]">Set up your profile</h1>
        <p className="mb-2 text-sm text-[#5d7776]">This takes about 30 seconds.</p>
        <input required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Full name" className={input} />
        <input required value={username} onChange={e => setUsername(e.target.value.toLowerCase())} placeholder="username" className={input} />
        <select required value={state} onChange={e => setState(e.target.value)} className={input} aria-label="State">
          <option value="">Select your state</option>
          {STATES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input required value={city} onChange={e => setCity(e.target.value)} list="city-list"
          placeholder="City (for example, Hyderabad)" className={input} />
        <datalist id="city-list">
          {suggestions.map(n => <option key={n} value={n} />)}
        </datalist>
        <input value={area} onChange={e => setArea(e.target.value)} placeholder="Locality / area (optional)" className={input} />
        <button disabled={busy} className="w-full rounded-lg bg-[#0f5c5a] py-3 font-bold text-white disabled:opacity-60">
          {busy ? 'Saving...' : 'Save and continue'}
        </button>
        {error && <p role="alert" className="text-sm text-[#c0392b]">{error}</p>}
      </form>
    </main>
  )
}
