---
description: アフィリエイトサイトの404/速度/記事数をチェックし、改善提案を出力する
---

# /affiliate-site-healthcheck

`affiliate_sites`テーブルに登録されている稼働中サイトの健全性を一括チェックする。

## 実行手順

1. **対象サイト取得**
   ```sql
   SELECT * FROM affiliate_sites
   WHERE is_active = true OR status = 'active';
   ```

2. **各サイトに対して以下を実施**

   ### A. HTTPステータス確認
   - トップページに HEAD リクエスト
   - サイトマップ（`/sitemap.xml`）の到達確認
   - リダイレクトチェーンの深さ（3段階超は警告）

   ### B. パフォーマンス
   - TTFB（Time To First Byte）計測
   - レスポンスサイズ
   - 閾値: TTFB > 1.5s は警告、> 3s はcritical

   ### C. 記事数
   - サイトマップから全URL数をカウント
   - `article_count` カラムと実際のURL数が乖離していたら指摘
   - 30日以内の新規記事があるかチェック（サイトマップの `lastmod` から）

   ### D. SEO基本
   - `<title>` / `<meta description>` の有無と長さ
   - `robots.txt` の存在
   - OGタグの有無

3. **スコア化**
   各サイトを 0-100 で採点:
   - HTTPステータス正常: 30
   - TTFB < 1.5s: 20
   - 30日以内に新規記事: 20
   - SEO基本揃ってる: 20
   - サイトマップ正常: 10

4. **出力フォーマット**

```
🔗 アフィリエイト ヘルスチェック (YYYY/MM/DD)
━━━━━━━━━━━━━━
対象: N件 / 稼働: N件

🔴 要対応 (N件)
- {site_name}: スコアXX/100
  - HTTP 404
  - TTFB 3.2s
  → 対応案: {具体的アクション}

🟡 観察 (N件)
...

🟢 健全 (N件)
...

【全体サマリー】
- 平均スコア: XX/100
- 過去30日に更新: N件 / 全N件
- 要対応TOP3:
  1. ...
```

5. **DB更新オプション**
   `--update` フラグが付いていたら、`affiliate_sites` テーブルの以下を更新:
   - `last_checked_at`
   - `health_score`
   - `status` (スコア<40 なら 'warning'、<20 なら 'down')

   ただし **デフォルトは読み取り専用**。

## 引数

- `/affiliate-site-healthcheck` - 全サイト
- `/affiliate-site-healthcheck --site {name}` - 特定サイト
- `/affiliate-site-healthcheck --update` - DBへ結果を書き戻し

## 実装ヒント

- HTTPチェックは `fetch` で並列実行（Promise.all, 同時10件程度に絞る）
- Firecrawl MCPが使える環境なら、コンテンツ解析も任せる
- タイムアウトは各サイト10秒（無反応サイトで全体が止まらないように）

## 注意

- robots.txt で `Disallow: /` してあるサイトへのスクレイピングは行わない
- 自社サイトのみが対象。**他社サイトのクローリングはしない**
- アクセス集中を避けるため、同一ドメインへのリクエスト間隔は1秒以上
