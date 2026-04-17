'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import SitesTab from './components/SitesTab'

type Revenue = { product: string; amount: number; month: string }
type Cost    = { category: string; service: string; amount: number; month: string }
type Site    = { site_name: string; url: string; status: string; response_ms: number; checked_at: string }
type Lead    = { id: string; product: string; name: string; status: string; approached_at: string; converted_at: string }
type Alert   = { id: string; type: string; severity: string; message: string; is_read: boolean; created_at: string }

const PRODUCT_COLOR: Record<string,string> = { salonrink:'#FF4B8B', colorpass:'#7C5CBF', affiliate:'#00D4AA', soccer:'#FFD700', kirei:'#FF6B35' }
const PRODUCT_LABEL: Record<string,string> = { salonrink:'SalonRink', colorpass:'COLORPASS', affiliate:'アフィリエイト', soccer:'soccer-tokyo', kirei:'キレイ鶴見' }
const SEVERITY_COLOR: Record<string,string> = { critical:'#f87171', warning:'#FFD700', info:'#00D4AA' }

function fmt(n: number) { return n >= 10000 ? `¥${Math.round(n/10000)}万` : `¥${n.toLocaleString()}` }
function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'たった今'
  if (m < 60) return `${m}分前`
  const h = Math.floor(m/60)
  if (h < 24) return `${h}時間前`
  return `${Math.floor(h/24)}日前`
}

function StatCard({ label, value, sub, color, blink }: { label:string; value:string; sub?:string; color:string; blink?:boolean }) {
  return (
    <div style={{ background:'#0d0d0d', border:`1px solid ${color}33`, borderLeft:`3px solid ${color}`, borderRadius:10, padding:'14px 16px' }}>
      <div style={{ fontSize:10, color:'#555', letterSpacing:2, marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:700, color, animation: blink ? 'pulse 2s infinite' : undefined }}>{value}</div>
      {sub && <div style={{ fontSize:10, color:'#444', marginTop:4 }}>{sub}</div>}
    </div>
  )
}

export default function Dashboard() {
  const [revenues, setRevenues] = useState<Revenue[]>([])
  const [costs, setCosts]       = useState<Cost[]>([])
  const [sites, setSites]       = useState<Site[]>([])
  const [leads, setLeads]       = useState<Lead[]>([])
  const [alerts, setAlerts]     = useState<Alert[]>([])
  const [loading, setLoading]   = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [activeTab, setActiveTab] = useState<'overview'|'leads'|'sites'|'costs'|'affiliate'>('overview')

  const fetchAll = useCallback(async () => {
    const [r,c,s,l,a] = await Promise.all([
      supabase.from('revenues').select('*').order('month',{ascending:false}),
      supabase.from('costs').select('*').order('month',{ascending:false}),
      supabase.from('site_health').select('*').order('checked_at',{ascending:false}),
      supabase.from('leads').select('*').order('created_at',{ascending:false}),
      supabase.from('alerts').select('*').order('created_at',{ascending:false}),
    ])
    if (r.data) setRevenues(r.data)
    if (c.data) setCosts(c.data)
    if (s.data) setSites(s.data)
    if (l.data) setLeads(l.data)
    if (a.data) setAlerts(a.data)
    setLastUpdated(new Date())
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAll()
    const ch = supabase.channel('dashboard').on('postgres_changes',{event:'*',schema:'public'},fetchAll).subscribe()
    const timer = setInterval(fetchAll, 5*60*1000)
    return () => { supabase.removeChannel(ch); clearInterval(timer) }
  }, [fetchAll])

  const currentMonth = new Date().toISOString().slice(0,7)
  const revThisMonth  = revenues.filter(r => r.month === currentMonth)
  const costThisMonth = costs.filter(c => c.month === currentMonth)
  const totalRevenue   = revThisMonth.reduce((a,r) => a+r.amount, 0)
  const digitalRevenue = revThisMonth.filter(r => r.product !== 'kirei').reduce((a,r) => a+r.amount, 0)
  const totalCost      = costThisMonth.reduce((a,c) => a+c.amount, 0)
  const profit         = totalRevenue - totalCost
  const targetProgress = Math.min(100, Math.round(digitalRevenue/300000*100))
  const sitesDown      = sites.filter(s => s.status === 'down').length
  const leadsNew       = leads.filter(l => l.status === 'new').length
  const leadsConverted = leads.filter(l => l.status === 'converted').length
  const convRate       = leads.length > 0 ? Math.round(leadsConverted/leads.length*100) : 0
  const unreadAlerts   = alerts.filter(a => !a.is_read && a.severity === 'critical').length

  const productRevData = Object.keys(PRODUCT_COLOR).map(p => ({
    name: PRODUCT_LABEL[p],
    収益: revThisMonth.find(r => r.product === p)?.amount || 0,
    color: PRODUCT_COLOR[p],
  }))

  const months = Array.from({length:6},(_,i) => { const d = new Date(); d.setMonth(d.getMonth()-(5-i)); return d.toISOString().slice(0,7) })
  const trendData = months.map(m => ({
    month: m.slice(5)+'月',
    収益: revenues.filter(r => r.month===m && r.product!=='kirei').reduce((a,r) => a+r.amount,0),
    コスト: costs.filter(c => c.month===m).reduce((a,c) => a+c.amount,0),
  }))

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active||!payload?.length) return null
    return (
      <div style={{ background:'#111', border:'1px solid #222', borderRadius:8, padding:'10px 14px', fontSize:11 }}>
        <div style={{ color:'#888', marginBottom:4 }}>{label}</div>
        {payload.map((p: any) => <div key={p.name} style={{ color:p.color||p.fill }}>{p.name}: {fmt(p.value)}</div>)}
      </div>
    )
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', flexDirection:'column', gap:16 }}>
      <div style={{ fontSize:10, color:'#444', letterSpacing:4, animation:'pulse 1.5s infinite' }}>LOADING AOKAE DASHBOARD...</div>
    </div>
  )

  return (
    <div style={{ maxWidth:900, margin:'0 auto', padding:'20px 16px', minHeight:'100vh' }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .tab { background:none; border:none; border-bottom:2px solid transparent; padding:8px 0; margin-right:20px; color:#444; font-size:11px; cursor:pointer; font-family:'Courier New',monospace; letter-spacing:2px; transition:all 0.2s; }
        .tab.active { border-bottom-color:#fff; color:#fff; }
      `}</style>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
        <div>
          <div style={{ fontSize:10, color:'#333', letterSpacing:4 }}>AOKAE LLC</div>
          <div style={{ fontSize:20, fontWeight:700, marginTop:4 }}><span style={{ color:'#FF6B35' }}>OPERATIONS</span> DASHBOARD</div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:10, color:'#333' }}>最終更新</div>
          <div style={{ fontSize:11, color:'#555' }}>{lastUpdated.toLocaleTimeString('ja-JP')}</div>
          {unreadAlerts > 0 && <div style={{ fontSize:10, color:'#f87171', marginTop:4, animation:'pulse 2s infinite' }}>⚠️ 要対応 {unreadAlerts}件</div>}
        </div>
      </div>

      <div style={{ background:'#0d0d0d', border:'1px solid #1a1a1a', borderRadius:10, padding:'14px 16px', marginBottom:20 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
          <div style={{ fontSize:11, color:'#666' }}>月収¥30万 達成進捗</div>
          <div style={{ fontSize:11, color: targetProgress >= 100 ? '#4ade80' : '#FF6B35' }}>{digitalRevenue.toLocaleString()}円 / 300,000円 ({targetProgress}%)</div>
        </div>
        <div style={{ height:6, background:'#1a1a1a', borderRadius:3, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${targetProgress}%`, background: targetProgress >= 100 ? '#4ade80' : 'linear-gradient(90deg,#FF6B35,#FF4B8B)', borderRadius:3, transition:'width 0.8s ease' }} />
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:8 }}>
        <StatCard label="デジタル月収" value={fmt(digitalRevenue)} sub="目標¥30万" color="#4ade80" />
        <StatCard label="月次コスト" value={fmt(totalCost)} sub="目標¥5,000" color="#f87171" />
        <StatCard label="手残り" value={fmt(profit)} color="#00D4AA" />
        <StatCard label="要対応" value={`${unreadAlerts}件`} color="#FFD700" blink={unreadAlerts > 0} />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
        <StatCard label="サイト障害" value={sitesDown > 0 ? `${sitesDown}件DOWN` : '全サイト正常'} color={sitesDown > 0 ? '#f87171' : '#4ade80'} />
        <StatCard label="新規リード" value={`${leadsNew}件`} color="#FF4B8B" />
        <StatCard label="転換率" value={`${convRate}%`} sub={`${leadsConverted}/${leads.length}件`} color="#7C5CBF" />
        <StatCard label="監視サイト" value={`${sites.length}件`} color="#00A8FF" />
      </div>

      <div style={{ borderBottom:'1px solid #111', marginBottom:20 }}>
        {(['overview','leads','sites','costs','affiliate'] as const).map(t => (
          <button key={t} className={`tab${activeTab===t?' active':''}`} onClick={() => setActiveTab(t)}>
            {{'overview':'概要','leads':'リード','sites':'サイト監視','costs':'コスト','affiliate':'107サイト管理'}[t]}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div style={{ animation:'fadeIn 0.3s ease' }}>
          {alerts.filter(a => !a.is_read).length > 0 && (
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:10, color:'#444', letterSpacing:3, marginBottom:10 }}>ALERTS</div>
              {alerts.filter(a => !a.is_read).slice(0,5).map(a => (
                <div key={a.id} style={{ padding:'10px 14px', borderRadius:8, marginBottom:6, background:`${SEVERITY_COLOR[a.severity]}10`, border:`1px solid ${SEVERITY_COLOR[a.severity]}33`, display:'flex', gap:10 }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', background:SEVERITY_COLOR[a.severity], marginTop:4, flexShrink:0 }} />
                  <div>
                    <div style={{ fontSize:12, color:'#ccc' }}>{a.message}</div>
                    <div style={{ fontSize:10, color:'#444', marginTop:2 }}>{timeAgo(a.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ fontSize:10, color:'#444', letterSpacing:3, marginBottom:12 }}>収益 vs コスト推移</div>
          <div style={{ background:'#0d0d0d', border:'1px solid #1a1a1a', borderRadius:12, padding:16, marginBottom:16 }}>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#111" />
                <XAxis dataKey="month" tick={{ fill:'#444', fontSize:10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:'#444', fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v => v>=10000?`${v/10000}万`:String(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="収益" stroke="#4ade80" strokeWidth={2} dot={{ fill:'#4ade80', r:3 }} />
                <Line type="monotone" dataKey="コスト" stroke="#f87171" strokeWidth={2} dot={{ fill:'#f87171', r:3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ fontSize:10, color:'#444', letterSpacing:3, marginBottom:12 }}>今月のプロダクト別収益</div>
          <div style={{ background:'#0d0d0d', border:'1px solid #1a1a1a', borderRadius:12, padding:16 }}>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={productRevData} barSize={32}>
                <XAxis dataKey="name" tick={{ fill:'#444', fontSize:10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:'#444', fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v => v>=10000?`${v/10000}万`:String(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="収益" fill="#00D4AA" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === 'leads' && (
        <div style={{ animation:'fadeIn 0.3s ease' }}>
          <div style={{ fontSize:10, color:'#444', letterSpacing:3, marginBottom:12 }}>LEADS ({leads.length}件)</div>
          {leads.length === 0
            ? <div style={{ color:'#333', fontSize:12, padding:20, textAlign:'center' }}>リードなし — 営業エージェント稼働後に自動入力</div>
            : leads.slice(0,20).map(l => (
              <div key={l.id} style={{ padding:'10px 12px', borderRadius:8, marginBottom:4, display:'grid', gridTemplateColumns:'1fr auto auto auto', gap:10, alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:12, color:'#ddd' }}>{l.name}</div>
                  <div style={{ fontSize:10, color:'#555', marginTop:2 }}>{l.approached_at ? timeAgo(l.approached_at) : '未アプローチ'}</div>
                </div>
                <div style={{ fontSize:10, color:PRODUCT_COLOR[l.product]||'#888' }}>{PRODUCT_LABEL[l.product]||l.product}</div>
                <div style={{ fontSize:10, padding:'2px 8px', borderRadius:4, background:'#111', color:'#666' }}>
                  {{'new':'新規','contacted':'送信済','replied':'返信あり','converted':'成約','lost':'失注'}[l.status]||l.status}
                </div>
              </div>
            ))
          }
        </div>
      )}

      {activeTab === 'sites' && (
        <div style={{ animation:'fadeIn 0.3s ease' }}>
          <div style={{ fontSize:10, color:'#444', letterSpacing:3, marginBottom:12 }}>SITE HEALTH ({sites.length}件)</div>
          {sites.length === 0
            ? <div style={{ color:'#333', fontSize:12, padding:20, textAlign:'center' }}>監視データなし</div>
            : sites.slice(0,30).map((s,i) => (
              <div key={i} style={{ padding:'10px 12px', borderRadius:8, marginBottom:4, background: s.status==='down'?'#1a0505':'#0d0d0d', border:`1px solid ${s.status==='down'?'#f8717133':'#111'}`, display:'grid', gridTemplateColumns:'1fr auto auto', gap:10, alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:12, color:'#ddd' }}>{s.site_name}</div>
                  <div style={{ fontSize:10, color:'#444', marginTop:2 }}>{s.url}</div>
                </div>
                <div style={{ fontSize:10, color:'#555' }}>{s.response_ms ? `${s.response_ms}ms` : '—'}</div>
                <div style={{ fontSize:10, padding:'2px 8px', borderRadius:4, background: s.status==='up'?'#4ade8022':'#f8717122', color: s.status==='up'?'#4ade80':'#f87171' }}>
                  {s.status==='up'?'✓ UP':'✗ DOWN'}
                </div>
              </div>
            ))
          }
        </div>
      )}

      {activeTab === 'costs' && (
        <div style={{ animation:'fadeIn 0.3s ease' }}>
          <div style={{ fontSize:10, color:'#444', letterSpacing:3, marginBottom:12 }}>今月コスト（合計 {fmt(totalCost)}）</div>
          {costThisMonth.map((c,i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 12px', background:'#0d0d0d', border:'1px solid #111', borderRadius:8, marginBottom:4 }}>
              <div>
                <div style={{ fontSize:12, color:'#ddd' }}>{c.service}</div>
                <div style={{ fontSize:10, color:'#444', marginTop:2 }}>{c.category}</div>
              </div>
              <div style={{ fontSize:14, color:'#f87171', fontWeight:600 }}>{fmt(c.amount)}</div>
            </div>
          ))}
          <div style={{ marginTop:12, padding:'12px 14px', background:'#1a0d0d', border:'1px solid #3a1a1a', borderRadius:8, display:'flex', justifyContent:'space-between' }}>
            <span style={{ fontSize:12, color:'#888' }}>合計</span>
            <span style={{ fontSize:16, color:'#f87171', fontWeight:700 }}>{fmt(totalCost)}</span>
          </div>
        </div>
      )}

      {activeTab === 'affiliate' && <SitesTab />}

      <div style={{ marginTop:32, paddingTop:16, borderTop:'1px solid #111', fontSize:10, color:'#2a2a2a', display:'flex', justifyContent:'space-between' }}>
        <span>AOKAE LLC</span>
        <span>自動更新: 5分ごと</span>
      </div>
    </div>
  )
}
