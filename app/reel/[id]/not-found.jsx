import Link from "next/link";

export default function ReelNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0b1514] p-6 text-center text-white">
      <h1 className="text-2xl font-bold">This reel was not found</h1>
      <p className="mt-2 max-w-sm text-white/70">
        The link may be wrong, the reel may have been removed, or it may still be uploading.
      </p>
      <div className="mt-5 flex gap-3">
        <Link href="/reels" className="rounded-full bg-[#0f5c5a] px-5 py-2 text-sm font-semibold">Browse reels</Link>
        <Link href="/" className="rounded-full border border-white/25 px-5 py-2 text-sm">MilapHub</Link>
      </div>
    </main>
  );
}
