'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../lib/supabase/client'

const AREAS = ['Banjara Hills','Jubilee Hills','Madhapur','Gachibowli','Kukatpally','Ameerpet','Secunderabad',
  'Charminar / Old City','Tolichowki','Mehdipatnam','LB Nagar','Dilsukhnagar','Uppal','Attapur','Other']

export default function Onboarding() {
  const supabase = createClient()
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [area, setArea] = useState(AREAS[0])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!/^[a-z0-9_]{3,20}$/.test(username))
      return setError('Username 3-20 characters ka ho: sirf small letters, numbers ya underscore.')
    setBusy(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.replace('/login')
    const { error } = await supabase.from('profiles').upsert({
      id: user.id, full_name: fullName.trim(), username, area,
    })
    setBusy(false)
    if (error) return setError(error.code === '23505' ? 'Ye username pehle se liya hua hai.' : error.message)
    router.replace('/')
    router.refresh()
  }

  const input = 'w-full rounded-lg border border-[#dbe5e4] px-3 py-3 outline-none focus:border-[#0f5c5a]'
  return (
    <main className="min-h-screen grid place-items-center bg-[#eef3f2] p-4">
      <form onSubmit={save} className="w-full max-w-sm space-y-3 rounded-2xl bg-white p-8 border border-[#dbe5e4]">
        <h1 className="text-xl font-bold text-[#12302f]">Apna profile banao</h1>
        <p className="text-sm text-[#5d7776] mb-2">Ye 30 second ka kaam hai.</p>
        <input required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Poora naam" className={input} />
        <input required value={username} onChange={e => setUsername(e.target.value.toLowerCase())} placeholder="username" className={input} />
        <select value={area} onChange={e => setArea(e.target.value)} className={input} aria-label="Area">
          {AREAS.map(a => <option key={a}>{a}</option>)}
        </select>
        <button disabled={busy} className="w-full rounded-lg bg-[#0f5c5a] py-3 font-bold text-white disabled:opacity-60">
          {busy ? 'Save ho raha hai...' : 'Save and continue'}
        </button>
        {error && <p role="alert" className="text-sm text-[#c0392b]">{error}</p>}
      </form>
    </main>
  )
}
