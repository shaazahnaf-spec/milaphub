// FILE: app/og/route.tsx
// GET /og?k=Post&t=text&by=Name  ->  1200x630 MilapHub card (used when a shared item has no photo).
// Only Latin text is drawn. Hindi / Urdu / Telugu / emoji fall back to a generic line,
// because the built-in font cannot draw them (they would show as empty boxes).

import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'

export const runtime = 'edge'

const NOT_LATIN = /[^\u0000-\u024F\u2000-\u206F\u20A0-\u20CF]/

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const kind = (sp.get('k') || 'Post').slice(0, 20)
  let text = (sp.get('t') || '').trim().slice(0, 140)
  let by = (sp.get('by') || '').trim().slice(0, 40)
  if (!text || NOT_LATIN.test(text)) text = `See this ${kind.toLowerCase()} on MilapHub`
  if (NOT_LATIN.test(by)) by = ''

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          width: '100%', height: '100%', padding: 64, color: 'white',
          background: 'linear-gradient(135deg, #0f5c5a 0%, #12302f 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', fontSize: 52, fontWeight: 800 }}>MilapHub</div>
          <div style={{ display: 'flex', fontSize: 28, background: '#f0a500', color: '#3a2900', padding: '8px 24px', borderRadius: 999, fontWeight: 700 }}>
            {kind}
          </div>
        </div>
        <div style={{ display: 'flex', fontSize: text.length > 80 ? 46 : 60, fontWeight: 700, lineHeight: 1.25, maxWidth: 1000 }}>
          {text}
        </div>
        <div style={{ display: 'flex', fontSize: 30, color: '#b9d6d4' }}>
          {by ? `${by} on MilapHub` : 'Your city. Your people. milaphub.vercel.app'}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
