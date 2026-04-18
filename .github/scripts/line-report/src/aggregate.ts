import type {
  RawData,
  Kpis,
  ProductKpis,
  InfraKpis,
  TeamKpis,
  GithubRun,
  SoccerKpis,
} from './types.js'
import { jstMonth } from './format.js'

const TARGET_DIGITAL_REVENUE = 300_000

function aggregateProducts(data: RawData, soccer: SoccerKpis): ProductKpis {
  const salonRinkLeads = data.leads.filter(l => l.product === 'salonrink')
  const salonrink = {
    stores: salonRinkLeads.filter(l => l.status === 'converted').length,
    newLeads: salonRinkLeads.filter(l => l.status === 'new').length,
  }

  const af = data.affiliateSites
  const isActive = (s: { is_active?: boolean; status?: string }) =>
    s.is_active === true || s.status === 'active'
  const hasArticles = (s: { article_count?: number }) => (s.article_count ?? 0) > 0
  const affiliate = {
    active: af.filter(isActive).length,
    withArticles: af.filter(hasArticles).length,
    total: af.length,
  }

  return {
    salonrink,
    colorpass: { status: 'wip' },
    soccer,
    affiliate,
  }
}

function aggregateInfra(data: RawData, runs: GithubRun[], runsError?: string): InfraKpis {
  const recent = runs.slice(0, 5)
  return {
    vercelTotal: data.sites.length,
    vercelDown: data.sites.filter(s => s.status === 'down').length,
    actionsSuccess: runs.filter(r => r.conclusion === 'success').length,
    actionsFailure: runs.filter(r => r.conclusion === 'failure').length,
    actionsRecent: recent,
    actionsError: runsError,
  }
}

function aggregateTeam(runs: GithubRun[]): TeamKpis {
  const byName = new Map<string, GithubRun>()
  for (const r of runs) {
    if (!byName.has(r.name)) byName.set(r.name, r)
  }
  const agents = Array.from(byName.values())
    .slice(0, 5)
    .map(r => ({
      name: r.name,
      status: r.conclusion ?? r.status,
      lastRun: r.updatedAt,
    }))
  return { agents }
}

export function aggregate(
  data: RawData,
  soccer: SoccerKpis,
  runs: GithubRun[],
  runsError?: string,
): Kpis {
  const currentMonth = jstMonth()

  const revThisMonth = data.revenues.filter(r => r.month === currentMonth)
  const costThisMonth = data.costs.filter(c => c.month === currentMonth)

  const totalRevenue = revThisMonth.reduce((a, r) => a + r.amount, 0)
  const digitalRevenue = revThisMonth
    .filter(r => r.product !== 'kirei')
    .reduce((a, r) => a + r.amount, 0)
  const totalCost = costThisMonth.reduce((a, c) => a + c.amount, 0)
  const profit = totalRevenue - totalCost
  const targetProgress = Math.min(
    100,
    Math.round((digitalRevenue / TARGET_DIGITAL_REVENUE) * 100),
  )

  const sitesDown = data.sites.filter(s => s.status === 'down').length
  const leadsNew = data.leads.filter(l => l.status === 'new').length
  const unreadCriticalAlerts = data.alerts.filter(
    a => !a.is_read && a.severity === 'critical',
  ).length

  return {
    digitalRevenue,
    totalRevenue,
    totalCost,
    profit,
    targetProgress,
    sitesDown,
    sitesTotal: data.sites.length,
    leadsNew,
    unreadCriticalAlerts,
    currentMonth,
    products: aggregateProducts(data, soccer),
    infra: aggregateInfra(data, runs, runsError),
    team: aggregateTeam(runs),
  }
}
