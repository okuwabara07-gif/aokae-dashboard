import type { Kpis, Mode } from './types.js'
import { fmtYen, jstDateLabel } from './format.js'

const PUSH_ENDPOINT = 'https://api.line.me/v2/bot/message/push'

type LineCreds = { token: string; userId: string }

export function buildReportMessage(mode: Mode, kpis: Kpis, comment: string): string {
  const header = mode === 'morning' ? '🌅 AOKAE朝レポート' : '🌙 AOKAE夕レポート'
  const date = jstDateLabel()
  const sitesLine =
    kpis.sitesDown > 0
      ? `🌐 サイト: ${kpis.sitesDown}件DOWN / 全${kpis.sitesTotal}件`
      : `🌐 サイト: 全${kpis.sitesTotal}件正常`

  const lines = [
    `${header} (${date})`,
    '',
    `💰 デジタル月収: ${fmtYen(kpis.digitalRevenue)} / ¥30万 (${kpis.targetProgress}%)`,
    `💸 月次コスト: ${fmtYen(kpis.totalCost)}`,
    `📈 手残り: ${fmtYen(kpis.profit)}`,
    '',
    `🔔 要対応: ${kpis.unreadCriticalAlerts}件`,
    sitesLine,
    `📩 新規リード: ${kpis.leadsNew}件`,
  ]
  if (comment) {
    lines.push('', `💬 ${comment}`)
  }
  return lines.join('\n')
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
): Promise<void> {
  const text = buildReportMessage(mode, kpis, comment)
  await pushText(creds, text)
}

export async function pushFailureNotice(creds: LineCreds, message: string): Promise<void> {
  await pushText(creds, `⚠️ ${message}`)
}
