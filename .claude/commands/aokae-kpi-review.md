---
description: AOKAE全事業のKPIを取得→異常検知→打ち手提案まで実行（朝夕LINEレポートの深堀り版）
---

# /aokae-kpi-review

AOKAE LLCの全事業のKPIをSupabaseから取得し、異常値を検出して打ち手を提案する。

## 実行手順

1. **環境変数の確認**
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY` が `.env` または shell に設定されているか確認
   - `SUPABASE_SOCCER_URL`, `SUPABASE_SOCCER_ANON_KEY` も（soccer-tokyo分）
   - 未設定なら該当セクションをスキップしてユーザーに通知

2. **データ取得**
   - 本体Supabase: `revenues`, `costs`, `site_health`, `leads`, `alerts`, `affiliate_sites`
   - soccer Supabase: `teams` の行数 / `users.plan='premium'` の行数
   - 今月と先月のデータを取得して比較可能にする

3. **集計**
   - デジタル月収（kirei以外の合算）、月次コスト、手残り、目標進捗率（¥300,000基準）
   - プロダクト別KPI:
     - SalonRink: 登録店舗 (`leads.status='converted'`) / 新規リード (`status='new'`)
     - affiliate: 稼働サイト数 / 記事あり数
     - soccer-tokyo: チーム数 / プレミアム会員数
   - サイト稼働状況、未読criticalアラート数

4. **異常検知**
   以下を「⚠️」として別枠で示す:
   - 前月比で売上-20%超のプロダクト
   - 7日以上静止している新規リード
   - 3日以上DOWNが続くサイト
   - 未読critical アラートが1件以上
   - コスト急増（前月比+30%超）

5. **打ち手提案**
   検出した各異常ごとに、30分以内で着手できる具体アクションを1つ提案する。

## 出力フォーマット

```
📊 AOKAE KPI レビュー (YYYY/MM/DD)
━━━━━━━━━━━━━━
【サマリー】
デジタル月収 / 目標進捗
手残り / 前月比

【プロダクト別】
各プロダクトの主要指標 + 前月比

【⚠️ 異常検知】
- 項目: 数値
  → 打ち手: 具体アクション

【💡 今日のTOP3】
1. ...
2. ...
3. ...
```

## 引数

`$ARGUMENTS` に `--month YYYY-MM` を受け付けて対象月を指定可能（省略時は当月）。

## 注意

- 売上数値は**読み取り専用**で扱う。勝手に書き込まない
- `soccer-tokyo` のSupabase取得失敗時は「取得失敗」と明記してサマリーは続行
- 必要なら `.github/scripts/line-report/src/aggregate.ts` の集計ロジックを流用
