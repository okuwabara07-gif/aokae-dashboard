# AOKAE Slash Commands

AOKAE LLCの全事業運用を支援するClaude Code slash command集。
このディレクトリの`.md`ファイルは自動的に `/コマンド名` として読み込まれる。

## 一覧

### 横断系
| コマンド | 用途 | 想定コスト/回 |
|---|---|---|
| `/aokae-kpi-review` | 全事業KPIを取得→異常検知→打ち手提案 | ~¥1-5 |
| `/aokae-cost-audit` | 月次コスト棚卸しと削減提案 | ~¥1-3 |
| `/weekly-review` | 週次レビュー自動生成、翌週TOP3決定 | ~¥3-10 |

### Supabase運用
| コマンド | 用途 | 想定コスト/回 |
|---|---|---|
| `/supabase-migrate` | 複数プロジェクトへのmigration生成・適用 | ~¥1-3 |
| `/supabase-rls-audit` | RLSポリシー監査、anon keyでの露出範囲チェック | ~¥1-5 |

### プロダクト別
| コマンド | 用途 | 想定コスト/回 |
|---|---|---|
| `/salonrink-lead-ops` | 新規/未対応リードの抽出と初回メッセージ案生成 | ~¥1-5 |
| `/affiliate-article-gen` | SEO記事を構成→本文まで一気通貫で生成 | ~¥10-50 |
| `/affiliate-site-healthcheck` | 稼働サイトの404/速度/記事数チェック | ~¥1-3 |
| `/soccer-tokyo-ops` | チーム追加・プレミアム会員動向・解約予兆検出 | ~¥1-5 |
| `/colorpass-mvp-scaffold` | MVP立ち上げテンプレ生成（認証/DB/UI） | ~¥5-20 |

### 開発・デプロイ
| コマンド | 用途 | 想定コスト/回 |
|---|---|---|
| `/vercel-deploy-check` | デプロイ前のenv/build/previewチェック | ~¥1-3 |
| `/feature-ship` | ブランチ→実装→PR→通知の一貫フロー | 実装規模次第 |

### 通知
| コマンド | 用途 | 想定コスト/回 |
|---|---|---|
| `/line-broadcast` | LINEへのアドホックPush（オーナー向け） | ~¥0-1 |

## 想定コストの前提

- Claude Proサブスク料金内で実行されるので、直接的な追加料金は通常**なし**
- 上記コストは「外部API費用 + 想定トークン消費量」の目安（Haikuベース）
- `affiliate-article-gen` の量産時のみ、明示的なレート制御を推奨

## 共通ガード

全コマンドで守るべき原則:
1. **破壊的操作は必ずユーザー確認**を経る（DB UPDATE、git push、LINE送信等）
2. **secrets値を標準出力にprintしない**
3. **顧客PII**を不必要に扱わない
4. 失敗時は「何が失敗したか」「次に何をすべきか」をクリアに出力

## 関連

- LINE朝夕レポート: `.github/scripts/line-report/`
- ダッシュボード本体: `app/`
- Supabaseスキーマ（本体）: `.github/scripts/line-report/src/types.ts` 参照
