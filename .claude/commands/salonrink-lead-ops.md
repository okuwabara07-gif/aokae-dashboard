---
description: SalonRinkの新規・未対応リードを抽出し、初回連絡メッセージ案を生成する
---

# /salonrink-lead-ops

SalonRinkの`leads`テーブルから対応が必要なリードを抽出し、初回コンタクト用のメッセージ案を生成する。

## 実行手順

1. **リード抽出**
   Supabaseから以下の条件で取得:
   ```sql
   SELECT * FROM leads
   WHERE product = 'salonrink'
     AND status IN ('new', 'contacted')
     AND (approached_at IS NULL
          OR approached_at < NOW() - INTERVAL '3 days')
   ORDER BY created_at DESC;
   ```

2. **優先度付け**
   以下の順にソート:
   1. `status = 'new'` かつ 3日以内 → 🔥 最優先
   2. `status = 'contacted'` かつ 7日以上放置 → ⚠️ リマインド
   3. その他 → 通常

3. **メッセージ案の生成**
   リードごとに、以下3種のメッセージ案をClaude Haikuで生成:
   - **A**: 丁寧フォーマル（初回接触、未知の相手向け）
   - **B**: カジュアル（紹介経由、既にラリーがある相手向け）
   - **C**: リマインド（前回連絡から1週間以上空いた相手向け）

   生成プロンプトのポイント:
   - 150字以内
   - SalonRinkの**価値訴求**を1点だけ入れる（全機能を並べない）
   - CTA（次アクション）を必ず1つ入れる
   - 絵文字は最大1つ
   - 「お世話になっております」等のテンプレ挨拶は最小限

4. **出力フォーマット**

```
💅 SalonRink リード対応キュー (N件)
━━━━━━━━━━━━━━
🔥 最優先 (N件)
━━━━━━━━━━━━━━
[1] {name} ({salon_name}) - 登録 {N日前}
  status: new
  📝 A (フォーマル):
    {message_a}
  📝 B (カジュアル):
    {message_b}

⚠️ リマインド (N件)
━━━━━━━━━━━━━━
[2] ...
```

5. **アクション**
   - ユーザーが選んだリードを `status='contacted'`、`approached_at=NOW()` に更新
   - ただし**自動更新はしない**。「このメッセージで送った？」と確認してから

## 引数

- `/salonrink-lead-ops` - 全対象を表示
- `/salonrink-lead-ops --priority hot` - 最優先のみ
- `/salonrink-lead-ops --limit 5` - 上位5件

## 安全ガード

- メッセージは**案の提示のみ**。実際の送信はユーザーが手動で行う
- 顧客のPII（電話番号・住所）は出力に含めない
- `converted` ステータスのリードには一切手を出さない
- LINE公式アカウントAPI経由での自動送信は本コマンドの責務外（別途 `/line-broadcast`）

## データ参照

- leadsテーブル型: `.github/scripts/line-report/src/types.ts` の `Lead` 型
- 追加カラム（`salon_name`, `email`, etc.）がある場合はSQL時に明示的にselect
