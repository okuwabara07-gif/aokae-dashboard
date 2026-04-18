---
description: SupabaseプロジェクトのRow Level Security (RLS) ポリシーを監査し、anon keyで読み書きできる範囲を可視化
---

# /supabase-rls-audit

Supabaseプロジェクトの全テーブルについて、RLSポリシーの設定状況を監査する。

## 背景

AOKAEのダッシュボードは **anon key** でブラウザから直接Supabaseを叩く構成。
RLSが緩いと、誰でも売上データが読み書きできる状態になってしまう。

## 実行手順

1. **対象プロジェクトの選択**
   - `dashboard` / `soccer` / `colorpass` から選択
   - `$ARGUMENTS` で指定可能

2. **テーブル一覧取得**
   - `mcp__supabase__list_tables` で全テーブルを取得
   - 各テーブルの `rls_enabled` フラグを取得

3. **ポリシー取得**
   以下のクエリを `mcp__supabase__execute_sql` で実行:
   ```sql
   SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
   FROM pg_policies
   WHERE schemaname = 'public'
   ORDER BY tablename, cmd;
   ```

4. **リスク判定**

   **🔴 CRITICAL (即対応)**
   - RLSが無効 (`rls_enabled = false`)
   - `anon` ロールに `ALL` or `INSERT/UPDATE/DELETE` が許可されている
   - `using (true)` の全開放ポリシーが存在

   **🟡 WARNING (要確認)**
   - `authenticated` ロールに広範な権限（どのユーザーでも全行操作可能）
   - `SELECT` は anon 許可だが、PIIカラム（email, phone等）も含まれている
   - `service_role` 用のポリシーが明示されていない（暗黙全権で運用）

   **🟢 OK**
   - RLS有効 + anon は読み取り限定
   - `authenticated` は `auth.uid() = user_id` で自分のデータのみ
   - INSERT/UPDATE/DELETEはバックエンド経由のみ

5. **出力フォーマット**

```
🔒 RLS監査レポート: {project} (YYYY/MM/DD)
━━━━━━━━━━━━━━
【総テーブル数】N件
【RLS有効】N件 / 【無効】N件

━━━━━━━━━━━━━━
🔴 CRITICAL (N件)
- {table}: {具体的な問題} → 対応案

🟡 WARNING (N件)
- {table}: {問題} → 対応案

🟢 OK (N件)
- {table}: RLS有効、anon SELECTのみ

【推奨対応】
1. {最優先}
2. ...
```

6. **修正migration生成（オプション）**
   `--fix` オプションが付いていたら、CRITICAL項目を解消するmigrationを提案。
   **ただし自動適用はしない** - 必ずユーザー確認を経てから `/supabase-migrate` へ渡す。

## 引数

- `/supabase-rls-audit dashboard`
- `/supabase-rls-audit soccer --fix`

## 注意

- 本監査は**読み取りのみ**。ポリシーを勝手に変更しない
- `anon key` を使った実地テスト（実際にSELECT/INSERTしてみる）はオプション
- Supabase MCP が使えない環境では、SQLクエリをユーザーに貼ってもらう形で代替
