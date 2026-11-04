'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type City = { id: number; name: string; state: string }

export default function Onboarding() {
  const supabase = createClient()
  const router = useRouter()
  const [cities, setCities] = useState<City[]>([])
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [cityId, setCityId] = useState('')
  const [area, setArea] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('cities').select('id, name, state').eq('is_active', true).order('name')
      .then(({ data }) => setCities((data ?? []) as City[]))
  }, [supabase])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!/^[a-z0-9_]{3,20}$/.test(username))
      return setError('Username 3-20 characters ka ho: sirf small letters, numbers ya underscore.')
    if (!cityId) return setError('Apna city chuno.')
    setBusy(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.replace('/login')
    const { error } = await supabase.from('profiles').upsert({
      id: user.id, full_name: fullName.trim(), username,
      city_id: Number(cityId), area: area.trim() || null,
    })
    setBusy(false)
    if (error) return setError(error.code === '23505' ? 'Ye username pehle se liya hua hai.' : error.message)
    router.replace('/home')
    router.refresh()
  }

  const input = 'w-full rounded-lg border border-[#dbe5e4] px-3 py-3 outline-none focus:border-[#0f5c5a]'
  return (
    <main className="grid min-h-screen place-items-center bg-[#eef3f2] p-4">
      <form onSubmit={save} className="w-full max-w-sm space-y-3 rounded-2xl border border-[#dbe5e4] bg-white p-8">
        <h1 className="text-xl font-bold text-[#12302f]">Apna profile banao</h1>
        <p className="mb-2 text-sm text-[#5d7776]">Ye 30 second ka kaam hai.</p>
        <input required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Poora naam" className={input} />
        <input required value={username} onChange={e => setUsername(e.target.value.toLowerCase())} placeholder="username" className={input} />
        <select required value={cityId} onChange={e => setCityId(e.target.value)} className={input} aria-label="City">
          <option value="">Apna city chuno</option>
          {cities.map(c => <option key={c.id} value={c.id}>{c.name}, {c.state}</option>)}
        </select>
        <input value={area} onChange={e => setArea(e.target.value)} placeholder="Locality (optional)" className={input} />
        <button disabled={busy} className="w-full rounded-lg bg-[#0f5c5a] py-3 font-bold text-white disabled:opacity-60">
          {busy ? 'Save ho raha hai...' : 'Save and continue'}
        </button>
        {error && <p role="alert" className="text-sm text-[#c0392b]">{error}</p>}
      </form>
    </main>
  )
}
