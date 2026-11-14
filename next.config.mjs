// Lets Next.js resize your Supabase photos. Used for WhatsApp / social link-preview images,
// because WhatsApp often drops preview images that are bigger than roughly 300KB.
const supabaseHost = (() => {
  try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname } catch { return null }
})()

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: supabaseHost
      ? [{ protocol: 'https', hostname: supabaseHost, pathname: '/storage/v1/object/public/**' }]
      : [],
  },
}

export default nextConfig
