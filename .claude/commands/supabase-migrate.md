---
description: Supabaseのスキーマ変更migrationを生成・適用する（dashboard本体 / soccer-tokyo / 将来のCOLORPASS）
---

# /supabase-migrate

複数のSupabaseプロジェクトに対して、スキーマ変更migrationを生成・適用する。

## 実行手順

1. **対象プロジェクトの確認**
   引数 `$ARGUMENTS` もしくは対話で以下から選択:
   - `dashboard` (本体 / `SUPABASE_URL`)
   - `soccer` (soccer-tokyo / `SUPABASE_SOCCER_URL` / project: bhgvpikwhbphodswzfip)
   - `colorpass` (未構築 - 新規作成フロー)

2. **変更内容の入力**
   ユーザーから以下を聞く:
   - 変更種別 (create_table / alter_table / add_index / add_rls_policy / ...)
   - テーブル名
   - 具体的な変更内容

3. **MCP活用**
   Supabase MCPサーバーが使える場合は優先して活用:
   - `mcp__supabase__list_tables` で現状確認
   - `mcp__supabase__list_migrations` で既存migration確認
   - `mcp__supabase__apply_migration` で適用

   MCPが使えない場合は CLI (`supabase db diff`, `supabase migration new`) を手順として提示。

4. **Migrationファイル生成**
   - 命名規則: `YYYYMMDDHHMMSS_{purpose}.sql`（タイムスタンプはJST基準）
   - UP / DOWN 両方を含める（ロールバック可能にする）
   - RLSを無効化する変更の場合は必ず警告を出す

5. **事前レビュー**
   適用前に以下を確認:
   - 既存データへの影響 (NOT NULL追加、型変更、カラム削除)
   - RLSポリシーへの影響
   - 関連するインデックスの必要性
   - アプリ側コード（`.github/scripts/line-report/src/types.ts` 等）への波及

6. **適用**
   - ユーザーに最終確認を求める
   - 適用後、自動で verify クエリを実行（テーブル存在確認、RLS確認）
   - 失敗時は DOWN migration を自動適用してロールバック提案

## 引数例

- `/supabase-migrate dashboard "add product column to leads"`
- `/supabase-migrate soccer "create teams table"`

## 安全ガード

**必ず確認する事項:**
- [ ] 本番DBか? staging/branch でテスト済みか?
- [ ] バックアップはあるか? (Supabaseは自動バックアップあり / Free tierは7日)
- [ ] RLSを OFF にする変更でないか?
- [ ] DROP TABLE / DROP COLUMN の場合、コード側の参照を先にgrepしたか?
- [ ] service_role_key は絶対に使わない（anonのみ）

**絶対にやらない:**
- `GRANT` / `REVOKE` を勝手に変更する
- `auth.users` テーブル直接操作
- `CREATE EXTENSION` を確認なしで実行

## 出力

生成したmigrationファイルパスと、適用結果のサマリーを返す。
