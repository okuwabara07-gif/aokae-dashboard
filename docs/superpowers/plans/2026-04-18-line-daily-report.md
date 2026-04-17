# 朝夕LINEレポート実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** GitHub Actionsで朝7時/夕19時 (JST) にSupabaseデータを集計し、Claude Haiku 4.5でコメント生成してLINE Push通知を送る独立スクリプトを実装する。

**Architecture:** `.github/scripts/line-report/` 配下にNode.js (TypeScript) 独立npmプロジェクトを配置。`@supabase/supabase-js` でデータ取得 → 純関数で集計 → `@anthropic-ai/sdk` でコメント生成 → LINE Messaging API Push。GitHub Actionsの2つのcronで起動し、`MODE` 環境変数で朝/夕を切り替える。

**Tech Stack:** Node.js 20+, TypeScript, tsx, @supabase/supabase-js, @anthropic-ai/sdk, fetch (built-in), GitHub Actions

**Spec reference:** `docs/superpowers/specs/2026-04-18-line-daily-report-design.md`

**Note on testing:** specに従い単体テストは書かない（集計関数を純関数で書き、後でvitest等を追加できる構造にする）。検証は`workflow_dispatch` での手動実行で行う。

---

## File Structure

```
.github/
├── workflows/
│   └── line-report.yml          # cron + workflow_dispatch
└── scripts/
    └── line-report/
        ├── package.json         # 独立npmプロジェクト
        ├── tsconfig.json        # TS設定
        ├── README.md            # Secrets設定手順
        └── src/
            ├── types.ts         # 共通型定義
            ├── supabase.ts      # Supabaseクライアント + fetchAll
            ├── aggregate.ts     # KPI集計（純関数）
            ├── format.ts        # ¥フォーマッタ
            ├── claude.ts        # Claudeコメント生成
            ├── line.ts          # Push API呼び出し
            └── index.ts         # オーケストレーション
```

---

## Task 1: npmプロジェクトセットアップ

**Files:**
- Create: `.github/scripts/line-report/package.json`
- Create: `.github/scripts/line-report/tsconfig.json`
- Create: `.github/scripts/line-report/.gitignore`

- [ ] **Step 1: package.json作成**

```json
{
  "name": "line-report",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "tsx src/index.ts",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.39.0",
    "@supabase/supabase-js": "^2.45.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.5.0"
  }
}
```

- [ ] **Step 2: tsconfig.json作成**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "noUncheckedIndexedAccess": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: .gitignore作成**

```
node_modules/
dist/
*.log
```

- [ ] **Step 4: 依存インストールで動作確認**

Run:
```bash
cd .github/scripts/line-report && npm install
```

Expected: `node_modules/` が作成され、エラーなく完了。

- [ ] **Step 5: コミット**

```bash
git add .github/scripts/line-report/package.json \
        .github/scripts/line-report/tsconfig.json \
        .github/scripts/line-report/.gitignore \
        .github/scripts/line-report/package-lock.json
git commit -m "chore: line-report npmプロジェクト初期化"
```

---

## Task 2: 共通型定義 (types.ts)

**Files:**
- Create: `.github/scripts/line-report/src/types.ts`

- [ ] **Step 1: types.ts作成**

ダッシュボード本体（`app/page.tsx` line 7-11）と同じ型を移植。

```typescript
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
```

- [ ] **Step 2: 型チェック**

Run:
```bash
cd .github/scripts/line-report && npm run typecheck
```

Expected: エラーなし。

- [ ] **Step 3: コミット**

```bash
git add .github/scripts/line-report/src/types.ts
git commit -m "feat: line-report 共通型定義追加"
```

---

## Task 3: フォーマッタ (format.ts)

**Files:**
- Create: `.github/scripts/line-report/src/format.ts`

ダッシュボード本体の`fmt`関数（`app/page.tsx` line 17）を移植。

- [ ] **Step 1: format.ts作成**

```typescript
export function fmtYen(n: number): string {
  if (n >= 10000) return `¥${Math.round(n / 10000)}万`
  return `¥${n.toLocaleString('ja-JP')}`
}

export function jstDateLabel(date = new Date()): string {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000)
  return `${jst.getUTCMonth() + 1}/${jst.getUTCDate()}`
}

export function jstMonth(date = new Date()): string {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000)
  const y = jst.getUTCFullYear()
  const m = String(jst.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}
```

- [ ] **Step 2: 型チェック**

Run: `cd .github/scripts/line-report && npm run typecheck`
Expected: エラーなし。

- [ ] **Step 3: コミット**

```bash
git add .github/scripts/line-report/src/format.ts
git commit -m "feat: line-report フォーマッタ追加"
```

---

## Task 4: 集計ロジック (aggregate.ts)

**Files:**
- Create: `.github/scripts/line-report/src/aggregate.ts`

ダッシュボード本体（`app/page.tsx` line 71-83）と同じ計算を純関数として移植。

- [ ] **Step 1: aggregate.ts作成**

```typescript
import type { RawData, Kpis } from './types.js'
import { jstMonth } from './format.js'

const TARGET_DIGITAL_REVENUE = 300_000

export function aggregate(data: RawData): Kpis {
  const currentMonth = jstMonth()

  const revThisMonth = data.revenues.filter(r => r.month === currentMonth)
  const costThisMonth = data.costs.filter(c => c.month === currentMonth)

  const totalRevenue = revThisMonth.reduce((a, r) => a + r.amount, 0)
  const digitalRevenue = revThisMonth
    .filter(r => r.product !== 'kirei')
    .reduce((a, r) => a + r.amount, 0)
  const totalCost = costThisMonth.reduce((a, c) => a + c.amount, 0)
  const profit = totalRevenue - totalCost
  const targetProgress = Math.min(
    100,
    Math.round((digitalRevenue / TARGET_DIGITAL_REVENUE) * 100),
  )

  const sitesDown = data.sites.filter(s => s.status === 'down').length
  const leadsNew = data.leads.filter(l => l.status === 'new').length
  const unreadCriticalAlerts = data.alerts.filter(
    a => !a.is_read && a.severity === 'critical',
  ).length

  return {
    digitalRevenue,
    totalRevenue,
    totalCost,
    profit,
    targetProgress,
    sitesDown,
    sitesTotal: data.sites.length,
    leadsNew,
    unreadCriticalAlerts,
    currentMonth,
  }
}
```

- [ ] **Step 2: 型チェック**

Run: `cd .github/scripts/line-report && npm run typecheck`
Expected: エラーなし。

- [ ] **Step 3: コミット**

```bash
git add .github/scripts/line-report/src/aggregate.ts
git commit -m "feat: line-report KPI集計ロジック追加"
```

---

## Task 5: Supabaseクライアント (supabase.ts)

**Files:**
- Create: `.github/scripts/line-report/src/supabase.ts`

- [ ] **Step 1: supabase.ts作成**

```typescript
import { createClient } from '@supabase/supabase-js'
import type { RawData, Revenue, Cost, SiteHealth, Lead, Alert } from './types.js'

export function createSupabaseClient(url: string, anonKey: string) {
  return createClient(url, anonKey, {
    auth: { persistSession: false },
  })
}

export async function fetchAll(
  client: ReturnType<typeof createSupabaseClient>,
): Promise<RawData> {
  const [r, c, s, l, a] = await Promise.all([
    client.from('revenues').select('*').order('month', { ascending: false }),
    client.from('costs').select('*').order('month', { ascending: false }),
    client.from('site_health').select('*').order('checked_at', { ascending: false }),
    client.from('leads').select('*').order('created_at', { ascending: false }),
    client.from('alerts').select('*').order('created_at', { ascending: false }),
  ])

  for (const [name, res] of [
    ['revenues', r],
    ['costs', c],
    ['site_health', s],
    ['leads', l],
    ['alerts', a],
  ] as const) {
    if (res.error) throw new Error(`Supabase fetch failed (${name}): ${res.error.message}`)
  }

  return {
    revenues: (r.data ?? []) as Revenue[],
    costs: (c.data ?? []) as Cost[],
    sites: (s.data ?? []) as SiteHealth[],
    leads: (l.data ?? []) as Lead[],
    alerts: (a.data ?? []) as Alert[],
  }
}
```

- [ ] **Step 2: 型チェック**

Run: `cd .github/scripts/line-report && npm run typecheck`
Expected: エラーなし。

- [ ] **Step 3: コミット**

```bash
git add .github/scripts/line-report/src/supabase.ts
git commit -m "feat: line-report Supabaseフェッチ層追加"
```

---

## Task 6: Claudeコメント生成 (claude.ts)

**Files:**
- Create: `.github/scripts/line-report/src/claude.ts`

specに従いClaude Haiku 4.5で150字以内のコメントを生成。失敗時は空文字を返してレポート本体は送信できるようにする。

- [ ] **Step 1: claude.ts作成**

```typescript
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
```

- [ ] **Step 2: 型チェック**

Run: `cd .github/scripts/line-report && npm run typecheck`
Expected: エラーなし。

- [ ] **Step 3: コミット**

```bash
git add .github/scripts/line-report/src/claude.ts
git commit -m "feat: line-report Claudeコメント生成追加"
```

---

## Task 7: LINE Push API (line.ts)

**Files:**
- Create: `.github/scripts/line-report/src/line.ts`

メッセージ組み立てとPush API呼び出し。成功通知と失敗通知の2関数を持つ。

- [ ] **Step 1: line.ts作成**

```typescript
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
```

- [ ] **Step 2: 型チェック**

Run: `cd .github/scripts/line-report && npm run typecheck`
Expected: エラーなし。

- [ ] **Step 3: コミット**

```bash
git add .github/scripts/line-report/src/line.ts
git commit -m "feat: line-report LINE Push APIクライアント追加"
```

---

## Task 8: オーケストレーション (index.ts)

**Files:**
- Create: `.github/scripts/line-report/src/index.ts`

環境変数読み込み、各モジュールの呼び出し、二重catchによるエラーハンドリング。

- [ ] **Step 1: index.ts作成**

```typescript
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
```

- [ ] **Step 2: 型チェック**

Run: `cd .github/scripts/line-report && npm run typecheck`
Expected: エラーなし。

- [ ] **Step 3: コミット**

```bash
git add .github/scripts/line-report/src/index.ts
git commit -m "feat: line-report オーケストレータ追加"
```

---

## Task 9: GitHub Actionsワークフロー

**Files:**
- Create: `.github/workflows/line-report.yml`

cron時刻はUTC基準: 朝7:00 JST = 22:00 UTC、夕19:00 JST = 10:00 UTC。`github.event.schedule`を見てMODEを切り替える。

- [ ] **Step 1: line-report.yml作成**

```yaml
name: LINE Daily Report

on:
  schedule:
    - cron: '0 22 * * *'  # 07:00 JST (morning)
    - cron: '0 10 * * *'  # 19:00 JST (evening)
  workflow_dispatch:
    inputs:
      mode:
        description: 'Report mode'
        type: choice
        options: [morning, evening]
        default: morning

concurrency:
  group: line-report-${{ github.event.schedule || github.event.inputs.mode }}
  cancel-in-progress: false

jobs:
  send-report:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    defaults:
      run:
        working-directory: .github/scripts/line-report
    env:
      TZ: Asia/Tokyo
      MODE: >-
        ${{
          github.event.schedule == '0 22 * * *' && 'morning' ||
          github.event.schedule == '0 10 * * *' && 'evening' ||
          github.event.inputs.mode
        }}
      SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
      SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      LINE_CHANNEL_ACCESS_TOKEN: ${{ secrets.LINE_CHANNEL_ACCESS_TOKEN }}
      LINE_USER_ID: ${{ secrets.LINE_USER_ID }}
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: .github/scripts/line-report/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Send report
        run: npm start
```

- [ ] **Step 2: YAML構文確認**

Run:
```bash
cd /Users/educatorspi/Downloads/aokae-dashboard && \
  python3 -c "import yaml; yaml.safe_load(open('.github/workflows/line-report.yml'))"
```

Expected: エラーなし（出力なし）。

- [ ] **Step 3: コミット**

```bash
git add .github/workflows/line-report.yml
git commit -m "ci: 朝夕LINEレポートワークフロー追加"
```

---

## Task 10: README (Secrets設定手順)

**Files:**
- Create: `.github/scripts/line-report/README.md`

- [ ] **Step 1: README.md作成**

````markdown
# LINE Daily Report

朝7時/夕19時 (JST) にAOKAE DashboardのKPIをLINEへ通知するスクリプト。
GitHub Actionsの`schedule`で起動される。

## 必要なGitHub Secrets

リポジトリの Settings → Secrets and variables → Actions で以下を登録する。

| 名前 | 取得方法 |
|---|---|
| `SUPABASE_URL` | Supabase Dashboard → Project Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | 同上 → Project API keys → `anon public` |
| `ANTHROPIC_API_KEY` | https://console.anthropic.com/settings/keys |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Developers → Messaging APIチャネル → Channel access token (long-lived) |
| `LINE_USER_ID` | LINE Developers → Basic settings → Your user ID |

## ローカル実行

```bash
cd .github/scripts/line-report
npm install
TZ=Asia/Tokyo MODE=morning \
  SUPABASE_URL=... SUPABASE_ANON_KEY=... \
  ANTHROPIC_API_KEY=... \
  LINE_CHANNEL_ACCESS_TOKEN=... LINE_USER_ID=... \
  npm start
```

## 手動トリガー

GitHub → Actions → `LINE Daily Report` → Run workflow から `morning` / `evening` を選んで実行可能。

## スケジュール

| Cron (UTC) | JST | MODE |
|---|---|---|
| `0 22 * * *` | 07:00 | morning |
| `0 10 * * *` | 19:00 | evening |

## トラブルシューティング

- 失敗時は `⚠️ {mode}レポート生成失敗: ...` がLINEに届く（届かない場合はGitHub Actionsログを確認）
- LINE Push API側の通知が来なくなったら `LINE_CHANNEL_ACCESS_TOKEN` の有効期限を確認
- Supabase RLSが有効な場合、anon keyで読み取り可能なポリシーが必要
````

- [ ] **Step 2: コミット**

```bash
git add .github/scripts/line-report/README.md
git commit -m "docs: line-report README追加"
```

---

## Task 11: 統合確認

GitHub Secretsを設定した上で、`workflow_dispatch`で手動実行して動作確認する。

- [ ] **Step 1: Secretsを5つ全てGitHubに登録**

リポジトリ → Settings → Secrets and variables → Actions → New repository secret を5回。
（READMEの表を参照）

- [ ] **Step 2: ワークフローを手動実行**

GitHub → Actions → `LINE Daily Report` → Run workflow → mode=`morning` で実行。

- [ ] **Step 3: 動作確認**

期待される結果:
- ジョブが3分以内に成功
- LINEに `🌅 AOKAE朝レポート (M/D)...` のメッセージが届く
- メッセージ末尾に `💬 ...` のClaudeコメントが含まれる

失敗時:
- LINEに `⚠️ morningレポート生成失敗: ...` が届く
- → GitHub Actionsログを開いてエラー詳細を確認

- [ ] **Step 4: evening modeも同じ手順で確認**

mode=`evening` で再実行 → `🌙 AOKAE夕レポート` で届くこと。

---

## 完了基準

- [ ] `.github/workflows/line-report.yml` がpush済み
- [ ] `.github/scripts/line-report/` 配下のソース・package-lock.jsonがpush済み
- [ ] GitHub Secrets 5件登録済み
- [ ] `workflow_dispatch` で morning / evening 両方とも成功確認済み
- [ ] 翌朝7:00 JST / 翌夕19:00 JST に自動配信されることを確認

---

## 補足: 後から拡張する場合

- **テスト追加:** `aggregate.ts` は純関数。`vitest`を入れて `tests/aggregate.test.ts` から呼べばすぐテスト可能
- **Flex Message化:** `line.ts:buildReportMessage` を Flex Message JSON 生成に差し替え、`pushText`の `messages` を `[{ type: 'flex', altText, contents }]` に変更
- **朝夕で内容差別化:** `index.ts` で `mode` を `aggregate` に渡し、KPIを切り替え
