// FILE: components/MatrimonyAdmin.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DOC_TYPES, MARITAL, ageFromDob, cmToFt } from '@/lib/matrimony'

type Doc = { id: string; doc_type: string; storage_path: string; url?: string }
type Item = {
  id: string
  user_id: string
  created_by: string
  gender: string
  full_name: string
  dob: string
  marital_status: string
  height_cm: number | null
  maslak: string | null
  sub_community: string | null
  partner_prefs: string | null
  education: string | null
  occupation: string | null
  income_range: string | null
  about: string | null
  family_details: string | null
  photo_paths: string[]
  cities: { name: string } | { name: string }[] | null
  photos: string[]
  docs: Doc[]
}

export default function MatrimonyAdmin() {
  const [supabase] = useState(() => createClient())
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [uname, setUname] = useState('')
  const [tier, setTier] = useState('gold')
  const [days, setDays] = useState('30')
  const [count, setCount] = useState('10')

  const notify = useCallback((t: string) => {
    setToast(t)
    setTimeout(() => setToast(''), 3500)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('matrimony_profiles')
      .select('id, user_id, created_by, gender, full_name, dob, marital_status, height_cm, maslak, sub_community, education, occupation, income_range, about, family_details, partner_prefs, photo_paths, cities(name)')
      .eq('status', 'submitted')
      .order('updated_at', { ascending: true })
    if (error) { setLoading(false); return notify(error.message) }

    const out: Item[] = []
    for (const row of (data ?? []) as unknown as Item[]) {
      const { data: signedPhotos } = row.photo_paths.length
        ? await supabase.storage.from('matrimony-photos').createSignedUrls(row.photo_paths, 900)
        : { data: [] as { signedUrl: string }[] }
      const { data: docRows } = await supabase
        .from('matrimony_documents').select('id, doc_type, storage_path').eq('user_id', row.user_id)
      const docs: Doc[] = []
      for (const d of (docRows ?? []) as Doc[]) {
        const { data: s } = await supabase.storage.from('matrimony-docs').createSignedUrl(d.storage_path, 900)
        docs.push({ ...d, url: s?.signedUrl })
      }
      out.push({ ...row, photos: (signedPhotos ?? []).map(s => s.signedUrl).filter((url): url is string => url !== null), docs })
    }
    setItems(out)
    setLoading(false)
  }, [supabase, notify])

  useEffect(() => { load() }, [load])

  async function setTierFor() {
    const { error } = await supabase.rpc('admin_set_matrimony_tier', { p_username: uname, p_tier: tier, p_days: Number(days) || 30 })
    if (error) return notify(error.message)
    notify(`Plan updated for @${uname.toLowerCase().trim()}.`)
  }

  async function grant() {
    const { error } = await supabase.rpc('admin_grant_unlocks', { p_username: uname, p_count: Number(count) || 0 })
    if (error) return notify(error.message)
    notify(`Bonus unlocks added for @${uname.toLowerCase().trim()}.`)
  }

  async function approve(it: Item) {
    if (!window.confirm(`Verify ${it.full_name}? Their ID proof will be deleted after verification.`)) return
    const { data, error } = await supabase
      .from('matrimony_profiles')
      .update({ status: 'verified', verified_at: new Date().toISOString(), reject_reason: null })
      .eq('id', it.id).select('id')
    if (error) return notify(error.message)
    if (!data || data.length === 0) return notify('Could not verify this profile.')
    // Verify ho gaya: ID proof delete (sirf "verified" ka nishaan rahega)
    const paths = it.docs.map(d => d.storage_path)
    if (paths.length) await supabase.storage.from('matrimony-docs').remove(paths)
    await supabase.from('matrimony_documents').delete().eq('user_id', it.user_id)
    notify('Profile verified. ID proof deleted.')
    load()
  }

  async function reject(it: Item) {
    const reason = window.prompt('What should the user fix? They will see this message.')
    if (reason === null) return
    if (!reason.trim()) return notify('Please write a reason. The user will see it.')
    const { error } = await supabase
      .from('matrimony_profiles')
      .update({ status: 'rejected', reject_reason: reason.trim() })
      .eq('id', it.id)
    if (error) return notify(error.message)
    notify('Profile sent back to the user.')
    load()
  }

  return (
    <>
      <section className="space-y-3 rounded-2xl border border-[#e5eceb] p-4">
        <h2 className="font-extrabold">Plans and bonus unlocks (beta, by hand)</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs font-semibold">Username
            <input value={uname} onChange={e => setUname(e.target.value)} placeholder="username" className="mt-1 block w-40 rounded-xl border border-[#dbe5e4] px-3 py-2 text-sm outline-none focus:border-[#0f5c5a]" />
          </label>
          <label className="text-xs font-semibold">Plan
            <select value={tier} onChange={e => setTier(e.target.value)} className="mt-1 block rounded-xl border border-[#dbe5e4] px-3 py-2 text-sm">
              <option value="normal">Normal</option>
              <option value="gold">Gold</option>
              <option value="premium">Premium</option>
            </select>
          </label>
          <label className="text-xs font-semibold">Days
            <input type="number" min={1} value={days} onChange={e => setDays(e.target.value)} className="mt-1 block w-20 rounded-xl border border-[#dbe5e4] px-3 py-2 text-sm" />
          </label>
          <button onClick={setTierFor} className="rounded-full bg-[#0f5c5a] px-5 py-2 text-sm font-bold text-white hover:bg-[#0b4846]">Set plan</button>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs font-semibold">Extra unlocks for the same username
            <input type="number" min={1} value={count} onChange={e => setCount(e.target.value)} className="mt-1 block w-24 rounded-xl border border-[#dbe5e4] px-3 py-2 text-sm" />
          </label>
          <button onClick={grant} className="rounded-full border border-[#dbe5e4] px-5 py-2 text-sm font-bold hover:bg-[#f3f7f6]">Add unlocks</button>
        </div>
      </section>

      <h2 className="text-lg font-extrabold">Waiting for verification ({items.length})</h2>
      <p className="text-sm text-[#5d7776]">
        Check that the name and date of birth match the ID, and that the photo looks like a real person. ID proofs are
        deleted as soon as you verify.
      </p>

      {loading ? (
        <p className="py-6 text-center text-[#5d7776]">Loading...</p>
      ) : items.length === 0 ? (
        <p className="rounded-2xl border border-[#e5eceb] p-10 text-center text-[#5d7776]">No profiles waiting. All clear.</p>
      ) : (
        items.map(it => {
          const city = Array.isArray(it.cities) ? it.cities[0] : it.cities
          return (
            <article key={it.id} className="space-y-3 rounded-2xl border border-[#e5eceb] p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg font-bold">{it.full_name}</span>
                <span className="rounded-full bg-[#e3efee] px-3 py-1 text-xs font-bold text-[#0f5c5a]">
                  {it.gender === 'male' ? 'Groom' : 'Bride'}, {ageFromDob(it.dob)} yrs
                </span>
                {it.created_by === 'parent' && (
                  <span className="rounded-full bg-[#fff4d6] px-3 py-1 text-xs font-bold text-[#7a5600]">Created by parent</span>
                )}
                <span className="ml-auto text-sm text-[#5d7776]">DOB {it.dob}</span>
              </div>

              <p className="text-sm text-[#5d7776]">
                {[
                  MARITAL.find(m => m.id === it.marital_status)?.label,
                  it.height_cm ? cmToFt(it.height_cm) : null,
                  city?.name, it.maslak, it.sub_community,
                  it.education,
                  it.occupation, it.income_range,
                ].filter(Boolean).join(' · ')}
              </p>
              {it.about && <p className="whitespace-pre-wrap rounded-xl bg-[#f3f7f6] p-3 text-sm">{it.about}</p>}
              {it.family_details && <p className="whitespace-pre-wrap rounded-xl bg-[#f3f7f6] p-3 text-sm">{it.family_details}</p>}
              {it.partner_prefs && <p className="whitespace-pre-wrap rounded-xl bg-[#f3f7f6] p-3 text-sm">{it.partner_prefs}</p>}

              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-wider text-[#5d7776]">Photos</p>
                <div className="flex gap-2 overflow-x-auto">
                  {it.photos.map(u => (
                    <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="block h-32 w-28 shrink-0 overflow-hidden rounded-xl bg-[#f3f7f6]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={u} alt="" className="h-full w-full object-cover" />
                    </a>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-wider text-[#5d7776]">ID proof</p>
                {it.docs.length === 0 ? (
                  <p className="text-sm text-[#c0392b]">No ID proof uploaded.</p>
                ) : (
                  <ul className="space-y-1">
                    {it.docs.map(d => (
                      <li key={d.id} className="text-sm">
                        {d.url ? (
                          <a href={d.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#0f5c5a] underline">
                            Open {DOC_TYPES.find(t => t.id === d.doc_type)?.label ?? d.doc_type}
                          </a>
                        ) : 'Could not load the document'}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => reject(it)} className="rounded-full px-5 py-2 text-sm font-semibold text-[#c0392b] hover:bg-[#fdf3f2]">Send back</button>
                <button onClick={() => approve(it)} className="rounded-full bg-[#0f5c5a] px-6 py-2 text-sm font-bold text-white hover:bg-[#0b4846]">Verify</button>
              </div>
            </article>
          )
        })
      )}

      {toast && (
        <div role="status" className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#12302f] px-5 py-3 text-sm font-semibold text-white shadow-xl">
          {toast}
        </div>
      )}
    </>
  )
}
