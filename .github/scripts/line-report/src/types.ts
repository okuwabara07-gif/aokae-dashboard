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

export type RawData = {
  revenues: Revenue[]
  costs: Cost[]
  sites: SiteHealth[]
  leads: Lead[]
  alerts: Alert[]
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
}

export type Mode = 'morning' | 'evening'
