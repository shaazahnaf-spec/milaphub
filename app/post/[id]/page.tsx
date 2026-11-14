// FILE: app/post/[id]/page.tsx
// Public post page + WhatsApp / social preview card.
// With a photo: the card shows the photo. Without: a generated MilapHub card with the text.

import { cache } from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PublicShell from '@/components/public/PublicShell'
import { SITE_URL, previewImage, textCard } from '@/lib/og'

export const dynamic = 'force-dynamic'

type Author = { full_name: string | null; username: string | null }
type Row = {
  id: string
  author_id: string
  body: string | null
  category: string
  media_url: string | null
  profiles: Author | Author[] | null
}

const LABEL: Record<string, string> = {
  news: 'Local story', confession: 'Confession', cooking: 'Cooking', campaign: 'Campaign',
}

const getPost = cache(async (id: string) => {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  const { data } = await supabase
    .from('posts')
    .select('id, author_id, body, category, media_url, profiles!author_id(full_name, username)')
    .eq('id', id)
    .maybeSingle()
  if (!data) return null

  const post = data as unknown as Row
  let a: Author | null = Array.isArray(post.profiles) ? (post.profiles[0] ?? null) : post.profiles
  if (!a && post.category !== 'confession') {
    // Optional: the public_authors view (see supabase/public_share.sql). Ignored if it does not exist.
    const { data: pa } = await supabase.from('public_authors').select('full_name, username').eq('id', post.author_id).maybeSingle()
    a = (pa as Author | null) ?? null
  }
  return { post, a, loggedIn: !!auth.user }
})

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const found = await getPost(id)
  if (!found) return { title: 'Post not found | MilapHub', robots: { index: false } }

  const { post, a } = found
  const name = post.category === 'confession' ? null : a?.full_name ?? null
  const title = name ? `${name} on MilapHub` : 'A post on MilapHub'
  const body = (post.body ?? '').replace(/\s+/g, ' ').trim()
  const description = (body || 'Open this post on MilapHub.').slice(0, 200)
  const image = previewImage(post.media_url) ?? textCard({ kind: 'Post', text: body, by: name })
  const url = `${SITE_URL}/post/${post.id}`

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: 'article', siteName: 'MilapHub', url, title, description, images: [{ url: image, alt: title }] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  }
}

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const found = await getPost(id)
  if (!found) notFound()

  const { post, a, loggedIn } = found
  const anon = post.category === 'confession'
  const author = anon ? 'Anonymous' : a?.full_name ?? 'MilapHub user'

  const article = (
    <article className="rounded-2xl border border-[#e5eceb] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-[#f0a500] font-bold text-[#3a2900]">
          {author.charAt(0).toUpperCase()}
        </span>
        <div>
          <p className="font-bold leading-tight text-[#12302f]">{author}</p>
          {!anon && a?.username && <p className="text-xs text-[#5d7776]">@{a.username}</p>}
        </div>
        {post.category !== 'general' && (
          <span className="ml-auto rounded-full bg-[#e3efee] px-3 py-1 text-xs font-bold text-[#0f5c5a]">
            {LABEL[post.category] ?? post.category}
          </span>
        )}
      </div>
      {post.body && (
        <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-[#12302f]">{post.body}</p>
      )}
      {post.media_url && (
        <div className="mt-4 overflow-hidden rounded-xl bg-[#f3f7f6]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.media_url} alt="Photo shared in this post" className="max-h-[640px] w-full object-contain" />
        </div>
      )}
    </article>
  )

  if (!loggedIn) {
    return (
      <PublicShell>
        <div className="mx-auto max-w-xl">
          {article}
          <p className="mt-4 rounded-2xl bg-white p-4 text-center text-sm text-[#5d7776]">
            <Link href="/login" className="font-bold text-[#0f5c5a] underline">Log in</Link> to like, comment and share your own stories.
          </p>
        </div>
      </PublicShell>
    )
  }

  return (
    <main className="mx-auto max-w-xl p-4">
      <Link href="/home" className="mb-4 inline-block rounded-full border border-[#dbe5e4] px-4 py-2 text-sm font-semibold text-[#12302f] hover:bg-[#f3f7f6]">
        Back to MilapHub
      </Link>
      {article}
    </main>
  )
}
