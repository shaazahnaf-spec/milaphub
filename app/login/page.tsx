'use client'
import { createClient } from '../../lib/supabase/client'

export default function Login() {
  const supabase = createClient()

  return (
    <main className="min-h-screen grid place-items-center bg-[#eef3f2] p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 border border-[#dbe5e4] text-center">
        <h1 className="text-xl font-bold text-[#12302f]">Login</h1>
      </div>
    </main>
  )
}
