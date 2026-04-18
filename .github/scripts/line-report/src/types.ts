export type Revenue = {
  product: string
  amount: number
  month: string
}

export type Cost = {
  category: string
  service: string
  amount: number
  month: string
}

export type SiteHealth = {
  site_name: string
  url: string
  status: string
  response_ms: number
  checked_at: string
}

export type Lead = {
  id: string
  product: string
  name: string
  status: string
  approached_at: string
  converted_at: string
}

export type Alert = {
  id: string
  type: string
  severity: string
  message: string
  is_read: boolean
  created_at: string
}

export type AffiliateSite = {
  id?: string
  site_name?: string
  is_active?: boolean
  has_articles?: boolean
  article_count?: number
  monthly_pv?: number
  monthly_revenue?: number
}

export type RawData = {
  revenues: Revenue[]
  costs: Cost[]
  sites: SiteHealth[]
  leads: Lead[]
  alerts: Alert[]
  affiliateSites: AffiliateSite[]
}

export type SalonRinkKpis = {
  stores: number
  newLeads: number
}

export type ColorPassKpis = {
  status: 'wip' | 'ready'
}

export type SoccerKpis = {
  teams: number | null
  premiumMembers: number | null
  error?: string
}

export type AffiliateKpis = {
  active: number
  withArticles: number
  total: number
}

export type ProductKpis = {
  salonrink: SalonRinkKpis
  colorpass: ColorPassKpis
  soccer: SoccerKpis
  affiliate: AffiliateKpis
}

export type GithubRun = {
  name: string
  conclusion: string | null
  status: string
  updatedAt: string
}

export type InfraKpis = {
  vercelTotal: number
  vercelDown: number
  actionsSuccess: number
  actionsFailure: number
  actionsRecent: GithubRun[]
  actionsError?: string
}

export type AgentActivity = {
  name: string
  status: string
  lastRun: string
}

export type TeamKpis = {
  agents: AgentActivity[]
}

export type Kpis = {
  digitalRevenue: number
  totalRevenue: number
  totalCost: number
  profit: number
  targetProgress: number
  sitesDown: number
  sitesTotal: number
  leadsNew: number
  unreadCriticalAlerts: number
  currentMonth: string
  products: ProductKpis
  infra: InfraKpis
  team: TeamKpis
}

export type Mode = 'morning' | 'evening'
