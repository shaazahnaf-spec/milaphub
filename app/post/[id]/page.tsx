// FILE: app/post/[id]/page.tsx  (GitHub mein is path par paste karo)
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type Author = { full_name: string | null; username: string | null }
type Row = {
  id: string
  body: string | null
  category: string
  profiles: Author | Author[] | null
}

const LABEL: Record<string, string> = {
  news: 'Local story', confession: 'Confession', cooking: 'Cooking', campaign: 'Campaign',
}

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('posts')
    .select('id, body, category, profiles(full_name, username)')
    .eq('id', id)
    .maybeSingle()
  if (!data) notFound()

  const post = data as unknown as Row
  const a = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles
  const anon = post.category === 'confession'
  const author = anon ? 'Anonymous' : a?.full_name ?? 'MilapHub user'

  return (
    <main className="mx-auto max-w-xl p-4">
      <Link href="/home" className="mb-4 inline-block rounded-full border border-[#dbe5e4] px-4 py-2 text-sm font-semibold text-[#12302f] hover:bg-[#f3f7f6]">
        Back to MilapHub
      </Link>
      <article className="rounded-2xl border border-[#e5eceb] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[#f0a500] font-bold text-[#3a2900]">
            {author.charAt(0).toUpperCase()}
          </span>
          <div>
            <p className="font-bold leading-tight text-[#12302f]">{author}</p>
            {!anon && <p className="text-xs text-[#5d7776]">@{a?.username ?? 'user'}</p>}
          </div>
          {post.category !== 'general' && (
            <span className="ml-auto rounded-full bg-[#e3efee] px-3 py-1 text-xs font-bold text-[#0f5c5a]">
              {LABEL[post.category] ?? post.category}
            </span>
          )}
        </div>
        <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-[#12302f]">{post.body}</p>
      </article>
    </main>
  )
}
