---
description: Vercelデプロイ前のチェックリストを実行し、env/build/previewのsmoke testを行う
---

# /vercel-deploy-check

Vercelへデプロイする前に、失敗を未然に防ぐためのチェックリストを実行する。

## 実行手順

1. **ブランチとコミット状態**
   - `git status` でuncommitted changesを確認
   - 現在のブランチが `main` / `master` か feature branch か判定
   - 最新commitとリモートの同期状況

2. **env 確認**
   - `.env.example` を読み込み、必要な環境変数を列挙
   - Vercel Dashboard に該当環境変数がセットされているか（手動確認リストを提示）
   - ローカルの `.env.local` の値がCommit対象に入っていないか検査

   **チェック項目:**
   - [ ] `SUPABASE_URL` / `SUPABASE_ANON_KEY`
   - [ ] `ANTHROPIC_API_KEY`（サーバーサイド使用の場合）
   - [ ] `NEXT_PUBLIC_*` の先頭で始まる変数がクライアント露出OKか
   - [ ] 本番用と開発用の値が混在していないか

3. **ビルド確認（ローカル）**
   ```bash
   npm run build
   ```
   を実行し、以下をキャッチ:
   - TypeScriptエラー
   - ビルドタイムの肥大化（前回比+30%超は警告）
   - バンドルサイズ（First Load JS > 300KB は警告）
   - useClient忘れによるcompile error

4. **Lint / typecheck**
   ```bash
   npm run typecheck
   npm run lint  # あれば
   ```

5. **Preview Deploy**
   - current branchを push → Vercelがpreview自動生成
   - preview URLに対してsmoke test:
     - トップページ 200
     - 主要ルート 3つ（例: `/`, `/tab/digital`, `/tab/sites`）を叩いて200確認
     - Hydration error が console に出ていないか（Playwright MCPが使える環境なら自動化）

6. **Lighthouse (オプション)**
   `--lighthouse` フラグ時のみ:
   - Performance, Accessibility, Best Practices, SEO の4スコア
   - 前回比較（保存できるよう `.lighthouse-history.json` に記録）

## 出力フォーマット

```
🚀 Vercel デプロイチェック
━━━━━━━━━━━━━━
【Git】
✅ branch: feat/xxx
✅ up-to-date with origin

【Env】
✅ すべての必須変数が .env.example に存在
⚠️ Vercel側の設定は手動確認が必要: https://vercel.com/.../settings/environment-variables

【Build】
✅ npm run build: 成功 (42s)
✅ bundle size: 250KB (前回比 -5%)

【Lint / Type】
✅ typecheck: clean
✅ lint: clean

【Preview】
✅ https://xxx-preview.vercel.app : 200 OK
✅ / : 200
✅ /tab/digital : 200
⚠️ console.error: hydration mismatch on /tab/sites

【総合判定】
🟡 デプロイ可能だが hydration 警告あり → 修正推奨
```

## 引数

- `/vercel-deploy-check` - 基本チェック
- `/vercel-deploy-check --lighthouse` - Lighthouse含める
- `/vercel-deploy-check --fix` - 単純な問題（format, lint）は自動修正試行

## 安全ガード

- **本番deployはしない**。preview確認までが責務
- `vercel --prod` を勝手に叩かない
- secrets値を標準出力に**絶対にprintしない**（マスク必須）
- ビルドエラーが致命的なら deploy 判定を 🔴 にして STOP
