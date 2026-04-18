# LINE Daily Report

朝7時/夕19時 (JST) にAOKAE DashboardのKPIをLINEへ通知するスクリプト。
GitHub Actionsの`schedule`で起動される。

## 必要なGitHub Secrets

リポジトリの Settings → Secrets and variables → Actions で以下を登録する。

| 名前 | 取得方法 |
|---|---|
| `SUPABASE_URL` | Supabase Dashboard → Project Settings → API → Project URL (aokae-dashboard本体) |
| `SUPABASE_ANON_KEY` | 同上 → Project API keys → `anon public` |
| `SUPABASE_SOCCER_URL` | soccer-tokyo用Supabase (project: bhgvpikwhbphodswzfip) の Project URL |
| `SUPABASE_SOCCER_ANON_KEY` | 同上の `anon public` キー |
| `ANTHROPIC_API_KEY` | https://console.anthropic.com/settings/keys |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Developers → Messaging APIチャネル → Channel access token (long-lived) |
| `LINE_USER_ID` | LINE Developers → Basic settings → Your user ID |

`GITHUB_TOKEN` と `GITHUB_REPOSITORY` はGitHub Actionsランナーで自動供給される。ローカル実行時はPATを設定する。

`SUPABASE_SOCCER_*` / `GITHUB_TOKEN` は未設定でもレポートは動作し、該当セクションが「取得失敗 / 未設定」と表示される。

## ローカル実行

```bash
cd .github/scripts/line-report
npm install
TZ=Asia/Tokyo MODE=morning \
  SUPABASE_URL=... SUPABASE_ANON_KEY=... \
  SUPABASE_SOCCER_URL=... SUPABASE_SOCCER_ANON_KEY=... \
  ANTHROPIC_API_KEY=... \
  LINE_CHANNEL_ACCESS_TOKEN=... LINE_USER_ID=... \
  GITHUB_TOKEN=... GITHUB_REPOSITORY=owner/repo \
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
