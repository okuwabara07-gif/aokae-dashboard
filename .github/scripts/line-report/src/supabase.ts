import { createClient } from '@supabase/supabase-js'
import type {
  RawData,
  Revenue,
  Cost,
  SiteHealth,
  Lead,
  Alert,
  AffiliateSite,
  SoccerKpis,
} from './types.js'

export function createSupabaseClient(url: string, anonKey: string) {
  return createClient(url, anonKey, {
    auth: { persistSession: false },
  })
}

export async function fetchAll(
  client: ReturnType<typeof createSupabaseClient>,
): Promise<RawData> {
  const [r, c, s, l, a, af] = await Promise.all([
    client.from('revenues').select('*').order('month', { ascending: false }),
    client.from('costs').select('*').order('month', { ascending: false }),
    client.from('site_health').select('*').order('checked_at', { ascending: false }),
    client.from('leads').select('*').order('created_at', { ascending: false }),
    client.from('alerts').select('*').order('created_at', { ascending: false }),
    client.from('affiliate_sites').select('*'),
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

  if (af.error) {
    console.warn(`affiliate_sites fetch failed (non-fatal): ${af.error.message}`)
  }

  return {
    revenues: (r.data ?? []) as Revenue[],
    costs: (c.data ?? []) as Cost[],
    sites: (s.data ?? []) as SiteHealth[],
    leads: (l.data ?? []) as Lead[],
    alerts: (a.data ?? []) as Alert[],
    affiliateSites: (af.data ?? []) as AffiliateSite[],
  }
}

export async function fetchSoccer(url: string, anonKey: string): Promise<SoccerKpis> {
  try {
    const client = createClient(url, anonKey, { auth: { persistSession: false } })
    const teamsRes = await client
      .from('teams')
      .select('id', { count: 'exact', head: true })
    return {
      teams: teamsRes.error ? null : teamsRes.count ?? 0,
      premiumMembers: null,
      error: teamsRes.error?.message,
    }
  } catch (e) {
    return {
      teams: null,
      premiumMembers: null,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}
