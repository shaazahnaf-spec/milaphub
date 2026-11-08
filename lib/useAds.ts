// FILE: lib/useAds.ts
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Ad } from '@/components/AdSlot'

type Client = ReturnType<typeof createClient>

export const BAZAAR_SLOTS = ['bazaar_top', 'bazaar_grid', 'bazaar_side_left', 'bazaar_side_right']

// Apne shehar (ya poore India) ke live ads laata hai, har slot mein max 5, order random
export function useAds(supabase: Client, slots: string[]) {
  const [ads, setAds] = useState<Record<string, Ad[]>>({})
  const [cityName, setCityName] = useState('your city')
  const key = slots.join(',')

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: prof } = await supabase
        .from('profiles').select('city_id, cities(name)').eq('id', user.id).maybeSingle()
      const cityId = prof?.city_id as number | null | undefined
      if (!cityId) return
      const cRaw = (prof as unknown as { cities: { name: string } | { name: string }[] | null }).cities
      const c = Array.isArray(cRaw) ? cRaw[0] : cRaw

      const { data } = await supabase
        .from('ads')
        .select('id, slot, title, body, image_url, media_type, link_url, advertiser')
        .in('slot', key.split(','))
        .or(`city_id.is.null,city_id.eq.${cityId}`)

      const rows = (data ?? []) as Ad[]
      const map: Record<string, Ad[]> = {}
      for (const slot of key.split(',')) {
        const list = rows.filter(r => r.slot === slot).sort(() => Math.random() - 0.5).slice(0, 5)
        if (list.length) map[slot] = list
      }
      if (!cancelled) {
        setAds(map)
        if (c?.name) setCityName(c.name)
      }
    }
    load()
    return () => { cancelled = true }
  }, [supabase, key])

  return { ads, cityName }
}
