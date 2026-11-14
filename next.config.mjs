// next.config.mjs  (replaces the one in the repo root)
// 1) lets Next.js resize your Supabase photos (WhatsApp / social preview cards)
// 2) adds basic browser security headers to every page

const supabaseHost = (() => {
  try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname } catch { return null }
})()

const securityHeaders = [
  // the browser must trust the declared file type (blocks "disguised" uploads)
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // nobody can put MilapHub inside their own page (clickjacking)
  { key: 'X-Frame-Options', value: 'DENY' },
  // do not leak full page URLs to other sites
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // the app never needs camera or microphone access
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
  // always use https
  { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: supabaseHost
      ? [{ protocol: 'https', hostname: supabaseHost, pathname: '/storage/v1/object/public/**' }]
      : [],
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
}

export default nextConfig
