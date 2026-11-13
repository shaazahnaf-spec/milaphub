// FILE: components/public/PublicShell.tsx
// Facebook-Marketplace-style frame for visitors: header + scrolling left sidebar + content + bottom bar.
import PublicHeader from '@/components/public/PublicHeader'
import PublicSidebar, { type ServiceKey } from '@/components/public/PublicSidebar'
import PublicBottomBar from '@/components/public/PublicBottomBar'
import PublicServiceBar from '@/components/PublicServiceBar'

export default function PublicShell({
  active = '', category = '', cityId = null, q = '', children,
}: { active?: ServiceKey; category?: string; cityId?: number | null; q?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f3f7f6] text-[#12302f]">
      <PublicHeader />
      <div className="lg:hidden">
        <PublicServiceBar current={active ? `/${active}` : undefined} />
      </div>
      <div className="mx-auto flex max-w-[1600px]">
        <PublicSidebar active={active} category={category} cityId={cityId} q={q} />
        <main className="min-w-0 flex-1 px-4 pb-40 pt-5 sm:px-6">{children}</main>
      </div>
      <PublicBottomBar />
    </div>
  )
}
