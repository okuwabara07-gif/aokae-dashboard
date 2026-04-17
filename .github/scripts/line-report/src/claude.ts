import Anthropic from '@anthropic-ai/sdk'
import type { Kpis } from './types.js'
import { fmtYen } from './format.js'

const MODEL = 'claude-haiku-4-5-20251001'

function buildPrompt(kpis: Kpis): string {
  return [
    'あなたはAOKAE LLCの経営アシスタントです。',
    '以下の今日のKPIを見て、オーナーへの一言コメントを150字以内で生成してください。',
    '数字の繰り返しは不要、行動につながる示唆を1つ含めてください。',
    '',
    `- デジタル月収: ${fmtYen(kpis.digitalRevenue)} / ¥300,000 (${kpis.targetProgress}%)`,
    `- 月次コスト: ${fmtYen(kpis.totalCost)}`,
    `- 手残り: ${fmtYen(kpis.profit)}`,
    `- 新規リード: ${kpis.leadsNew}件`,
    `- 要対応アラート: ${kpis.unreadCriticalAlerts}件`,
    `- ダウン中サイト: ${kpis.sitesDown}件 / 全${kpis.sitesTotal}件`,
  ].join('\n')
}

export async function generateComment(apiKey: string, kpis: Kpis): Promise<string> {
  try {
    const client = new Anthropic({ apiKey })
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 200,
      messages: [{ role: 'user', content: buildPrompt(kpis) }],
    })
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('')
      .trim()
    return text
  } catch (e) {
    console.error('Claude comment generation failed:', e)
    return ''
  }
}
