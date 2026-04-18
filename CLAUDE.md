# CLAUDE.md — AOKAE Dashboard プロジェクト規約

このファイルは Claude Code が本リポジトリで作業する際の規約集。
会話冒頭で自動読み込みされる。

---

## プロジェクト概要

**AOKAE LLC** の経営ダッシュボード & 運用自動化リポジトリ。

| 資産 | 場所 | 説明 |
|---|---|---|
| スタンドアロンHTML ダッシュボード | `index.html` | 現行の公開版 (vanilla JS) |
| Next.js 移行版 (WIP) | `app/` | Recharts + Supabase - 未デプロイ |
| LINE 朝夕レポート | `.github/scripts/line-report/` | GitHub Actionsで朝7時/夕19時 JST実行 |
| Slash commands (運用支援) | `.claude/commands/` | 13個のAOKAE業務支援コマンド |

## 取り扱うビジネス

AOKAE LLC は以下5つの事業を運営:

| プロダクト | キー | 状況 |
|---|---|---|
| SalonRink | `salonrink` | 稼働中（美容サロン向けサブスク） |
| COLORPASS | `colorpass` | 準備中（パーソナルカラー診断想定） |
| soccer-tokyo | `soccer` | 稼働中（別Supabaseプロジェクト: `bhgvpikwhbphodswzfip`） |
| アフィリエイト | `affiliate` | 稼働中（複数サイト運営） |
| キレイ鶴見 | `kirei` | 個人事業、デジタル事業とは集計分離 |

プロダクトキーは `app/page.tsx` の `PRODUCT_LABEL` が正（命名変更は要注意）。

---

## コード規約

### TypeScript
- `strict: true` / `noUncheckedIndexedAccess: true` 固定
- 型は `types.ts` に集約。インライン `type` は避ける
- エラーは Error オブジェクトでthrow、stringは避ける
- `any` は原則禁止、必要なら `unknown` + narrow

### Supabase 扱い
- **anon key でブラウザから直接SELECT** する構成。機密カラムはRLSで保護
- `service_role_key` を**コードに埋めない**
- テーブル名はsnake_case、カラム名もsnake_case
- JOIN多用より複数回の単純SELECT + フロント結合を優先

### 金額フォーマット
- `fmtYen()` (`.github/scripts/line-report/src/format.ts`) に統一
- `¥10,000以上` は `¥1万` のような丸めを許可
- 小数点は使わない（整数円）

### ファイル命名
- TypeScript: kebab-case で `hoge-fuga.ts`
- React コンポーネント: PascalCase で `HogeFuga.tsx`
- 1ファイル1関心。300行超えたら分割を検討

---

## LINEレポート特有のルール

- **Markdown記号（`**`, `__`, ``` ` ```）を送信テキストに含めない** — LINEはMarkdown非対応
- 絵文字と区切り線 `━━━` でセクション分け
- メッセージは2000字以内（LINE側の分割対策）
- 失敗時は必ず `⚠️` プレフィックス付きで通知

---

## 安全ガード（すべての作業で）

1. **secrets / PII の扱い**
   - 標準出力へのprint禁止
   - commitに絶対含めない（`.env.local`, `*.pem`, 実キー）
   - `git add -A` より個別ファイル指定を優先

2. **破壊的操作**
   - DB の UPDATE/DELETE/TRUNCATE/DROP は必ずユーザー確認
   - `git push --force`、`--no-verify` は原則禁止
   - `rm -rf` / `DROP TABLE` 系はdry-runで確認後

3. **決済・顧客通知**
   - Stripe, LINE一斉送信、メール送信は**必ず最終確認を経る**
   - 本コマンドの責務外なら「責務外」と明示

---

## コミットメッセージ規約

プレフィックス: `feat:` / `fix:` / `chore:` / `docs:` / `ci:` / `refactor:` のいずれか。
日本語と英語どちらでもOK（既存は日本語多め）。

```
feat: line-report プロダクト別KPI追加

（本文は "なぜ" を1-2文で）

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

- タイトル70字以内
- 本文は**なぜ** > 何を
- `--amend` は公開後のcommitに使わない（新commit優先）

---

## コスト管理

**常にコストを自発的に明示する。**（ユーザーからの明示的な指示）

- 新機能提案時: 作成コスト + 実行時コスト + 外部API費用
- コマンド実行前: 「このコマンドで〜tokens/¥X程度」
- 定期ジョブ追加時: 月次ランニングコスト試算
- 「無料枠内」はゼロ円でも明示する

参照: `memory/feedback_always_report_cost.md`

---

## よく使うslash commands

用途別早見表（全一覧は `.claude/commands/README.md`）:

| やりたいこと | コマンド |
|---|---|
| KPIを深掘り確認 | `/aokae-kpi-review` |
| コスト削減ポイント探す | `/aokae-cost-audit` |
| 週次振り返り | `/weekly-review` |
| スキーマ変更 | `/supabase-migrate` |
| RLS監査 | `/supabase-rls-audit` |
| SalonRink リード対応 | `/salonrink-lead-ops` |
| アフィリ記事量産 | `/affiliate-article-gen` |
| デプロイ前チェック | `/vercel-deploy-check` |
| 機能shipping一貫 | `/feature-ship` |
| LINE アドホック送信 | `/line-broadcast` |

---

## 関連ドキュメント

- LINEレポート詳細: `.github/scripts/line-report/README.md`
- Slash commands一覧: `.claude/commands/README.md`
- 環境変数: `.env.example`
