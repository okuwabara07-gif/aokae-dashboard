---
description: ブランチ作成→実装→typecheck→PR作成→LINE通知までの機能リリースフローを一気通貫で実行
---

# /feature-ship

小〜中規模の機能追加を、一貫したフローで shipping する。

## 前提

- 事前に `superpowers:brainstorming` で要件が固まっていること
- `$ARGUMENTS` or 対話で「何を作るか」の短い説明を受け取る
- 大規模な機能は `superpowers:writing-plans` → `superpowers:executing-plans` へ誘導する

## 実行手順

### 1. ブランチ戦略
- 現在のブランチを確認
- `main` にいる場合は新ブランチを切る: `feat/{short-slug}` or `fix/{slug}`
- 既にfeatureブランチにいる場合はそのまま使うか確認

### 2. 要件確認
以下を対話で固める（既に明確なら飛ばす）:
- ゴール（1文で）
- 対象ファイル（推測で洗い出す）
- Done条件（typecheck通る / 画面で動く / テスト通る / ...）
- 影響範囲（breaking changeの有無）

### 3. 実装

**注意:** 実装は**テスト駆動を優先**する。
- テストがあるプロジェクトなら: `superpowers:test-driven-development` を起動
- テストがないなら: 少なくとも typecheck と手動確認を徹底

実装中のルール:
- 不必要な抽象化は避ける
- コメントは「なぜ」のみ
- 既存のコード規約に合わせる

### 4. 検証
以下を順に実行、失敗したら止まる:
```bash
npm run typecheck
npm run lint          # あれば
npm test              # あれば
npm run build         # UIがあるなら
```

### 5. コミット
- コミットメッセージは `commit-commands:commit` の規約に従う
- 絶対に `--no-verify` を使わない
- Co-Authored-By を付ける

### 6. Push & PR
- `git push -u origin HEAD`
- `gh pr create` でPR作成
  - タイトル: 70字以内
  - 本文: Summary (3項目) + Test plan (チェックリスト)
- draftにするかは規模次第で判断

### 7. LINE通知（オプション）
`--notify` フラグが付いていたら:
- `.github/scripts/line-report/src/line.ts` の `pushText` を再利用
- メッセージ例:
  ```
  🚀 PR 作成
  {title}
  {pr_url}
  ```
- `LINE_CHANNEL_ACCESS_TOKEN` / `LINE_USER_ID` が必要

## 出力

各ステップ完了ごとにチェックマーク付きで報告:
```
🛠 feature-ship
━━━━━━━━━━━━━━
✅ ブランチ作成: feat/xxx
✅ 実装完了 (3 files changed)
✅ typecheck pass
✅ build success
✅ commit: abc1234
✅ push & PR: https://github.com/.../pull/N
✅ LINE notified (if --notify)
━━━━━━━━━━━━━━
🎯 次は PR レビュー依頼 or /vercel-deploy-check
```

## 引数

- `/feature-ship {description}` - 対話モード
- `/feature-ship --quick {desc}` - 要件確認を省略（小さい修正用）
- `/feature-ship --notify` - 完了後にLINE通知

## 安全ガード

- `main` / `master` への直接コミット絶対禁止
- `git push --force` は呼ばない
- secrets / .env.local を誤ってcommitしないよう `git status` を目視で確認させる
- typecheck / build が失敗した状態でcommitしない
- PRの本文に顧客PIIや内部的なtodoを書かない

## 関連コマンド

- 要件固め: `superpowers:brainstorming`
- 実装前の設計: `superpowers:writing-plans`
- デプロイ前チェック: `/vercel-deploy-check`
- KPIが絡む変更の効果測定: `/aokae-kpi-review`
