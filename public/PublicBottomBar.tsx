// FILE: components/public/PublicBottomBar.tsx
// Fixed bar at the bottom of every visitor page (Facebook style).
import Link from 'next/link'

export default function PublicBottomBar() {
  return (
    <div role="region" aria-label="Join MilapHub"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e5eceb] bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-2 text-center sm:gap-3">
        <p className="text-sm font-extrabold text-[#12302f] sm:text-xl">
          Log in or sign up for MilapHub to connect with people in your city.
        </p>
        <div className="flex items-center gap-3">
          <Link href="/login" className="rounded-lg bg-[#0f5c5a] px-8 py-2 text-sm font-bold text-white hover:bg-[#0c4a48] sm:px-14">
            Log in
          </Link>
          <span className="text-sm text-[#5d7776]">or</span>
          <Link href="/login" className="rounded-lg bg-[#2f9e5b] px-6 py-2 text-sm font-bold text-white hover:bg-[#278650] sm:px-10">
            Create new account
          </Link>
        </div>
      </div>
    </div>
  )
}
