'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Props = { userId: string; cityId: number; isNgo: boolean }

export default function PostComposer({ userId, cityId, isNgo }: Props) {
  const supabase = createClient()
  const [body, setBody] = useState('')
  const [category, setCategory] = useState('news')
  const [allowTips, setAllowTips] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    setBusy(true); setMsg(''); setError('')
    const { error } = await supabase.from('posts').insert({
      author_id: userId,
      city_id: cityId,
      category,
      body: body.trim(),
      allow_tips: category === 'confession' ? false : allowTips,
    })
    setBusy(false)
    if (error) return setError(error.message)
    setBody('')
    setMsg('Post admin approval ke liye bhej di gayi. Approve hote hi feed mein dikhegi.')
  }

  return (
    <form onSubmit={submit} className="mb-4 rounded-2xl border border-[#dbe5e4] bg-white p-4">
      <textarea value={body} onChange={e => setBody(e.target.value)} required maxLength={2000} rows={3}
        placeholder="Apni story, recipe ya baat share karo"
        className="w-full resize-none rounded-lg bg-[#eef3f2] p-3 outline-none" />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <select value={category} onChange={e => setCategory(e.target.value)} aria-label="Category"
          className="rounded-lg border border-[#dbe5e4] px-3 py-2 text-sm">
          <option value="news">Local story</option>
          <option value="confession">Confession</option>
          <option value="cooking">Cooking</option>
          {isNgo && <option value="campaign">Campaign</option>}
        </select>
        {category !== 'confession' && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={allowTips} onChange={e => setAllowTips(e.target.checked)} />
            {category === 'campaign' ? 'Donations allow karo' : 'Tips allow karo'}
          </label>
        )}
        <button disabled={busy}
          className="ml-auto rounded-lg bg-[#0f5c5a] px-5 py-2 font-bold text-white disabled:opacity-60">
          {busy ? 'Bhej rahe hain...' : 'Post'}
        </button>
      </div>
      {msg && <p className="mt-3 text-sm text-[#0f5c5a]">{msg}</p>}
      {error && <p role="alert" className="mt-3 text-sm text-[#c0392b]">{error}</p>}
    </form>
  )
}
