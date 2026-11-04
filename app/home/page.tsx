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
    <div className="min-h-screen bg-[#F0F2F5] text-gray-800">
      {/* Facebook-style Top Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          
          {/* Left: Logo & Search */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-[#0D463B] text-white flex items-center justify-center font-black text-lg">
              M
            </div>
            <div className="hidden sm:flex items-center bg-gray-100 rounded-full px-3 py-1.5 w-60 border border-transparent focus-within:border-gray-300">
              <span className="text-gray-400 text-sm mr-2">🔍</span>
              <input 
                type="text" 
                placeholder="Search MilapHub" 
                className="bg-transparent text-sm outline-none w-full text-gray-700"
              />
            </div>
          </div>

          {/* Center: Icon Nav Tabs (Facebook Style) */}
          <div className="hidden md:flex items-center space-x-1 h-full">
            <button className="h-full px-8 flex items-center justify-center border-b-4 border-[#0D463B] text-[#0D463B] font-bold text-xl">
              🏠
            </button>
            <button className="h-full px-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-lg text-xl">
              📹
            </button>
            <button className="h-full px-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-lg text-xl">
              💍
            </button>
            <button className="h-full px-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-lg text-xl">
              🛍️
            </button>
            <button className="h-full px-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-lg text-xl">
              📄
            </button>
          </div>

          {/* Right: Action Icons & Profile */}
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-bold cursor-pointer hover:bg-gray-300">
              🔲
            </div>
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-bold cursor-pointer hover:bg-gray-300">
              💬
            </div>
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-bold cursor-pointer hover:bg-gray-300 relative">
              🔔
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold">3</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#0D463B] text-white flex items-center justify-center font-bold text-sm cursor-pointer ml-1">
              {profile?.full_name?.charAt(0) || 'U'}
            </div>
          </div>

        </div>
      </header>

      {/* Main 3-Column Layout */}
      <div className="max-w-7xl mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Sidebar */}
        <aside className="hidden lg:block lg:col-span-1 space-y-1">
          <div className="p-2.5 hover:bg-gray-200 rounded-xl cursor-pointer font-semibold text-sm text-gray-700 flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-emerald-100 text-[#0D463B] flex items-center justify-center font-bold text-sm">
              {profile?.full_name?.charAt(0) || 'U'}
            </div>
            <span className="truncate">{profile?.full_name}</span>
          </div>
          <div className="p-2.5 hover:bg-gray-200 rounded-xl cursor-pointer font-semibold text-sm text-gray-700 flex items-center space-x-3">
            <span className="text-xl">👥</span>
            <span>Friends</span>
          </div>
          <div className="p-2.5 hover:bg-gray-200 rounded-xl cursor-pointer font-semibold text-sm text-gray-700 flex items-center space-x-3">
            <span className="text-xl">📄</span>
            <span>Pages</span>
          </div>
          <div className="p-2.5 hover:bg-gray-200 rounded-xl cursor-pointer font-semibold text-sm text-gray-700 flex items-center space-x-3">
            <span className="text-xl">🫂</span>
            <span>Groups</span>
          </div>
          <div className="p-2.5 hover:bg-gray-200 rounded-xl cursor-pointer font-semibold text-sm text-gray-700 flex items-center space-x-3">
            <span className="text-xl">💍</span>
            <span>Matrimony</span>
          </div>
          <div className="p-2.5 hover:bg-gray-200 rounded-xl cursor-pointer font-semibold text-sm text-gray-700 flex items-center space-x-3">
            <span className="text-xl">💰</span>
            <span>Tips and Payouts</span>
          </div>
          <div className="p-2.5 hover:bg-gray-200 rounded-xl cursor-pointer font-semibold text-sm text-gray-700 flex items-center space-x-3">
            <span className="text-xl">⚙️</span>
            <span>Settings</span>
          </div>
          
          <div className="pt-4 border-t border-gray-300 mt-4">
            <button
              onClick={async () => {
                await supabase.auth.signOut()
                window.location.href = '/login'
              }}
              className="w-full text-center text-xs text-red-600 border border-red-200 py-2 rounded-lg hover:bg-red-50 font-semibold"
            >
              Sign Out
            </button>
          </div>
        </aside>

        {/* Center Feed Column */}
        <main className="lg:col-span-2 space-y-4">
          
          {/* Stories Row */}
          <div className="grid grid-cols-5 gap-2 bg-white p-3 rounded-2xl shadow-xs border border-gray-200">
            <div className="relative h-44 rounded-xl bg-gray-100 flex flex-col justify-end p-2 cursor-pointer hover:opacity-95 overflow-hidden border border-gray-200">
              <div className="absolute top-3 left-3 w-9 h-9 rounded-full bg-[#0D463B] text-white flex items-center justify-center font-bold text-sm border-2 border-white shadow-xs">
                +
              </div>
              <p className="text-xs font-bold text-gray-800 text-center">Create story</p>
            </div>
            {[
              { name: 'Farhana', bg: 'bg-emerald-800' },
              { name: 'Zaid', bg: 'bg-amber-700' },
              { name: 'Rubina', bg: 'bg-teal-700' },
              { name: 'Arif', bg: 'bg-blue-800' }
            ].map((story, idx) => (
              <div key={idx} className={`relative h-44 rounded-xl ${story.bg} flex flex-col justify-between p-2 cursor-pointer hover:opacity-95 text-white shadow-xs`}>
                <div className="w-8 h-8 rounded-full bg-white text-[#0D463B] font-bold text-xs flex items-center justify-center border-2 border-emerald-700">
                  {story.name.charAt(0)}
                </div>
                <p className="text-xs font-bold truncate">{story.name}</p>
              </div>
            ))}
          </div>

          {/* Post Composer Box */}
          <div className="bg-white p-4 rounded-2xl shadow-xs border border-gray-200 space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-[#0D463B] text-white flex items-center justify-center font-bold text-sm">
                {profile?.full_name?.charAt(0) || 'U'}
              </div>
              <form onSubmit={handleCreatePost} className="w-full flex items-center bg-gray-100 rounded-full px-4 py-2">
                <input
                  type="text"
                  placeholder={`What's on your mind, ${profile?.full_name?.split(' ')[0] || 'User'}?`}
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  className="bg-transparent text-sm outline-none w-full text-gray-700"
                />
                <button
                  type="submit"
                  disabled={posting || !newPostContent.trim()}
                  className="text-xs bg-[#0D463B] text-white px-3 py-1.5 rounded-full font-semibold hover:bg-[#09332b] transition disabled:opacity-50 ml-2"
                >
                  {posting ? '...' : 'Post'}
                </button>
              </form>
            </div>

            {/* Category Box / Filter Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs overflow-x-auto gap-2">
              <span className="text-gray-500 font-semibold">Categories:</span>
              {[
                { id: 'all', label: 'General' },
                { id: 'local_story', label: 'Local Stories' },
                { id: 'confession', label: 'Confessions' },
                { id: 'cooking', label: 'Cooking' },
                { id: 'campaign', label: 'Campaigns' }
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`px-3 py-1 rounded-full font-semibold whitespace-nowrap transition border ${
                    category === cat.id
                      ? 'bg-[#0D463B] text-white border-[#0D463B]'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Feed List */}
          <div className="space-y-4">
            {posts.length === 0 ? (
              <div className="bg-white border border-gray-200 p-8 rounded-2xl text-center text-gray-500 text-sm">
                No posts found in {profile?.cities?.name || 'this city'}. Be the first to share something!
              </div>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="bg-white border border-gray-200 p-4 rounded-2xl space-y-3 shadow-xs">
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
                    <button className="hover:text-[#0D463B] py-1 px-4 rounded-lg hover:bg-gray-100">👍 Like</button>
                    <button className="hover:text-[#0D463B] py-1 px-4 rounded-lg hover:bg-gray-100">💬 Comment</button>
                    <button className="text-amber-600 font-semibold hover:underline py-1 px-2">⚡ Send tip</button>
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
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
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
