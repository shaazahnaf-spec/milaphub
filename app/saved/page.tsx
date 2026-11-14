// FILE: app/saved/page.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type Author = { full_name: string | null; username: string | null }
type PostRef = { id: string; body: string | null; category: string; profiles: Author | Author[] | null }
type Row = { created_at: string; posts: PostRef | PostRef[] | null }

export default async function SavedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('saved_posts')
    .select('created_at, posts(id, body, category, profiles!author_id(full_name, username))')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const items = ((data ?? []) as unknown as Row[])
    .map(r => (Array.isArray(r.posts) ? r.posts[0] : r.posts))
    .filter((p): p is PostRef => !!p)

  return (
    <main className="mx-auto max-w-xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-[#12302f]">Saved posts</h1>
        <Link href="/home" className="rounded-full border border-[#dbe5e4] px-4 py-2 text-sm font-semibold text-[#12302f] hover:bg-[#f3f7f6]">
          Back to MilapHub
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-[#e5eceb] p-10 text-center text-[#5d7776]">
          Nothing saved yet. Use the three dots on any post and choose Save post.
        </p>
      ) : (
        items.map(p => {
          const a = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles
          const anon = p.category === 'confession'
          return (
            <Link key={p.id} href={`/post/${p.id}`}
              className="block rounded-2xl border border-[#e5eceb] bg-white p-4 shadow-sm transition hover:shadow-md">
              <p className="font-bold text-[#12302f]">{anon ? 'Anonymous' : a?.full_name ?? 'MilapHub user'}</p>
              <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-[15px] text-[#12302f]">{p.body}</p>
            </Link>
          )
        })
      )}
    </main>
  )
}
