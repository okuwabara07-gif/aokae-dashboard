import { createSupabaseClient, fetchAll } from './supabase.js'
import { aggregate } from './aggregate.js'
import { generateComment } from './claude.js'
import { pushReport, pushFailureNotice } from './line.js'
import type { Mode } from './types.js'

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing required env: ${name}`)
  return v
}

function parseMode(raw: string | undefined): Mode {
  if (raw === 'morning' || raw === 'evening') return raw
  throw new Error(`Invalid MODE: ${raw}. Expected 'morning' or 'evening'.`)
}

async function main() {
  const mode = parseMode(process.env.MODE)
  const supabaseUrl = requireEnv('SUPABASE_URL')
  const supabaseKey = requireEnv('SUPABASE_ANON_KEY')
  const anthropicKey = requireEnv('ANTHROPIC_API_KEY')
  const lineToken = requireEnv('LINE_CHANNEL_ACCESS_TOKEN')
  const lineUserId = requireEnv('LINE_USER_ID')

  const supabase = createSupabaseClient(supabaseUrl, supabaseKey)
  const raw = await fetchAll(supabase)
  const kpis = aggregate(raw)
  const comment = await generateComment(anthropicKey, kpis)
  await pushReport({ token: lineToken, userId: lineUserId }, mode, kpis, comment)

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
