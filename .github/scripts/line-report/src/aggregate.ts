import type { RawData, Kpis } from './types.js'
import { jstMonth } from './format.js'

const TARGET_DIGITAL_REVENUE = 300_000

export function aggregate(data: RawData): Kpis {
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
  }
}
