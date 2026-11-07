// FILE: app/bazaar/new/page.tsx  (GitHub mein is path par paste karo)
'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { compressImage } from '@/lib/image'
import BazaarHeader from '@/components/BazaarHeader'
import { CATEGORIES } from '@/lib/bazaar'

type Photo = { blob: Blob; ext: string; preview: string }

const field = 'w-full rounded-xl border border-[#dbe5e4] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0f5c5a]'

export default function NewListing() {
  const [supabase] = useState(() => createClient())
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [me, setMe] = useState<string | null>(null)
  const [cityId, setCityId] = useState<number | null>(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('mobiles')
  const [condition, setCondition] = useState('used')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [locality, setLocality] = useState('')
  const [photos, setPhotos] = useState<Photo[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      const { data } = await supabase.from('profiles').select('city_id, area').eq('id', user.id).maybeSingle()
      if (!data?.city_id) { router.replace('/onboarding'); return }
      setMe(user.id)
      setCityId(data.city_id as number)
      setLocality((data.area as string | null) ?? '')
    }
    init()
  }, [supabase, router])

  async function addPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    setError('')
    const room = 4 - photos.length
    if (files.length > room) setError('You can add up to 4 photos.')
    const added: Photo[] = []
    for (const f of files.slice(0, Math.max(0, room))) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) { setError('Use JPG, PNG or WEBP photos only.'); continue }
      if (f.size > 20 * 1024 * 1024) { setError('Each photo must be under 20 MB.'); continue }
      try {
        const { blob, ext } = await compressImage(f)
        added.push({ blob, ext, preview: URL.createObjectURL(blob) })
      } catch {
        setError('Could not read one of the photos.')
      }
    }
    setPhotos(p => [...p, ...added])
  }

  function removePhoto(i: number) {
    setPhotos(p => {
      URL.revokeObjectURL(p[i].preview)
      return p.filter((_, idx) => idx !== i)
    })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!me || !cityId) return
    const priceNum = Math.round(Number(price))
    if (title.trim().length < 3) return setError('Please write a longer title.')
    if (price === '' || !Number.isFinite(priceNum) || priceNum < 0) return setError('Enter a valid price. Use 0 for free.')
    if (photos.length === 0) return setError('Add at least one photo.')

    setBusy(true); setError('')
    const urls: string[] = []
    const paths: string[] = []
    for (const ph of photos) {
      const path = `${me}/${crypto.randomUUID()}.${ph.ext}`
      const { error: upErr } = await supabase.storage
        .from('bazaar')
        .upload(path, ph.blob, { contentType: ph.blob.type, cacheControl: '31536000' })
      if (upErr) {
        if (paths.length) await supabase.storage.from('bazaar').remove(paths)
        setBusy(false)
        return setError(upErr.message)
      }
      paths.push(path)
      urls.push(supabase.storage.from('bazaar').getPublicUrl(path).data.publicUrl)
    }

    const { error } = await supabase.from('listings').insert({
      seller_id: me,
      city_id: cityId,
      title: title.trim(),
      description: description.trim() || null,
      price: priceNum,
      category,
      condition,
      locality: locality.trim() || null,
      image_urls: urls,
    })
    if (error) {
      await supabase.storage.from('bazaar').remove(paths)
      setBusy(false)
      return setError(error.message)
    }
    setBusy(false)
    setDone(true)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-white text-[#12302f]">
        <BazaarHeader title="Sell something" />
        <main className="mx-auto max-w-md px-4 py-12 text-center">
          <h2 className="text-2xl font-extrabold">Listing sent for approval</h2>
          <p className="mt-2 text-[#5d7776]">
            Our team checks every listing before it goes live. You can see its status under My listings.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/bazaar" className="rounded-full bg-[#0f5c5a] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#0b4846]">Go to Bazaar</Link>
            <button
              onClick={() => {
                setDone(false); setTitle(''); setPrice(''); setDescription('')
                photos.forEach(p => URL.revokeObjectURL(p.preview)); setPhotos([])
              }}
              className="rounded-full border border-[#dbe5e4] px-6 py-2.5 text-sm font-semibold hover:bg-[#f3f7f6]"
            >
              List another
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-[#12302f]">
      <BazaarHeader title="Sell something">
        <Link href="/bazaar" className="rounded-full border border-[#dbe5e4] px-4 py-2 text-sm font-semibold hover:bg-[#f3f7f6]">Cancel</Link>
      </BazaarHeader>

      <main className="mx-auto max-w-2xl px-4 py-6">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-semibold">Photos (1 to 4)</p>
            <div className="flex flex-wrap gap-3">
              {photos.map((p, i) => (
                <div key={p.preview} className="relative h-24 w-24 overflow-hidden rounded-xl bg-[#f3f7f6]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.preview} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                  <button type="button" onClick={() => removePhoto(i)} aria-label={`Remove photo ${i + 1}`}
                    className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-sm leading-none text-white">
                    ×
                  </button>
                </div>
              ))}
              {photos.length < 4 && (
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="grid h-24 w-24 place-items-center rounded-xl border border-dashed border-[#c9d9d7] text-center text-xs font-semibold text-[#0f5c5a] hover:bg-[#f3f7f6]">
                  + Add photo
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addPhotos}
              className="sr-only" tabIndex={-1} aria-hidden="true" />
          </div>

          <label className="block text-sm font-semibold">Title
            <input required maxLength={100} value={title} onChange={e => setTitle(e.target.value)}
              placeholder="What are you selling?" className={field + ' mt-1'} />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold">Category
              <select value={category} onChange={e => setCategory(e.target.value)} className={field + ' mt-1'}>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold">Condition
              <select value={condition} onChange={e => setCondition(e.target.value)} className={field + ' mt-1'}>
                <option value="used">Used</option>
                <option value="new">New</option>
              </select>
            </label>
            <label className="block text-sm font-semibold">Price in ₹ (0 for free)
              <input required type="number" min={0} max={100000000} inputMode="numeric" value={price}
                onChange={e => setPrice(e.target.value)} className={field + ' mt-1'} />
            </label>
            <label className="block text-sm font-semibold">Locality (optional)
              <input maxLength={80} value={locality} onChange={e => setLocality(e.target.value)}
                placeholder="For example Madhapur" className={field + ' mt-1'} />
            </label>
          </div>

          <label className="block text-sm font-semibold">Description (optional)
            <textarea maxLength={2000} rows={5} value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Condition, age, reason for selling, anything buyers should know"
              className={field + ' mt-1 resize-y'} />
          </label>

          {error && <p role="alert" className="text-sm font-medium text-[#c0392b]">{error}</p>}

          <button disabled={busy}
            className="w-full rounded-full bg-[#0f5c5a] py-3 text-sm font-bold text-white hover:bg-[#0b4846] disabled:opacity-50">
            {busy ? 'Uploading...' : 'Send for approval'}
          </button>
          <p className="text-center text-xs text-[#5d7776]">
            Listing is free. Every listing is checked by our team before it goes live.
          </p>
        </form>
      </main>
    </div>
  )
}
