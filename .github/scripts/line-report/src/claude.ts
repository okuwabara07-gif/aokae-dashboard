import Anthropic from '@anthropic-ai/sdk'
import type { Kpis, Mode } from './types.js'
import { fmtYen } from './format.js'

const MODEL = 'claude-haiku-4-5-20251001'

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*/g, '')
    .replace(/__/g, '')
    .replace(/`+/g, '')
    .trim()
}

function summarize(kpis: Kpis): string {
  const p = kpis.products
  return [
    `- デジタル月収: ${fmtYen(kpis.digitalRevenue)} / ¥300,000 (${kpis.targetProgress}%)`,
    `- 月次コスト: ${fmtYen(kpis.totalCost)}`,
    `- 手残り: ${fmtYen(kpis.profit)}`,
    `- 新規リード: ${kpis.leadsNew}件 / 要対応アラート: ${kpis.unreadCriticalAlerts}件`,
    `- SalonRink: 登録店舗${p.salonrink.stores} / 新規リード${p.salonrink.newLeads}`,
    `- soccer-kanto: チーム${p.soccer.teams ?? '?'}件`,
    `- アフィリエイト: 稼働${p.affiliate.active}/全${p.affiliate.total}, 記事あり${p.affiliate.withArticles}`,
    `- インフラ: Vercel ${kpis.infra.vercelDown}件DOWN / ${kpis.infra.vercelTotal}件, GH Actions 直近失敗${kpis.infra.actionsFailure}件`,
  ].join('\n')
}

function buildCommentPrompt(kpis: Kpis): string {
  return [
    'あなたはAOKAE LLCの経営アシスタントです。',
    '以下のKPIを見て、オーナーへの一言コメントを120字以内で生成してください。',
    '数字の繰り返しは不要、行動につながる示唆を1つ含めてください。',
    'Markdown記号（**や__）は使わないでください。プレーンテキストで出力してください。',
    '',
    summarize(kpis),
  ].join('\n')
}

function buildTasksPrompt(kpis: Kpis, mode: Mode): string {
  const frame =
    mode === 'morning'
      ? '朝のレポートなので、今日この後に着手すべき具体的なアクションを3つ挙げてください。'
      : '夕方のレポートなので、今日の振り返りと明日朝に着手すべき具体的なアクションを3つ挙げてください。'
  return [
    'あなたはAOKAE LLCの経営アシスタントです。',
    frame,
    '出力形式は厳守してください：',
    '1. {アクション}',
    '2. {アクション}',
    '3. {アクション}',
    '各行40字以内。理由・前置き・締めの文は不要。番号とアクションのみ。',
    'Markdown記号（**や__）は使わないでください。',
    '',
    summarize(kpis),
  ].join('\n')
}

async function callClaude(apiKey: string, prompt: string, maxTokens: number): Promise<string> {
  const client = new Anthropic({ apiKey })
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  })
  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')
  return stripMarkdown(text)
}

export async function generateComment(apiKey: string, kpis: Kpis): Promise<string> {
  try {
    return await callClaude(apiKey, buildCommentPrompt(kpis), 200)
  } catch (e) {
    console.error('Claude comment generation failed:', e)
    return ''
  }
}

export async function generateTodayTasks(
  apiKey: string,
  kpis: Kpis,
  mode: Mode,
): Promise<string[]> {
  try {
    const raw = await callClaude(apiKey, buildTasksPrompt(kpis, mode), 300)
    const lines = raw
      .split('\n')
      .map(l => l.trim())
      .filter(l => /^\d[.)、]/.test(l))
      .map(l => l.replace(/^\d[.)、]\s*/, '').trim())
      .filter(l => l.length > 0)
    return lines.slice(0, 3)
  } catch (e) {
    console.error('Claude task generation failed:', e)
    return []
  }
}
