---
description: COLORPASSのMVP（認証/DB/UI）をゼロから立ち上げるためのテンプレ生成
---

# /colorpass-mvp-scaffold

COLORPASSの初期セットアップを対話的に進める。現状「準備中」ステータスなので、最初に走らせるコマンド想定。

## 前提

- COLORPASS は「カラーリスト（美容師）と顧客をつなぐパーソナルカラー診断 + 提案サービス」という前提で設計
- Next.js + Supabase + Vercel スタック（aokae-dashboardと同じ）
- 独立リポジトリ or dashboard内のサブアプリか、最初に確認

## 実行手順

1. **配置先の決定**
   対話で確認:
   - A: 新規リポジトリとして作成（`colorpass` 独立）
   - B: `aokae-dashboard` 内の `apps/colorpass/` として monorepo 化
   - C: 既存ディレクトリに追加（指定パス）

2. **コアコンセプトの確認**
   ユーザーに以下を聞く（既に決まっているなら飛ばす）:
   - ターゲットユーザー: (カラーリスト / 顧客 / 両方)
   - 課金モデル: (月額 / 従量 / 無料)
   - 主要機能TOP3

3. **Supabaseスキーマ設計**
   MVPとして最低限のテーブル:
   ```sql
   -- users は auth.users を参照
   profiles (
     user_id uuid PK references auth.users,
     role text check (role in ('colorist','customer')),
     display_name text,
     created_at timestamptz default now()
   )

   color_analyses (
     id uuid PK,
     customer_id uuid references profiles,
     colorist_id uuid references profiles,
     season text,   -- spring/summer/autumn/winter
     undertone text,
     palette jsonb,
     notes text,
     created_at timestamptz default now()
   )

   recommendations (
     id uuid PK,
     analysis_id uuid references color_analyses,
     product_type text,
     product_url text,
     reason text
   )
   ```

   RLSを必ず有効化:
   - profiles: 自分の行のみSELECT/UPDATE可
   - color_analyses: customer_id=auth.uid() or colorist_id=auth.uid() のみ
   - recommendations: 関連analysisに権限がある人のみ

4. **Next.js 雛形生成**
   ```
   app/
     (auth)/
       login/page.tsx
       signup/page.tsx
     (colorist)/
       dashboard/page.tsx
       analyses/[id]/page.tsx
     (customer)/
       my-colors/page.tsx
     layout.tsx
     page.tsx  # LP
   lib/
     supabase.ts
     auth.ts
   components/
     ColorPalette.tsx
     SeasonBadge.tsx
   ```

5. **認証フロー**
   - Supabase Auth (Email + Magic Link 推奨、パスワード不要)
   - ロール切替は `profiles.role` で判定
   - ミドルウェア（`middleware.ts`）で未ログイン時リダイレクト

6. **初期コミット**
   - gitignore、README、LICENSE
   - Vercelデプロイ設定
   - `.env.example`（ただし**実値は絶対にcommitしない**）

## 引数

- `/colorpass-mvp-scaffold` - 対話で全部聞く
- `/colorpass-mvp-scaffold --standalone` - 独立リポジトリで作成
- `/colorpass-mvp-scaffold --monorepo` - dashboard内に配置

## 安全ガード

- **いきなり実装しない**。スキーマ・画面設計までをブラッシュアップしてから実装
- 既存の`aokae-dashboard`のコード規約（TypeScript strict、フォーマット）に合わせる
- 最初のPRは「scaffoldのみ、認証まで動く」の粒度に抑える
- Stripe統合などは別コマンドで（本コマンドの責務外）

## 出力

各ステップ完了後:
- 作成したファイル一覧
- 次にやるべきこと（TOP3）
- 関連するslash command（`/supabase-migrate colorpass ...` 等）
