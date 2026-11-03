// Next.js 16: file ka naam proxy.ts, function ka naam proxy.
// Next.js 15 hai to file ka naam middleware.ts aur function ka naam middleware rakho.
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(list) {
          list.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname
  const isPublic = path.startsWith('/login') || ['/privacy', '/terms', '/refund'].includes(path)

  if (!user && !isPublic) return NextResponse.redirect(new URL('/login', request.url))
  if (user && path.startsWith('/login')) return NextResponse.redirect(new URL('/', request.url))
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
