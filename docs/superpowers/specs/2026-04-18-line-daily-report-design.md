# 朝夕LINEレポート設計 (2026-04-18)

## 目的

AOKAE Dashboardの主要KPIを毎日2回（朝7時/夕19時 JST）にLINEへPush通知する。
ダッシュボードを開かなくても進捗・障害・要対応を把握できる状態を作る。

## 全体構成

GitHub Actionsの`schedule`トリガーでNode.js (TypeScript)スクリプトを実行する。Next.jsアプリ本体（Vercel運用）とは依存を分離するため、`.github/scripts/line-report/`配下に独立したnpmプロジェクトとして配置する。

```
.github/
├── workflows/
│   └── line-report.yml
└── scripts/
    └── line-report/
        ├── package.json
        ├── tsconfig.json
        └── src/
            ├── index.ts
            ├── supabase.ts
            ├── aggregate.ts
            ├── claude.ts
            └── line.ts
```

### 各ファイルの責務

| ファイル | 責務 | 依存 |
|---|---|---|
| `index.ts` | エントリポイント。`MODE`環境変数（morning/evening）で起動。例外をcatchして失敗通知→exit 1 | 全モジュール |
| `supabase.ts` | 5テーブル（revenues / costs / site_health / leads / alerts）取得 | `@supabase/supabase-js` |
| `aggregate.ts` | 集計ロジック（ダッシュボード本体`app/page.tsx`と同等の計算） | なし（純関数） |
| `claude.ts` | 集計値をプロンプトに含めて150字以内のコメント生成 | `@anthropic-ai/sdk` |
| `line.ts` | Push API呼び出し。成功通知用と失敗通知用の2関数を持つ | `node:fetch`（標準） |

## スケジュール

GitHub ActionsのcronはUTC基準。

- 朝7:00 JST = **22:00 UTC**（前日）
- 夕19:00 JST = **10:00 UTC**

```yaml
on:
  schedule:
    - cron: '0 22 * * *'  # 07:00 JST
    - cron: '0 10 * * *'  # 19:00 JST
  workflow_dispatch:       # 手動実行も可
    inputs:
      mode:
        type: choice
        options: [morning, evening]
        default: morning
```

ワークフロー内で`github.event.schedule`を見て`MODE`環境変数を切り替える（`'0 22 * * *'`なら`morning`、`'0 10 * * *'`なら`evening`）。`workflow_dispatch`時は`inputs.mode`を使用。

## データフロー

```
[GitHub Actions cron]
    ↓ MODE=morning|evening
[index.ts]
    ↓
[supabase.ts] → 5テーブル並列取得
    ↓ 生データ
[aggregate.ts] → 集計値オブジェクト
    ↓
[claude.ts] → Claude Haiku 4.5に渡しコメント生成
    ↓ コメント文字列
[line.ts] → メッセージ組み立て → Push API
    ↓
[LINE通知]
```

## 集計ロジック

ダッシュボード本体（`app/page.tsx` line 71-83）と同じ計算を移植する。

| 指標 | 計算式 |
|---|---|
| `digitalRevenue` | 今月の`revenues`から`product !== 'kirei'`の`amount`合計 |
| `totalCost` | 今月の`costs.amount`合計 |
| `profit` | `digitalRevenue + kireiRevenue - totalCost` |
| `targetProgress` | `min(100, round(digitalRevenue / 300000 * 100))` |
| `sitesDown` | `site_health`から最新ステータスが`down`のサイト数 |
| `leadsNew` | `leads`から`status === 'new'`の件数 |
| `unreadAlerts` | `alerts`から`!is_read && severity === 'critical'`の件数 |

「今月」は`new Date().toISOString().slice(0,7)`（`YYYY-MM`形式）。スクリプトは`TZ=Asia/Tokyo`環境変数を立てて実行し、JST基準で月境界を判定する。

## Claudeプロンプト

Haiku 4.5（`claude-haiku-4-5-20251001`）を使用。コスト最小化のため`max_tokens=200`程度。

```
あなたはAOKAE LLCの経営アシスタントです。以下の今日のKPIを見て、
オーナーへの一言コメントを150字以内で生成してください。
数字の繰り返しは不要、行動につながる示唆を1つ含めてください。

- デジタル月収: ¥XXX,XXX / ¥300,000 (XX%)
- 月次コスト: ¥X,XXX
- 手残り: ¥XXX,XXX
- 新規リード: X件
- 要対応アラート: X件
- ダウン中サイト: X件 / 全Y件
```

## メッセージ形式

LINE Messaging APIの`text`タイプ（Flex Messageは過剰）。

朝の例:
```
🌅 AOKAE朝レポート (4/18)

💰 デジタル月収: ¥12万 / ¥30万 (40%)
💸 月次コスト: ¥3,200
📈 手残り: ¥11.7万

🔔 要対応: 2件
🌐 サイト: 全107件正常
📩 新規リード: 5件

💬 目標まで¥18万。リード5件のアプローチで月末挽回可能。
```

夕の例は冒頭が`🌙 AOKAE夕レポート`に変わるだけで内容は同一。

## 失敗時の挙動

`index.ts`のtry-catchで全例外を捕捉:

```ts
try {
  await main()
} catch (e) {
  try {
    await sendFailureNotice(`${MODE}レポート生成失敗: ${e.message}`)
  } catch (notifyErr) {
    console.error('Failed to send failure notice:', notifyErr)
  }
  process.exit(1)
}
```

`sendFailureNotice`もLINE Push APIで送信する。失敗通知自体が失敗した場合はconsole.errorでActionsログに残しexit 1（二重catchで通知ループ防止）。

## Secrets

GitHub repository secretsに以下を登録:

| Secret | 用途 |
|---|---|
| `SUPABASE_URL` | Supabaseプロジェクト URL |
| `SUPABASE_ANON_KEY` | Supabase anon key（読み取りのみのためRLS依存で十分） |
| `ANTHROPIC_API_KEY` | Claude API key |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Messaging APIチャネルアクセストークン |
| `LINE_USER_ID` | 通知先ユーザーID（自分のID） |

## エラーハンドリング・エッジケース

- Supabaseがタイムアウト → catch → 失敗通知
- Claude API失敗 → コメントを空文字にしてレポート本体は送信（数字は届く）
- 今月のrevenue/costが0件 → `0円`表示で正常送信
- LINE Push失敗 → exit 1（GitHub Actionsログで確認）

## テスト方針

- 単体テストは書かない（純集計ロジックのみで、コスト対効果が薄い）
- `workflow_dispatch`での手動実行を初回検証手段とする
- 集計関数は`aggregate.ts`を純関数で書き、必要になったら後で`vitest`等を追加できる構造にしておく

## YAGNI（含めないもの）

- リトライ機構（cronなので次回実行で復旧する）
- メトリクス・ダッシュボード（GitHub Actionsの実行履歴で十分）
- 複数ユーザー対応（Multicast）
- 朝夕でメッセージ差別化
- Flex Message
- 単体テストフレームワーク

## 実装順序（次フェーズ）

writing-plansスキルで詳細化するが、大枠は以下:

1. `package.json` / `tsconfig.json` セットアップ
2. `supabase.ts`（型定義 + fetch）
3. `aggregate.ts`（純関数）
4. `claude.ts`（プロンプト + SDK呼び出し）
5. `line.ts`（Push API + 失敗通知）
6. `index.ts`（オーケストレーション + try-catch）
7. `line-report.yml` ワークフロー
8. README（Secrets設定手順）
