import { createClient } from '@/lib/supabase/server'

type Author = { full_name: string | null; username: string | null }
type Row = {
  id: string
  body: string | null
  category: string
  allow_tips: boolean
  created_at: string
  profiles: Author | Author[] | null
}

const LABEL: Record<string, string> = {
  news: 'Local story', confession: 'Confession', cooking: 'Cooking', campaign: 'Campaign',
}

export default async function Feed({ cityId }: { cityId: number }) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('posts')
    .select('id, body, category, allow_tips, created_at, profiles(full_name, username)')
    .eq('city_id', cityId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return <p role="alert" className="text-[#c0392b]">Feed load nahi hua: {error.message}</p>

  const posts = (data ?? []) as unknown as Row[]
  if (posts.length === 0)
    return <p className="rounded-2xl border border-[#dbe5e4] bg-white p-8 text-center text-[#5d7776]">
      Abhi koi approved post nahi hai. Pehli post tum karo!
    </p>

  return (
    <div className="space-y-4">
      {posts.map(p => {
        const a = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles
        const anon = p.category === 'confession'
        const name = anon ? 'Anonymous' : a?.full_name ?? 'MilapHub user'
        return (
          <article key={p.id} className="rounded-2xl border border-[#dbe5e4] bg-white p-4">
            <div className="mb-2 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-[#f0a500] font-bold text-[#3a2900]">
                {name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-bold leading-tight">{name}</p>
                <p className="text-xs text-[#5d7776]">{new Date(p.created_at).toLocaleDateString('en-IN')}</p>
              </div>
              <span className="ml-auto rounded-full bg-[#e3efee] px-3 py-1 text-xs font-bold text-[#0f5c5a]">
                {LABEL[p.category] ?? p.category}
              </span>
            </div>
            <p className="whitespace-pre-wrap">{p.body}</p>
            {p.allow_tips && (
              <div className="mt-3 border-t border-[#dbe5e4] pt-3">
                <button className="rounded-lg bg-[#f0a500] px-4 py-2 font-bold text-[#3a2900]">
                  {p.category === 'campaign' ? 'Donate' : 'Send tip'}
                </button>
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}
