// FILE: app/matrimony/profile/page.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { compressImage } from '@/lib/image'
import BazaarHeader from '@/components/BazaarHeader'
import {
  CREATED_BY, DOC_TYPES, EDUCATION, HEIGHTS, INCOME, MARITAL, MASLAKS, STATUS_INFO, SUB_COMMUNITIES,
  cmToFt, makeBlurThumb,
} from '@/lib/matrimony'

type City = { id: number; name: string; state: string }
type Pic = { key: string; path?: string; url: string; blob?: Blob; ext?: string }
type Doc = { id: string; doc_type: string; storage_path: string }
type Existing = {
  id: string; status: string; reject_reason: string | null; blur_thumb: string | null; photo_paths: string[]
}

const field = 'w-full rounded-xl border border-[#dbe5e4] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0f5c5a]'

export default function MatrimonyProfilePage() {
  const [supabase] = useState(() => createClient())
  const router = useRouter()
  const photoRef = useRef<HTMLInputElement>(null)
  const docRef = useRef<HTMLInputElement>(null)

  const [me, setMe] = useState<string | null>(null)
  const [cities, setCities] = useState<City[]>([])
  const [existing, setExisting] = useState<Existing | null>(null)
  const [loaded, setLoaded] = useState(false)

  const [createdBy, setCreatedBy] = useState('self')
  const [gender, setGender] = useState('')
  const [fullName, setFullName] = useState('')
  const [dob, setDob] = useState('')
  const [marital, setMarital] = useState('never_married')
  const [height, setHeight] = useState('')
  const [maslak, setMaslak] = useState('')
  const [sub, setSub] = useState('')
  const [active, setActive] = useState(true)
  const [education, setEducation] = useState('')
  const [occupation, setOccupation] = useState('')
  const [income, setIncome] = useState('')
  const [cityId, setCityId] = useState('')
  const [about, setAbout] = useState('')
  const [prefs, setPrefs] = useState('')
  const [family, setFamily] = useState('')
  const [consent, setConsent] = useState(false)
  const [pics, setPics] = useState<Pic[]>([])
  const [docs, setDocs] = useState<Doc[]>([])
  const [docType, setDocType] = useState('aadhaar')

  const [busy, setBusy] = useState(false)
  const [docBusy, setDocBusy] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  function notify(t: string) {
    setToast(t)
    setTimeout(() => setToast(''), 3500)
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      setMe(user.id)

      const { data: cs } = await supabase.from('cities').select('id, name, state').order('name')
      setCities((cs ?? []) as City[])

      const { data: prof } = await supabase.from('profiles').select('city_id').eq('id', user.id).maybeSingle()
      if (prof?.city_id) setCityId(String(prof.city_id))

      const { data: d } = await supabase.from('matrimony_documents').select('id, doc_type, storage_path').eq('user_id', user.id)
      setDocs((d ?? []) as Doc[])

      const { data: mp } = await supabase.from('matrimony_profiles').select('*').eq('user_id', user.id).maybeSingle()
      if (mp) {
        setExisting({
          id: mp.id, status: mp.status, reject_reason: mp.reject_reason,
          blur_thumb: mp.blur_thumb, photo_paths: (mp.photo_paths ?? []) as string[],
        })
        setCreatedBy(mp.created_by); setGender(mp.gender); setFullName(mp.full_name); setDob(mp.dob)
        setMarital(mp.marital_status); setHeight(mp.height_cm ? String(mp.height_cm) : '')
        setMaslak(mp.maslak ?? ''); setSub(mp.sub_community ?? ''); setActive(mp.is_active !== false)
        setEducation(mp.education ?? ''); setOccupation(mp.occupation ?? ''); setIncome(mp.income_range ?? '')
        if (mp.city_id) setCityId(String(mp.city_id))
        setAbout(mp.about ?? ''); setPrefs(mp.partner_prefs ?? ''); setFamily(mp.family_details ?? '')
        setConsent(!!mp.consent_at)
        const paths = (mp.photo_paths ?? []) as string[]
        if (paths.length) {
          const { data: signed } = await supabase.storage.from('matrimony-photos').createSignedUrls(paths, 3600)
          setPics(paths.map((p, i) => ({ key: p, path: p, url: signed?.[i]?.signedUrl ?? '' })))
        }
      }
      setLoaded(true)
    }
    init()
  }, [supabase, router])

  async function addPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    setError('')
    const room = 4 - pics.length
    if (files.length > room) setError('You can add up to 4 photos.')
    const added: Pic[] = []
    for (const f of files.slice(0, Math.max(0, room))) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) { setError('Use JPG, PNG or WEBP photos only.'); continue }
      if (f.size > 20 * 1024 * 1024) { setError('Each photo must be under 20 MB.'); continue }
      try {
        const { blob, ext } = await compressImage(f)
        added.push({ key: crypto.randomUUID(), url: URL.createObjectURL(blob), blob, ext })
      } catch {
        setError('Could not read one of the photos.')
      }
    }
    setPics(p => [...p, ...added])
  }

  function removePic(key: string) {
    setPics(p => p.filter(x => x.key !== key))
  }

  async function uploadDoc(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !me) return
    setError('')
    const isPdf = file.type === 'application/pdf'
    if (!isPdf && !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return setError('Upload a JPG, PNG or PDF file.')
    if (file.size > 20 * 1024 * 1024) return setError('The file is too large. Please use one under 20 MB.')
    setDocBusy(true)
    try {
      let body: Blob = file
      let ext = 'pdf'
      if (!isPdf) {
        const r = await compressImage(file, 2000, 0.85)
        body = r.blob; ext = r.ext
      }
      if (body.size > 5 * 1024 * 1024) { setDocBusy(false); return setError('The file must be under 5 MB.') }

      const old = docs.find(d => d.doc_type === docType)
      if (old) {
        await supabase.storage.from('matrimony-docs').remove([old.storage_path])
        await supabase.from('matrimony_documents').delete().eq('id', old.id)
      }
      const path = `${me}/${crypto.randomUUID()}.${ext}`
      const { error: upErr } = await supabase.storage.from('matrimony-docs').upload(path, body, { contentType: body.type })
      if (upErr) { setDocBusy(false); return setError(upErr.message) }
      const { data, error: insErr } = await supabase
        .from('matrimony_documents').insert({ user_id: me, doc_type: docType, storage_path: path })
        .select('id, doc_type, storage_path').single()
      if (insErr) {
        await supabase.storage.from('matrimony-docs').remove([path])
        setDocBusy(false)
        return setError(insErr.message)
      }
      setDocs(list => [...list.filter(d => d.doc_type !== docType), data as Doc])
      notify('ID proof uploaded. Only our verification team can see it.')
    } catch {
      setError('Could not upload that file.')
    }
    setDocBusy(false)
  }

  async function removeDoc(d: Doc) {
    await supabase.storage.from('matrimony-docs').remove([d.storage_path])
    const { error } = await supabase.from('matrimony_documents').delete().eq('id', d.id)
    if (error) return setError(error.message)
    setDocs(list => list.filter(x => x.id !== d.id))
  }

  async function save(submit: boolean) {
    if (!me) return
    setError('')
    if (fullName.trim().length < 2) return setError('Enter the full name of the person getting married.')
    if (!gender) return setError('Choose whether the profile is for a groom or a bride.')
    if (!dob) return setError('Enter the date of birth.')
    if (!cityId) return setError('Choose a city.')
    if (submit) {
      if (!consent) return setError('Please accept the consent to submit.')
      const missing = ([
        ['height', height], ['maslak', maslak], ['education', education], ['occupation', occupation.trim()],
        ['yearly income', income], ['about', about.trim()], ['family background', family.trim()],
        ['what you are looking for in a partner', prefs.trim()],
      ] as [string, string][]).find(([, v]) => !v)
      if (missing) return setError(`Please fill in: ${missing[0]}. All details are required to submit.`)
      if (pics.length === 0) return setError('Add at least one photo.')
      if (docs.length === 0) return setError('Upload an ID proof first.')
    }

    setBusy(true)
    const uploaded: string[] = []
    const finalPaths: string[] = []
    for (const p of pics) {
      if (p.path) { finalPaths.push(p.path); continue }
      const path = `${me}/${crypto.randomUUID()}.${p.ext}`
      const { error: upErr } = await supabase.storage.from('matrimony-photos').upload(path, p.blob as Blob, { contentType: (p.blob as Blob).type })
      if (upErr) {
        if (uploaded.length) await supabase.storage.from('matrimony-photos').remove(uploaded)
        setBusy(false)
        return setError(upErr.message)
      }
      uploaded.push(path); finalPaths.push(path)
    }

    let blur = existing?.blur_thumb ?? null
    const first = pics[0]
    if (first?.blob) {
      try { blur = await makeBlurThumb(first.blob) } catch { blur = null }
    } else if (!first) {
      blur = null
    }

    const payload = {
      created_by: createdBy, gender, full_name: fullName.trim(), dob, marital_status: marital,
      height_cm: height ? Number(height) : null,
      maslak: maslak || null, sub_community: sub || null,
      education: education || null, occupation: occupation.trim() || null, income_range: income || null,
      city_id: Number(cityId),
      about: about.trim() || null, partner_prefs: prefs.trim() || null, family_details: family.trim() || null,
      photo_paths: finalPaths, blur_thumb: blur,
      consent_at: consent ? new Date().toISOString() : null,
    }

    let err: string | null = null
    if (!existing) {
      const { data, error } = await supabase
        .from('matrimony_profiles').insert({ ...payload, user_id: me, status: 'draft' }).select('id').single()
      if (error) err = error.message
      else setExisting({ id: data.id as string, status: 'draft', reject_reason: null, blur_thumb: blur, photo_paths: finalPaths })
      if (!err && submit) {
        const { error: e2 } = await supabase.from('matrimony_profiles').update({ status: 'submitted' }).eq('user_id', me)
        if (e2) err = e2.message
      }
    } else {
      const status = submit ? 'submitted' : existing.status === 'rejected' ? 'draft' : existing.status
      const { error } = await supabase.from('matrimony_profiles').update({ ...payload, status }).eq('user_id', me)
      if (error) err = error.message
    }

    if (err) {
      if (uploaded.length) await supabase.storage.from('matrimony-photos').remove(uploaded)
      setBusy(false)
      return setError(err)
    }

    const removed = (existing?.photo_paths ?? []).filter(p => !finalPaths.includes(p))
    if (removed.length) await supabase.storage.from('matrimony-photos').remove(removed)
    setBusy(false)
    if (submit) { router.push('/matrimony'); return }
    setExisting(e => (e ? { ...e, blur_thumb: blur, photo_paths: finalPaths } : e))
    setPics(p => p.map((x, i) => ({ ...x, path: finalPaths[i] })))
    notify('Saved.')
  }

  async function togglePause() {
    if (!me) return
    const next = !active
    const { error } = await supabase.from('matrimony_profiles').update({ is_active: next }).eq('user_id', me)
    if (error) return setError(error.message)
    setActive(next)
    notify(next ? 'Your profile is visible again.' : 'Your profile is paused and hidden from search.')
  }

  if (!loaded) {
    return <div className="grid min-h-screen place-items-center font-semibold text-[#0f5c5a]">Loading...</div>
  }

  const st = existing ? STATUS_INFO[existing.status] : null
  const locked = existing?.status === 'suspended'

  return (
    <div className="min-h-screen bg-white text-[#12302f]">
      <BazaarHeader title="Matrimony profile">
        <Link href="/matrimony" className="rounded-full border border-[#dbe5e4] px-4 py-2 text-sm font-semibold hover:bg-[#f3f7f6]">Back</Link>
      </BazaarHeader>

      <main className="mx-auto max-w-2xl px-4 py-6">
        {st && existing && (
          <div className="mb-5 rounded-2xl border border-[#e5eceb] p-4">
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${st.cls}`}>{st.label}</span>
            <p className="mt-2 text-sm">{st.text}</p>
            {existing.status === 'rejected' && existing.reject_reason && (
              <p className="mt-2 rounded-xl bg-[#fdecea] p-3 text-sm text-[#c0392b]">{existing.reject_reason}</p>
            )}
            {existing.status === 'verified' && (
              <>
                <p className="mt-2 text-xs text-[#5d7776]">If you change the name, date of birth or gender, the profile will go for verification again.</p>
                <button type="button" onClick={togglePause}
                  className="mt-3 rounded-full border border-[#dbe5e4] px-5 py-2 text-sm font-bold hover:bg-[#f3f7f6]">
                  {active ? 'Pause my profile (rishta fixed)' : 'Make my profile visible again'}
                </button>
              </>
            )}
          </div>
        )}

        <form noValidate onSubmit={e => { e.preventDefault(); save(false) }} className="space-y-6">
          <section className="space-y-3">
            <h2 className="text-lg font-extrabold">Who is creating this profile?</h2>
            {CREATED_BY.map(c => (
              <label key={c.id} className="flex cursor-pointer items-center gap-3 text-sm">
                <input type="radio" name="by" checked={createdBy === c.id} onChange={() => setCreatedBy(c.id)} className="h-4 w-4 accent-[#0f5c5a]" />
                {c.label}
              </label>
            ))}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-extrabold">About the person getting married</h2>
            <p className="text-sm text-[#5d7776]">Every detail below, except community, is required to submit. You can save a draft and come back later.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold">This profile is for a
                <select value={gender} onChange={e => setGender(e.target.value)} className={field + ' mt-1'} required>
                  <option value="">Choose</option>
                  <option value="male">Groom (male)</option>
                  <option value="female">Bride (female)</option>
                </select>
              </label>
              <label className="block text-sm font-semibold">Full name
                <input required maxLength={80} value={fullName} onChange={e => setFullName(e.target.value)} className={field + ' mt-1'} />
              </label>
              <label className="block text-sm font-semibold">Date of birth
                <input required type="date" value={dob} onChange={e => setDob(e.target.value)} className={field + ' mt-1'} />
              </label>
              <label className="block text-sm font-semibold">Marital status
                <select value={marital} onChange={e => setMarital(e.target.value)} className={field + ' mt-1'}>
                  {MARITAL.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold">Height
                <select value={height} onChange={e => setHeight(e.target.value)} className={field + ' mt-1'}>
                  <option value="">Not shared</option>
                  {HEIGHTS.map(h => <option key={h} value={h}>{h} cm ({cmToFt(h)})</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold">City
                <select required value={cityId} onChange={e => setCityId(e.target.value)} className={field + ' mt-1'}>
                  <option value="">Choose</option>
                  {cities.map(c => <option key={c.id} value={c.id}>{c.name}, {c.state}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold">Maslak (sect)
                <select value={maslak} onChange={e => setMaslak(e.target.value)} className={field + ' mt-1'}>
                  <option value="">Choose</option>
                  {MASLAKS.map(r => <option key={r}>{r}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold">Community (optional)
                <select value={sub} onChange={e => setSub(e.target.value)} className={field + ' mt-1'}>
                  <option value="">Not shared</option>
                  {SUB_COMMUNITIES.map(r => <option key={r}>{r}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold">Education
                <select value={education} onChange={e => setEducation(e.target.value)} className={field + ' mt-1'}>
                  <option value="">Choose</option>
                  {EDUCATION.map(r => <option key={r}>{r}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold">Occupation
                <input maxLength={80} value={occupation} onChange={e => setOccupation(e.target.value)} placeholder="For example Software engineer" className={field + ' mt-1'} />
              </label>
              <label className="block text-sm font-semibold">Yearly income
                <select value={income} onChange={e => setIncome(e.target.value)} className={field + ' mt-1'}>
                  <option value="">Not shared</option>
                  {INCOME.map(r => <option key={r}>{r}</option>)}
                </select>
              </label>
            </div>
            <label className="block text-sm font-semibold">About (visible after unlock)
              <textarea maxLength={1000} rows={4} value={about} onChange={e => setAbout(e.target.value)} className={field + ' mt-1 resize-y'} />
            </label>
            <label className="block text-sm font-semibold">What are you looking for in a partner
              <textarea maxLength={1000} rows={3} value={prefs} onChange={e => setPrefs(e.target.value)} className={field + ' mt-1 resize-y'} />
            </label>
            <label className="block text-sm font-semibold">Family details (optional)
              <textarea maxLength={600} rows={3} value={family} onChange={e => setFamily(e.target.value)} className={field + ' mt-1 resize-y'} />
            </label>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-extrabold">Photos (1 to 4)</h2>
            <p className="text-sm text-[#5d7776]">Others see a blurred photo. The clear photos open only after you accept their interest.</p>
            <div className="flex flex-wrap gap-3">
              {pics.map((p, i) => (
                <div key={p.key} className="relative h-28 w-24 overflow-hidden rounded-xl bg-[#f3f7f6]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                  <button type="button" onClick={() => removePic(p.key)} aria-label={`Remove photo ${i + 1}`}
                    className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-sm leading-none text-white">×</button>
                </div>
              ))}
              {pics.length < 4 && (
                <button type="button" onClick={() => photoRef.current?.click()}
                  className="grid h-28 w-24 place-items-center rounded-xl border border-dashed border-[#c9d9d7] text-center text-xs font-semibold text-[#0f5c5a] hover:bg-[#f3f7f6]">
                  + Add photo
                </button>
              )}
            </div>
            <input ref={photoRef} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addPhotos}
              className="sr-only" tabIndex={-1} aria-hidden="true" />
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-extrabold">ID proof for verification</h2>
            <p className="text-sm text-[#5d7776]">
              Only our verification team can see this. We delete it once your profile is verified. Please do not share
              it anywhere else. Upload the ID of the person getting married.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <select value={docType} onChange={e => setDocType(e.target.value)} aria-label="ID type" className={field + ' w-auto'}>
                {DOC_TYPES.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
              </select>
              <button type="button" disabled={docBusy} onClick={() => docRef.current?.click()}
                className="rounded-full border border-[#dbe5e4] px-5 py-2.5 text-sm font-bold hover:bg-[#f3f7f6] disabled:opacity-60">
                {docBusy ? 'Uploading...' : 'Upload ID proof'}
              </button>
              <input ref={docRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={uploadDoc}
                className="sr-only" tabIndex={-1} aria-hidden="true" />
            </div>
            {docs.length > 0 && (
              <ul className="space-y-1">
                {docs.map(d => (
                  <li key={d.id} className="flex items-center gap-3 rounded-xl bg-[#f3f7f6] px-3 py-2 text-sm">
                    <span className="font-semibold">{DOC_TYPES.find(t => t.id === d.doc_type)?.label ?? d.doc_type}</span>
                    <span className="text-[#5d7776]">uploaded</span>
                    <button type="button" onClick={() => removeDoc(d)} className="ml-auto text-xs font-semibold text-[#c0392b] underline">Remove</button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#0f5c5a]" />
              <span>
                I confirm that the details are true and that I am allowed to create this profile. I agree that MilapHub
                keeps my ID proof only for verification, and that my profile details are shown to verified members of the
                opposite gender as described in the{' '}
                <a href="/privacy" className="font-semibold text-[#0f5c5a] underline">Privacy Policy</a>.
              </span>
            </label>
          </section>

          {error && <p role="alert" className="text-sm font-medium text-[#c0392b]">{error}</p>}

          <div className="flex flex-wrap gap-3">
            <button disabled={busy || locked} className="rounded-full border border-[#dbe5e4] px-6 py-3 text-sm font-bold hover:bg-[#f3f7f6] disabled:opacity-50">
              {busy ? 'Saving...' : 'Save'}
            </button>
            {existing?.status !== 'verified' && existing?.status !== 'submitted' && (
              <button type="button" disabled={busy || locked} onClick={() => save(true)}
                className="rounded-full bg-[#0f5c5a] px-7 py-3 text-sm font-bold text-white hover:bg-[#0b4846] disabled:opacity-50">
                Save and submit for verification
              </button>
            )}
          </div>
        </form>
      </main>

      {toast && (
        <div role="status" className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#12302f] px-5 py-3 text-sm font-semibold text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  )
}
