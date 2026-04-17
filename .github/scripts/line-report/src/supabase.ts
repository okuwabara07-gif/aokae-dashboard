import { createClient } from '@supabase/supabase-js'
import type { RawData, Revenue, Cost, SiteHealth, Lead, Alert } from './types.js'

export function createSupabaseClient(url: string, anonKey: string) {
  return createClient(url, anonKey, {
    auth: { persistSession: false },
  })
}

export async function fetchAll(
  client: ReturnType<typeof createSupabaseClient>,
): Promise<RawData> {
  const [r, c, s, l, a] = await Promise.all([
    client.from('revenues').select('*').order('month', { ascending: false }),
    client.from('costs').select('*').order('month', { ascending: false }),
    client.from('site_health').select('*').order('checked_at', { ascending: false }),
    client.from('leads').select('*').order('created_at', { ascending: false }),
    client.from('alerts').select('*').order('created_at', { ascending: false }),
  ])

  for (const [name, res] of [
    ['revenues', r],
    ['costs', c],
    ['site_health', s],
    ['leads', l],
    ['alerts', a],
  ] as const) {
    if (res.error) throw new Error(`Supabase fetch failed (${name}): ${res.error.message}`)
  }

  return {
    revenues: (r.data ?? []) as Revenue[],
    costs: (c.data ?? []) as Cost[],
    sites: (s.data ?? []) as SiteHealth[],
    leads: (l.data ?? []) as Lead[],
    alerts: (a.data ?? []) as Alert[],
  }
}
