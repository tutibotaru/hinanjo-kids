# セキュリティ方針 / 公開前チェック

避難所運営支援アプリ(訓練用ベータ版)のセキュリティ姿勢を整理する。
「訓練・デモ用途」と「実名・住所を扱う本運用」で必要レベルが違う。

## 設計上の前提

- ログインなし(匿名 + ニックネーム)。参加は QR / 参加コードを知っていること自体がアクセス資格。
- フロントは Supabase の anon キーで直接アクセス。anon キーは仕様上ブラウザのJSバンドルに露出する(`NEXT_PUBLIC_`)。GitHub も Public。
  → **「キーを隠す」は対策にならない。守りはサーバ側の RLS で行う。**

## 公開レベル別の判定(2026-05-22)

| レベル | 内容 | 判定 | 必要対策 |
|---|---|---|---|
| L1 | 自分の訓練・友人と試す | ✓ 可 | 現状で OK |
| **L2** | **一般公開ベータ(誰でも触れる訓練用)** | **◯ 現状ここ** | 下記「L2 対策」を実施済 |
| L3 | 自治体・町内会との限定本番 | ✗ 不可 | 匿名認証+per-session RLS、データ保持ポリシー、専門監修等 |
| L4 | 実災害時の不特定多数本番 | ✗ 不可 | 24h SLA、責任保険、第三者監査、多言語、オフライン対応等 |

## L2 公開のために実施した対策(2026-05-22)

| 対策 | 内容 | 効果 |
|---|---|---|
| セキュリティヘッダ | `next.config.mjs` で CSP / X-Frame-Options DENY / nosniff / Referrer-Policy / Permissions-Policy / HSTS。`connect-src` を Supabase に限定 | XSS の影響範囲縮小・clickjacking 防止・外部送信遮断 |
| 検索除外 | `/s/*`(各避難所)と `/admin/*` を `robots: noindex` | コード・参加者情報が検索に載らない |
| RLS 厳格化(005) | `sessions` / `participants` の anon を SELECT/INSERT/UPDATE のみに(DELETE 不可) | 第三者APIによる全避難所・全参加者の一括削除を遮断 |
| 入力長 DB 制限(005) | nickname ≤30 / content ≤2000 / session name ≤60 の CHECK | API 直叩きの巨大データ投入を遮断 |
| 取消の2段階確認 / manage ゲート | 破壊操作の誤爆防止 | 偶発的なデータ破壊を抑止 |
| **/admin/new ゲート** | 「運営者である」チェック + 簡易計算チャレンジ + localStorage 記憶 | 誤操作・乱立スパムの抑制(認証ではない) |
| **法的ページ /policy** | 利用規約・プライバシー・免責・出典・問い合わせ窓口を明示 | 個人情報保護法・特商法的な最低限 |
| **トップ・フッターのベータ表示** | 「⚠ 訓練用ベータ版」「実災害時の本番運用には対応していません」 | 期待値統制 |
| **コンテンツ免責** | mission 画面に「医療判断・法的判断を行うものではありません」明記 | 誤用による被害防止 |
| **投稿時の注意書き** | 共有タイムラインに「実名禁止・誹謗中傷禁止・コード保持者は全員見える」明記 | 投稿者リスク低減 |
| **aria-label / aria-live 追加** | mission ボタン、StatusIcon、共有タイムラインに最低限のアクセシビリティ対応 | スクリーンリーダー対応の最低限 |

## 既知の依存脆弱性(2026-05-22 時点)

`npm audit` で Next.js 14.2.35 に 5件(High 4・Moderate 1)を検出している:

| CVE 系統 | このアプリでの実害 |
|---|---|
| DoS via Image Optimizer | `next/image` 未使用のため**影響なし** |
| HTTP request smuggling in rewrites | rewrites 未使用のため**影響なし** |
| Middleware / Proxy redirects cache poisoning | middleware 未使用のため**影響なし** |
| i18n Middleware bypass | i18n 未使用のため**影響なし** |
| beforeInteractive scripts XSS | beforeInteractive scripts 未使用のため**影響なし** |
| postcss XSS via Unescaped `</style>` | ビルド時のみ、本番ランタイム影響は限定的 |
| SSRF via WebSocket upgrades | WebSocket は Supabase Realtime 側で完結し**影響限定的** |

**結論**: このアプリの構成(middleware/next-image/i18n を使わない・App Router の標準的な使い方)では、これら CVE による実害は限定的。それでも `npm audit fix --force`(Next.js 16 系へのメジャー更新)を別作業で実施することを推奨。

## 残っているリスク(L3 本運用前に必須)

1. **クロスセッションの閲覧**:RLS の SELECT は今も `USING (true)`。コードを知らない第三者でも、anon キーで API を直接叩けば**他避難所の参加者名簿等を読める**。
   - 根治には Supabase の**匿名認証(`signInAnonymously`)+ セッション単位のポリシー**が必要(画面上はログイン不要のまま実現できる)。
2. **manage(運営パネル)はクライアント側ゲートのみ**:コード再入力や本部ロール自動アンロックは誤操作防止であって認証ではない。コードを知る人なら誰でもフェーズ変更・進捗リセットが可能。
3. **個人情報の保持**:自動削除・保持期間ポリシーは未実装。削除依頼は問い合わせ窓口での手動対応。
4. **レート制限なし**:大量 INSERT で DB ストレージ枯渇・Supabase 無料枠超過の可能性。
5. **オフライン動作なし**:Service Worker 未実装。電波途絶=操作不可。
6. **多言語対応なし**:日本語のみ。
7. **専門家監修なし**:防災士・医師・弁護士による正式監修を経ていない。
8. **WCAG 2.1 AA 正式準拠なし**:最低限の aria 対応のみ。

## 適用手順(運営者向け)

L2 公開時点では以下が必須(本番反映済み):

1. Supabase SQL Editor で `migrations/005_hardening.sql` を実行(冪等・安全)。
2. (任意)`migrations/004_stuck_count.sql` を実行すると「困った」記録の長期分析が可能に。

L3 移行時には:

3. 匿名認証 + per-session RLS の設計・実装に着手。
4. データ保持ポリシーの策定と自動削除バッチの構築。
5. 専門家(防災士・医師・弁護士)による監修依頼。
6. Supabase 有料プラン(Pro $25/月)で PITR・バックアップ・帯域拡張。

L4 移行時には:

7. 24h 運用 SLA・自治体との運用協定・責任保険。
8. 第三者セキュリティ監査(脆弱性診断)・負荷試験。
9. 多言語対応(やさしい日本語・英語・中国語・ベトナム語等)。
10. オフライン対応(Service Worker)。
