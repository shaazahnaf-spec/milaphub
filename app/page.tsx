import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen grid place-items-center bg-[#eef3f2] p-4">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-[#12302f]">Welcome to MilapHub</h1>
        <div className="space-x-4">
          <Link href="/login" className="text-[#0f5c5a] underline">Login</Link>
          <Link href="/onboarding" className="text-[#0f5c5a] underline">Onboarding</Link>
        </div>
      </div>
    </main>
  )
}
