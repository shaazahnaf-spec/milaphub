'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function HomePage() {
  const [profile, setProfile] = useState<any>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [newPostContent, setNewPostContent] = useState('')
  const [category, setCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login'
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*, cities(id, name, state)')
        .eq('id', user.id)
        .single()

      setProfile(profileData)

      if (profileData?.city_id) {
        let query = supabase
          .from('posts')
          .select('*, profiles(full_name, username)')
          .eq('city_id', profileData.city_id)
          .order('created_at', { ascending: false })

        if (category !== 'all') {
          query = query.eq('category', category)
        }

        const { data: postsData } = await query
        setPosts(postsData || [])
      }

      setLoading(false)
    }

    loadData()
  }, [category])

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPostContent.trim() || !profile) return

    setPosting(true)
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('posts').insert({
      author_id: user?.id,
      city_id: profile.city_id,
      content: newPostContent,
      status: 'approved',
      category: category === 'all' ? 'general' : category
    })

    if (!error) {
      setNewPostContent('')
      const { data: postsData } = await supabase
        .from('posts')
        .select('*, profiles(full_name, username)')
        .eq('city_id', profile.city_id)
        .order('created_at', { ascending: false })

      setPosts(postsData || [])
    }
    setPosting(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-[#0D463B] font-medium">
        Loading MilapHub...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-gray-800">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-8">
            {/* Clean MilapHub Logo without location subtitle */}
            <h1 className="text-2xl font-black text-[#0D463B] tracking-tight cursor-pointer">
              MilapHub
            </h1>
            <nav className="hidden md:flex space-x-6 text-sm font-semibold text-gray-600">
              <span className="text-[#0D463B] border-b-2 border-[#0D463B] pb-5 cursor-pointer">Home</span>
              <span className="hover:text-[#0D463B] cursor-pointer">Reels</span>
              <span className="hover:text-[#0D463B] cursor-pointer">Matrimony</span>
              <span className="hover:text-[#0D463B] cursor-pointer">Bazaar</span>
              <span className="hover:text-[#0D463B] cursor-pointer">Pages</span>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-gray-800">{profile?.full_name}</p>
              <p className="text-xs text-gray-400">@{profile?.username}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-[#0D463B] text-white flex items-center justify-center font-bold text-sm">
              {profile?.full_name?.charAt(0) || 'U'}
            </div>
            <button
              onClick={async () => {
                await supabase.auth.signOut()
                window.location.href = '/login'
              }}
              className="text-xs text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* 3-Column Layout */}
      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Sidebar */}
        <aside className="hidden lg:block lg:col-span-1 space-y-2">
          <div className="p-3 hover:bg-gray-50 rounded-xl cursor-pointer font-medium text-sm text-gray-700 flex items-center space-x-3">
            <span className="w-7 h-7 rounded-full bg-emerald-100 text-[#0D463B] flex items-center justify-center font-bold text-xs">👤</span>
            <span>Your profile</span>
          </div>
          <div className="p-3 hover:bg-gray-50 rounded-xl cursor-pointer font-medium text-sm text-gray-700 flex items-center space-x-3">
            <span className="w-7 h-7 rounded-full bg-emerald-100 text-[#0D463B] flex items-center justify-center font-bold text-xs">📄</span>
            <span>Pages</span>
          </div>
          <div className="p-3 hover:bg-gray-50 rounded-xl cursor-pointer font-medium text-sm text-gray-700 flex items-center space-x-3">
            <span className="w-7 h-7 rounded-full bg-emerald-100 text-[#0D463B] flex items-center justify-center font-bold text-xs">👥</span>
            <span>Groups</span>
          </div>
          <div className="p-3 hover:bg-gray-50 rounded-xl cursor-pointer font-medium text-sm text-gray-700 flex items-center space-x-3">
            <span className="w-7 h-7 rounded-full bg-emerald-100 text-[#0D463B] flex items-center justify-center font-bold text-xs">🔖</span>
            <span>Saved posts</span>
          </div>
          <div className="p-3 hover:bg-gray-50 rounded-xl cursor-pointer font-medium text-sm text-gray-700 flex items-center space-x-3">
            <span className="w-7 h-7 rounded-full bg-emerald-100 text-[#0D463B] flex items-center justify-center font-bold text-xs">💍</span>
            <span>Matrimony dashboard</span>
          </div>
          <div className="p-3 hover:bg-gray-50 rounded-xl cursor-pointer font-medium text-sm text-gray-700 flex items-center space-x-3">
            <span className="w-7 h-7 rounded-full bg-emerald-100 text-[#0D463B] flex items-center justify-center font-bold text-xs">💰</span>
            <span>Tips and payouts</span>
          </div>
          <div className="p-3 hover:bg-gray-50 rounded-xl cursor-pointer font-medium text-sm text-gray-700 flex items-center space-x-3">
            <span className="w-7 h-7 rounded-full bg-emerald-100 text-[#0D463B] flex items-center justify-center font-bold text-xs">⚙️</span>
            <span>Settings</span>
          </div>
        </aside>

        {/* Center Main Feed */}
        <main className="lg:col-span-2 space-y-4">
          
          {/* Post Box */}
          <div className="bg-white border border-gray-200 p-4 rounded-2xl shadow-xs">
            <form onSubmit={handleCreatePost}>
              <textarea
                rows={2}
                placeholder="Share a story, recipe or confession..."
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm text-gray-800 resize-none focus:bg-white focus:border-[#0D463B]"
              />
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                <div className="flex gap-2">
                  <select 
                    value={category} 
                    onChange={(e) => setCategory(e.target.value)}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-600 outline-none"
                  >
                    <option value="all">General Feed</option>
                    <option value="local_story">Local Stories</option>
                    <option value="confession">Confessions</option>
                    <option value="cooking">Cooking</option>
                    <option value="campaign">Verified Campaign</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={posting || !newPostContent.trim()}
                  className="bg-[#0D463B] text-white px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-[#09332b] transition disabled:opacity-50"
                >
                  {posting ? 'Posting...' : 'Post'}
                </button>
              </div>
            </form>
          </div>

          {/* Category Filter Pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
            {['all', 'local_story', 'confession', 'cooking', 'campaign'].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap border ${
                  category === cat 
                    ? 'bg-[#0D463B] text-white border-[#0D463B]' 
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {cat === 'all' ? 'All' : cat.replace('_', ' ').toUpperCase()}
              </button>
            ))}
          </div>

          {/* Feed List */}
          <div className="space-y-4">
            {posts.length === 0 ? (
              <div className="bg-white border border-gray-200 p-8 rounded-2xl text-center text-gray-500 text-sm">
                No posts found in {profile?.cities?.name || 'this city'}. Be the first to share something!
              </div>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="bg-white border border-gray-200 p-5 rounded-2xl space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-sm">
                        {post.profiles?.full_name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800">{post.profiles?.full_name}</p>
                        <p className="text-xs text-gray-400">@{post.profiles?.username} • {new Date(post.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    {post.category && post.category !== 'general' && (
                      <span className="text-[10px] bg-emerald-50 text-[#0D463B] px-2.5 py-1 rounded-full font-semibold border border-emerald-100 uppercase">
                        {post.category.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{post.content}</p>
                  
                  <div className="flex justify-between items-center pt-3 border-t border-gray-100 text-xs text-gray-500 font-medium">
                    <button className="hover:text-[#0D463B]">Like</button>
                    <button className="hover:text-[#0D463B]">Comment</button>
                    <button className="text-amber-600 font-semibold hover:underline">Send tip</button>
                  </div>
                </div>
              ))
            )}
          </div>

        </main>

        {/* Right Sidebar */}
        <aside className="hidden lg:block lg:col-span-1 space-y-4">
          <div className="bg-white border border-gray-200 p-4 rounded-2xl shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Friend requests</h3>
            <div className="text-xs text-gray-500 italic">No pending requests</div>
          </div>

          <div className="bg-white border border-gray-200 p-4 rounded-2xl shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Emergency alerts</h3>
            <div className="space-y-2">
              <div className="p-2.5 bg-red-50 border border-red-100 rounded-xl">
                <p className="text-xs font-bold text-red-700">O-negative blood chahiye</p>
                <p className="text-[10px] text-gray-500">Gandhi Hospital • Verified</p>
              </div>
            </div>
          </div>
        </aside>

      </div>
    </div>
  )
}
