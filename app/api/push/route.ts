// FILE: app/api/push/route.ts
import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

type NotificationRecord = {
  id: string
  user_id: string
  type: string
  title: string
  message: string | null
  link: string | null
  is_read: boolean
}

// Supabase Database Webhook (notifications table: INSERT aur UPDATE) yahan POST karta hai
export async function POST(req: Request) {
  if (req.headers.get('x-webhook-secret') !== process.env.PUSH_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!url || !serviceKey || !pub || !priv) {
    return NextResponse.json({ error: 'push is not configured' }, { status: 500 })
  }

  const body = (await req.json().catch(() => null)) as { record?: NotificationRecord } | null
  const rec = body?.record
  if (!rec?.user_id || rec.is_read) return NextResponse.json({ ok: true, skipped: true })

  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? 'mailto:support@milaphub.com', pub, priv)
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

  // User ne is category ka push band kiya hai?
  const { data: t } = await admin.from('notification_types').select('category').eq('type', rec.type).maybeSingle()
  if (t?.category) {
    const { data: pref } = await admin
      .from('notification_prefs').select('push').eq('user_id', rec.user_id).eq('category', t.category).maybeSingle()
    if (pref && pref.push === false) return NextResponse.json({ ok: true, skipped: 'pref' })
  }

  const { data: subs } = await admin
    .from('push_subscriptions').select('id, endpoint, p256dh, auth').eq('user_id', rec.user_id)

  const payload = JSON.stringify({
    title: rec.title,
    body: rec.message ?? '',
    url: rec.link ?? '/home',
    tag: rec.type,
  })

  await Promise.all(
    (subs ?? []).map(async s => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload)
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode
        if (code === 404 || code === 410) await admin.from('push_subscriptions').delete().eq('id', s.id)
      }
    })
  )

  return NextResponse.json({ ok: true, sent: subs?.length ?? 0 })
}
