---
description: LINEへアドホック配信（キャンペーン・お知らせ・手動レポート）を送信する。朝夕の定期レポートとは別系統
---

# /line-broadcast

キャンペーン告知や重要なお知らせをLINEにPush送信する。

## 前提

- 環境変数: `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_USER_ID`
- 送信先は **オーナー個人**（`LINE_USER_ID`）。顧客への一斉配信はLINE公式アカウント側で運用
- 実装: `.github/scripts/line-report/src/line.ts` の `pushText` / `buildReportMessage` を流用

## 実行手順

1. **配信目的の確認**
   `$ARGUMENTS` で種別を受け取る。なければ対話で聞く:
   - `alert` - 緊急通知（サイト障害、支払い失敗など）
   - `campaign` - キャンペーン開始/終了通知
   - `reminder` - タスクリマインダー
   - `announce` - その他のお知らせ
   - `custom` - 自由入力

2. **本文作成**
   - 短く（LINE表示で切れないよう200字以内推奨）
   - **Markdownは使わない**（`**` `__` 等は効かない）
   - 先頭に絵文字1つ（種別により: 🔴/📣/⏰/📌）
   - 末尾にCTA（URLやアクション）があれば入れる
   - 本文案をユーザーに見せて確認してから送信

3. **プレビュー**
   送信前に以下を表示:
   ```
   📨 送信内容プレビュー
   ━━━━━━━━━━━━━━
   {本文}
   ━━━━━━━━━━━━━━
   送信先: LINE_USER_ID (本人)
   この内容で送信しますか? [y/N]
   ```

4. **送信**
   ユーザーが `y` を返したら送信:
   - 既存の `pushText()` を呼び出す
   - 成功/失敗をクリアに報告

## 引数例

```
/line-broadcast alert "site kirei.com DOWN 検知 - 3分前から"
/line-broadcast campaign "SalonRink 春キャンペーン開始 → https://..."
/line-broadcast reminder "明日 14:00 打ち合わせ"
/line-broadcast custom "..."
```

## 安全ガード

- **自動送信しない**。必ずユーザーの最終確認 (y/N) を経る
- スパム防止: 同じ内容を5分以内に再送しようとしたら警告
- 送信前に**必ず本文にPIIが含まれていないか**確認
- `LINE_CHANNEL_ACCESS_TOKEN` を標準出力にprintしない
- 顧客向け一斉配信には使わない（本コマンドはオーナー向け専用）

## 代替手段

一斉配信（複数ユーザー）や予約送信が必要な場合:
- LINE公式アカウント管理画面から手動操作
- Messaging API の `multicast` を使う別スクリプトを作る（本コマンドの責務外）

## コスト

- LINE Messaging API (Free tier): 500メッセージ/月まで無料
- オーナー通知だけなら月100通未満 → 無料枠で充分
