---
description: AOKAEの月次コストを棚卸し、削減候補と優先順位を提案する
---

# /aokae-cost-audit

AOKAE LLC全体のランニングコストを棚卸しし、削減候補を優先度付きで提示する。

## 実行手順

1. **Supabase `costs` テーブルから全データ取得**
   - 当月、先月、3ヶ月移動平均を算出
   - `category`, `service` 別に集計

2. **外部サービスの確認**（手動確認が必要な項目を列挙）
   - Vercel: プラン / 月次 usage（ユーザーに確認依頼）
   - Supabase: プロジェクトごとの Project size / egress
   - Anthropic API: 月次使用量
   - LINE Messaging API: Push数
   - ドメイン / SSL: 年次更新費用
   - その他: GitHub Actions, Cloudflare, etc.

3. **診断ルール**
   - **未使用疑い**: 3ヶ月連続で同額かつ他指標と連動していない → 休眠疑惑
   - **急増**: 前月比+30%超 → 原因調査候補
   - **低効率**: 売上 / サービスコスト が1未満 → ROI低い
   - **重複**: 同目的で複数サービス契約 → 統合候補

4. **提案フォーマット**

```
💸 AOKAE コスト監査 (YYYY/MM)
━━━━━━━━━━━━━━
【総コスト】当月 ¥XXX,XXX (前月比 +X%)

【カテゴリ別内訳】
- Hosting: ¥...
- AI/API: ¥...
- Tools: ¥...
- Domain/Infra: ¥...

【🔴 要対応】(優先度高)
1. [サービス名] ¥X/月 - 理由 - 削減案

【🟡 要観察】
...

【🟢 適正】
...

【手動確認が必要】
- Vercel usage: dashboard.vercel.com/usage
- Supabase: https://supabase.com/dashboard/project/.../settings/billing
- Anthropic: https://console.anthropic.com/settings/usage
```

5. **アクションプラン**
   最優先3件を、今週中に完了できる粒度で箇条書き化。

## 引数

- `$ARGUMENTS` に `--month YYYY-MM` で対象月を指定可能
- `--deep` を付けると各サービスの料金体系まで詳細調査（web fetch活用）

## 注意

- **勝手にサービス解約しない**。提案までに留める
- 金額は `fmtYen` 関数（`.github/scripts/line-report/src/format.ts`）に揃える
- `kirei` カテゴリ（キレイ鶴見）は「個人事業」扱いなのでデジタル事業側と分離して集計
