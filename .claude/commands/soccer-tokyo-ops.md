---
description: soccer-tokyoのチーム追加、プレミアム会員動向、解約予兆の検出を行う
---

# /soccer-tokyo-ops

soccer-tokyoの運用業務を支援する。別Supabaseプロジェクト（`bhgvpikwhbphodswzfip`）を扱う。

## 前提

- 環境変数: `SUPABASE_SOCCER_URL`, `SUPABASE_SOCCER_ANON_KEY`
- 主要テーブル想定: `teams`, `users`, `matches`, `subscriptions`

## サブコマンド

`$ARGUMENTS` の第1引数で分岐:

### 1. `status` (デフォルト)
全体状況を出力:
- チーム総数 / 先月比
- プレミアム会員数 / 先月比
- 解約ユーザー数（当月）
- 新規登録数（当月）
- アクティブチーム率（直近30日に試合情報入力があるチーム / 全チーム）

### 2. `add-team`
新規チーム追加フロー:
- チーム名、代表者、エリア、カテゴリを対話で取得
- `teams` テーブルに INSERT
- 関連する初期データ（カテゴリ、招待コード等）も生成
- Slack/LINEで通知する用のテキストを生成（自動送信はしない）

### 3. `churn-risk`
解約予兆の検出:
以下の条件で「解約リスクあり」と判定:
- プレミアム会員で**直近30日ログインなし**
- プレミアム会員で**直近30日にマッチ登録/閲覧ゼロ**
- 無料→プレミアムから3ヶ月以内で活動激減
- 支払いエラー履歴あり

出力:
```
⚠️ churn risk users (N件)
━━━━━━━━━━━━━━
[1] {user_id} ({plan}) - 契約開始 YYYY-MM-DD
  - 最終ログイン: Nd前
  - マッチ閲覧: 0回 (直近30日)
  - リスクスコア: 85/100
  → 推奨アクション: 個別メッセージ、機能ガイド再送
```

### 4. `premium-conversion`
無料→プレミアム転換のヒント:
- 無料会員のうちアクティブ上位N人を抽出（直近30日のイベント数順）
- この層に対して訴求するセール/機能を提案

## 出力例 (status)

```
⚽ soccer-tokyo ステータス (YYYY/MM/DD)
━━━━━━━━━━━━━━
【総数】
- チーム: N件 (+M 先月比)
- プレミアム会員: N名 (+M 先月比)
- MRR: ¥XXX,XXX

【当月】
- 新規登録: N名
- 解約: N名
- ネット純増: N名

【稼働】
- アクティブチーム率: X% (直近30日試合登録あり)
- 平均ログイン頻度: X日に1回

【⚠️ 要対応】
- 解約リスク: N名 → /soccer-tokyo-ops churn-risk で詳細
- 支払いエラー: N件
```

## 引数例

- `/soccer-tokyo-ops` or `/soccer-tokyo-ops status`
- `/soccer-tokyo-ops add-team`
- `/soccer-tokyo-ops churn-risk`
- `/soccer-tokyo-ops premium-conversion`

## 安全ガード

- 本体dashboardとは**別のSupabaseプロジェクト**。URL/KEYを間違えない
- `subscriptions` テーブルは **読み取り専用**で扱う（決済はStripe側が正）
- 個別ユーザーへのメッセージ送信は本コマンドの責務外（案の提示まで）
- スキーマが未確定のテーブルがある場合は `list_tables` で確認してから
