'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

type Site = {
  id: string
  site_name: string
  vercel_url: string
  article_count: number
  gsc_registered: boolean
  adsense_registered: boolean
  adsense_approved: boolean
  has_articles: boolean
  priority: number
  niche: string
}

const NICHE_COLOR: Record<string, string> = {
  beauty: '#FF4B8B', finance: '#00A8FF', fitness: '#00D4AA', lifestyle: '#FFD700', other: '#888',
}
const NICHE_LABEL: Record<string, string> = {
  beauty: '美容', finance: '金融', fitness: 'フィット', lifestyle: 'ライフ', other: 'その他',
}

export default function SitesTab() {
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const fetchSites = useCallback(async () => {
    const { data } = await supabase.from('affiliate_sites').select('*').order('priority', { ascending: false }).order('site_name')
    if (data) setSites(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchSites() }, [fetchSites])

  const filtered = sites.filter(s => {
    if (search && !s.site_name.includes(search)) return false
    if (filter === 'priority') return s.priority >= 20
    if (filter === 'no_articles') return !s.has_articles
    if (['beauty','finance','fitness','lifestyle'].includes(filter)) return s.niche === filter
    return true
  })

  const stats = {
    total: sites.length,
    articles: sites.filter(s => s.has_articles).length,
    gsc: sites.filter(s => s.gsc_registered).length,
    adsense: sites.filter(s => s.adsense_registered).length,
    approved: sites.filter(s => s.adsense_approved).length,
    priority: sites.filter(s => s.priority >= 20).length,
  }

  if (loading) return <div style={{ color: '#444', fontSize: 12, padding: 20 }}>読み込み中...</div>

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
        {[
          { label: '総サイト数', val: stats.total, color: '#fff' },
          { label: '記事あり', val: `${stats.articles} (${Math.round(stats.articles/Math.max(stats.total,1)*100)}%)`, color: '#4ade80' },
          { label: 'GSC登録済', val: `${stats.gsc} (${Math.round(stats.gsc/Math.max(stats.total,1)*100)}%)`, color: '#00A8FF' },
          { label: 'AdSense登録', val: `${stats.adsense} (${Math.round(stats.adsense/Math.max(stats.total,1)*100)}%)`, color: '#FFD700' },
          { label: 'AdSense承認', val: stats.approved === 0 ? '申請中' : `${stats.approved}件`, color: '#4ade80' },
          { label: '優先サイト', val: `${stats.priority}件`, color: '#FF6B35' },
        ].map(c => (
          <div key={c.label} style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 9, color: '#444', letterSpacing: 1 }}>{c.label}</div>
            <div style={{ fontSize: 16, color: c.color, fontWeight: 700, marginTop: 2 }}>{c.val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: `全て(${stats.total})` },
          { key: 'priority', label: `優先(${stats.priority})` },
          { key: 'no_articles', label: `記事なし(${stats.total - stats.articles})` },
          { key: 'beauty', label: '美容' },
          { key: 'finance', label: '金融' },
          { key: 'fitness', label: 'フィット' },
          { key: 'lifestyle', label: 'ライフ' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{ background: 'none', border: `1px solid ${filter === f.key ? '#fff' : '#222'}`, borderRadius: 6, padding: '4px 10px', color: filter === f.key ? '#fff' : '#555', fontSize: 10, cursor: 'pointer', fontFamily: 'Courier New' }}>
            {f.label}
          </button>
        ))}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="検索..." style={{ background: '#0d0d0d', border: '1px solid #222', borderRadius: 6, padding: '4px 10px', color: '#fff', fontSize: 10, width: 120 }} />
      </div>

      <div style={{ fontSize: 10, color: '#444', marginBottom: 6 }}>{filtered.length}件</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 32px 32px 32px 32px 32px 60px', gap: 4, padding: '4px 8px', fontSize: 9, color: '#444', borderBottom: '1px solid #111' }}>
        <span>サイト名</span><span style={{textAlign:'center'}}>記事</span><span style={{textAlign:'center'}}>GSC</span><span style={{textAlign:'center'}}>AS登録</span><span style={{textAlign:'center'}}>AS承認</span><span style={{textAlign:'center'}}>優先</span><span>ジャンル</span>
      </div>

      <div style={{ maxHeight: 500, overflowY: 'auto' }}>
        {filtered.map(site => (
          <div key={site.id} style={{ display: 'grid', gridTemplateColumns: '1fr 32px 32px 32px 32px 32px 60px', gap: 4, padding: '6px 8px', borderBottom: '1px solid #0d0d0d', alignItems: 'center', background: site.priority >= 20 ? '#0d0a06' : 'transparent' }}>
            <a href={site.vercel_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: site.priority >= 20 ? '#FF6B35' : '#888', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {site.site_name}
            </a>
            <span style={{textAlign:'center', fontSize:12}}>{site.has_articles ? '✅' : '❌'}</span>
            <span style={{textAlign:'center', fontSize:12}}>{site.gsc_registered ? '✅' : '❌'}</span>
            <span style={{textAlign:'center', fontSize:12}}>{site.adsense_registered ? '✅' : '❌'}</span>
            <span style={{textAlign:'center', fontSize:12}}>{site.adsense_approved ? '✅' : '⏳'}</span>
            <span style={{textAlign:'center', fontSize:12}}>{site.priority >= 20 ? '⭐' : ''}</span>
            <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: (NICHE_COLOR[site.niche] || '#888') + '22', color: NICHE_COLOR[site.niche] || '#888', border: `1px solid ${(NICHE_COLOR[site.niche] || '#888')}44` }}>
              {NICHE_LABEL[site.niche] || site.niche}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
