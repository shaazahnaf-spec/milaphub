'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function HomePage() {
  const [profile, setProfile] = useState<any>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [newPostContent, setNewPostContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function loadDashboardData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login'
        return
      }

      // Fetch user profile with city details
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*, cities(id, name, state)')
        .eq('id', user.id)
        .single()

      setProfile(profileData)

      if (profileData?.city_id) {
        // Fetch posts for this city
        const { data: postsData } = await supabase
          .from('posts')
          .select('*, profiles(full_name, username)')
          .eq('city_id', profileData.city_id)
          .order('created_at', { ascending: false })

        setPosts(postsData || [])
      }

      setLoading(false)
    }

    loadDashboardData()
  }, [])

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPostContent.trim() || !profile) return

    setPosting(true)
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('posts').insert({
      author_id: user?.id,
      city_id: profile.city_id,
      content: newPostContent,
      status: 'approved', // Direct approval for now
      category: 'general'
    })

    if (!error) {
      setNewPostContent('')
      // Refresh posts
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
      <div className="min-h-screen bg-[#F4F9F6] flex items-center justify-center text-[#0D463B] font-medium text-lg">
        Loading your city hub...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F4F9F6] pb-12">
      {/* Top Navbar */}
      <header className="bg-white border-b border-emerald-100 sticky top-0 z-10 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-[#0D463B] tracking-tight">MilapHub</h1>
            <p className="text-xs text-gray-500 font-medium">
              📍 {profile?.cities?.name}, {profile?.cities?.state} {profile?.area ? `• ${profile.area}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-800">{profile?.full_name}</p>
              <p className="text-xs text-gray-500">@{profile?.username}</p>
            </div>
            <button
              onClick={async () => {
                await supabase.auth.signOut()
                window.location.href = '/login'
              }}
              className="text-sm border border-red-200 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-2xl mx-auto px-4 mt-6 space-y-6">
        
        {/* Post Composer Box */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-emerald-100">
          <h2 className="text-sm font-semibold text-[#0D463B] mb-3">Share an update with your city</h2>
          <form onSubmit={handleCreatePost}>
            <textarea
              rows={3}
              placeholder={`What's happening in ${profile?.cities?.name || 'your city'}?`}
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0D463B] outline-none text-gray-800 text-sm resize-none"
            />
            <div className="flex justify-end mt-3">
              <button
                type="submit"
                disabled={posting || !newPostContent.trim()}
                className="bg-[#0D463B] hover:bg-[#09332b] text-white px-5 py-2 rounded-xl text-sm font-medium transition disabled:opacity-50"
              >
                {posting ? 'Posting...' : 'Post to Feed'}
              </button>
            </div>
          </form>
        </div>

        {/* City Feed Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-[#0D463B] px-1">Local Feed</h3>
          
          {posts.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-emerald-100 text-center text-gray-500">
              <p className="font-medium text-gray-700">No posts in your city yet!</p>
              <p className="text-sm mt-1">Be the first one to share an update or start a conversation in {profile?.cities?.name}.</p>
            </div>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="bg-white p-5 rounded-2xl shadow-sm border border-emerald-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 text-[#0D463B] font-bold flex items-center justify-center text-sm">
                      {post.profiles?.full_name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">{post.profiles?.full_name}</p>
                      <p className="text-xs text-gray-400">@{post.profiles?.username}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(post.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-gray-700 text-sm mt-2 whitespace-pre-wrap">{post.content}</p>
              </div>
            ))
          )}
        </div>

      </main>
    </div>
  )
}
