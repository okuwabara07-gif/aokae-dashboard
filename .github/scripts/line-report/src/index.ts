import { createSupabaseClient, fetchAll, fetchSoccer } from './supabase.js'
import { aggregate } from './aggregate.js'
import { generateComment, generateTodayTasks } from './claude.js'
import { pushReport, pushFailureNotice } from './line.js'
import { fetchRecentRuns } from './github.js'
import type { Mode, SoccerKpis, GithubRun } from './types.js'

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing required env: ${name}`)
  return v
}

function parseMode(raw: string | undefined): Mode {
  if (raw === 'morning' || raw === 'evening') return raw
  throw new Error(`Invalid MODE: ${raw}. Expected 'morning' or 'evening'.`)
}

async function loadSoccer(): Promise<SoccerKpis> {
  const url = process.env.SUPABASE_SOCCER_URL
  const key = process.env.SUPABASE_SOCCER_ANON_KEY
  if (!url || !key) {
    return { teams: null, premiumMembers: null, error: 'env未設定' }
  }
  return fetchSoccer(url, key)
}

async function loadRuns(): Promise<{ runs: GithubRun[]; error?: string }> {
  const token = process.env.GITHUB_TOKEN
  const repo = process.env.GITHUB_REPOSITORY
  if (!token || !repo) {
    return { runs: [], error: 'GITHUB_TOKEN/REPOSITORY未設定' }
  }
  try {
    return { runs: await fetchRecentRuns(repo, token, 20) }
  } catch (e) {
    return { runs: [], error: e instanceof Error ? e.message : String(e) }
  }
}

async function main() {
  const mode = parseMode(process.env.MODE)
  const supabaseUrl = requireEnv('SUPABASE_URL')
  const supabaseKey = requireEnv('SUPABASE_ANON_KEY')
  const anthropicKey = requireEnv('ANTHROPIC_API_KEY')
  const lineToken = requireEnv('LINE_CHANNEL_ACCESS_TOKEN')
  const lineUserId = requireEnv('LINE_USER_ID')

  const supabase = createSupabaseClient(supabaseUrl, supabaseKey)

  const [raw, soccer, runsResult] = await Promise.all([
    fetchAll(supabase),
    loadSoccer(),
    loadRuns(),
  ])

  const kpis = aggregate(raw, soccer, runsResult.runs, runsResult.error)

  const [comment, tasks] = await Promise.all([
    generateComment(anthropicKey, kpis),
    generateTodayTasks(anthropicKey, kpis, mode),
  ])

  await pushReport({ token: lineToken, userId: lineUserId }, mode, kpis, comment, tasks)

  console.log(`[${mode}] report sent successfully.`)
}

main().catch(async err => {
  const message = err instanceof Error ? err.message : String(err)
  console.error('Report generation failed:', err)

  const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
  const lineUserId = process.env.LINE_USER_ID
  const mode = process.env.MODE ?? 'unknown'

  if (lineToken && lineUserId) {
    try {
      await pushFailureNotice(
        { token: lineToken, userId: lineUserId },
        `${mode}レポート生成失敗: ${message}`,
      )
    } catch (notifyErr) {
      console.error('Failed to send failure notice:', notifyErr)
    }
  }
  process.exit(1)
})
