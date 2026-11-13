// FILE: app/bazaar/page.tsx
// Visitors get the public Facebook-Marketplace-style grid (server-rendered).
// Logged-in users get the full Bazaar (BazaarClient.tsx), exactly as before.

import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import BazaarClient from './BazaarClient'
import PublicBazaar from '@/components/public/PublicBazaar'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Bazaar | MilapHub',
  description: 'Buy and sell in your city on MilapHub Bazaar. Mobiles, furniture, vehicles, rentals and more.',
}

export default async function BazaarRoute({
  searchParams,
}: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) return <BazaarClient />
  return <PublicBazaar params={await searchParams} />
}
