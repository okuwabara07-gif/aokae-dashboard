import type { Kpis, Mode } from './types.js'
import { fmtYen, jstDateLabel } from './format.js'

const PUSH_ENDPOINT = 'https://api.line.me/v2/bot/message/push'
const DIVIDER = '━━━━━━━━━━━━━━'

type LineCreds = { token: string; userId: string }

function statusIcon(s: string): string {
  if (s === 'success') return '✅'
  if (s === 'failure') return '❌'
  if (s === 'in_progress' || s === 'queued') return '⏳'
  return '⚪'
}

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return iso
  const diff = Date.now() - t
  const h = Math.floor(diff / 3_600_000)
  if (h < 1) return `${Math.max(1, Math.floor(diff / 60_000))}分前`
  if (h < 24) return `${h}時間前`
  return `${Math.floor(h / 24)}日前`
}

function summaryBlock(kpis: Kpis): string[] {
  return [
    '📊 サマリー',
    `💰 デジタル月収: ${fmtYen(kpis.digitalRevenue)} / ¥30万 (${kpis.targetProgress}%)`,
    `💸 月次コスト: ${fmtYen(kpis.totalCost)}`,
    `📈 手残り: ${fmtYen(kpis.profit)}`,
    `🔔 要対応アラート: ${kpis.unreadCriticalAlerts}件`,
  ]
}

function productBlock(kpis: Kpis): string[] {
  const p = kpis.products
  const soccerTeams = p.soccer.teams ?? '—'
  const soccerLine = p.soccer.error
    ? `  └ 取得失敗: ${p.soccer.error.slice(0, 40)}`
    : `  └ チーム ${soccerTeams}件`
  return [
    '🧩 プロダクト別',
    `💅 SalonRink`,
    `  └ 登録店舗 ${p.salonrink.stores}件 / 新規リード ${p.salonrink.newLeads}件`,
    `🎨 COLORPASS`,
    `  └ 準備中`,
    `⚽ soccer-kanto`,
    soccerLine,
    `🔗 アフィリエイト`,
    `  └ 稼働 ${p.affiliate.active}/${p.affiliate.total}件 / 記事あり ${p.affiliate.withArticles}件`,
  ]
}

function infraBlock(kpis: Kpis): string[] {
  const i = kpis.infra
  const vercel =
    i.vercelDown > 0
      ? `🔴 Vercel: ${i.vercelDown}件DOWN / ${i.vercelTotal}件`
      : `🟢 Vercel: 全${i.vercelTotal}件正常`
  const actions = i.actionsError
    ? `⚠️ GH Actions: 取得失敗`
    : `🔧 GH Actions: 成功${i.actionsSuccess} / 失敗${i.actionsFailure}`
  const lines = ['🏗 インフラ', vercel, actions]
  return lines
}

function teamBlock(kpis: Kpis): string[] {
  const lines = ['👥 チーム活動']
  if (kpis.team.agents.length === 0) {
    lines.push('  └ 直近の稼働ログなし')
    return lines
  }
  for (const a of kpis.team.agents.slice(0, 4)) {
    lines.push(`${statusIcon(a.status)} ${a.name} (${timeAgo(a.lastRun)})`)
  }
  return lines
}

function tasksBlock(tasks: string[]): string[] {
  if (tasks.length === 0) return []
  const lines = ['🎯 今日やること']
  tasks.forEach((t, i) => lines.push(`${i + 1}. ${t}`))
  return lines
}

export function buildReportMessage(
  mode: Mode,
  kpis: Kpis,
  comment: string,
  tasks: string[],
): string {
  const header = mode === 'morning' ? '🌅 AOKAE 朝レポート' : '🌙 AOKAE 夕レポート'
  const date = jstDateLabel()

  const sections: string[][] = [
    [`${header} (${date})`],
    summaryBlock(kpis),
    productBlock(kpis),
    infraBlock(kpis),
    teamBlock(kpis),
  ]

  const taskLines = tasksBlock(tasks)
  if (taskLines.length > 0) sections.push(taskLines)

  if (comment) {
    sections.push(['💬 一言', comment])
  }

  return sections.map(s => s.join('\n')).join(`\n${DIVIDER}\n`)
}

async function pushText(creds: LineCreds, text: string): Promise<void> {
  const res = await fetch(PUSH_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${creds.token}`,
    },
    body: JSON.stringify({
      to: creds.userId,
      messages: [{ type: 'text', text }],
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`LINE push failed (${res.status}): ${body}`)
  }
}

export async function pushReport(
  creds: LineCreds,
  mode: Mode,
  kpis: Kpis,
  comment: string,
  tasks: string[],
): Promise<void> {
  const text = buildReportMessage(mode, kpis, comment, tasks)
  await pushText(creds, text)
}

export async function pushFailureNotice(creds: LineCreds, message: string): Promise<void> {
  await pushText(creds, `⚠️ ${message}`)
}
