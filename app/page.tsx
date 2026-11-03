import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white shadow-xl rounded-2xl p-8 border border-indigo-50 text-center">
        <h1 className="text-3xl font-extrabold text-indigo-900 mb-2 tracking-tight">
          Welcome to MilapHub
        </h1>
        <p className="text-gray-600 mb-8 text-sm">
          Connect, fundraise, and build communities seamlessly with Supabase & Next.js.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href="/login"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-xl transition duration-200 shadow-md shadow-indigo-200"
          >
            Login to Account
          </Link>
          <Link
            href="/onboarding"
            className="w-full bg-white hover:bg-gray-50 text-indigo-600 border border-indigo-200 font-medium py-3 px-4 rounded-xl transition duration-200"
          >
            Create Profile (Onboarding)
          </Link>
        </div>
      </div>
    </main>
  )
}
