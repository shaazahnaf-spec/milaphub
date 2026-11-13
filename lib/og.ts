// FILE: lib/og.ts  (helpers for link-preview cards: WhatsApp, Facebook, X, Telegram...)

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://milaphub.vercel.app').replace(/\/$/, '')

// A resized copy (1200px wide) of a Supabase photo. WhatsApp often skips big preview images.
export function previewImage(src: string | null | undefined): string | null {
  if (!src) return null
  return `${SITE_URL}/_next/image?url=${encodeURIComponent(src)}&w=1200&q=75`
}

// A generated MilapHub card (see app/og/route.tsx) for items that have no photo.
export function textCard(opts: { kind: string; text?: string | null; by?: string | null }): string {
  const p = new URLSearchParams({ k: opts.kind })
  if (opts.text) p.set('t', opts.text.replace(/\s+/g, ' ').trim().slice(0, 140))
  if (opts.by) p.set('by', opts.by.slice(0, 40))
  return `${SITE_URL}/og?${p.toString()}`
}
