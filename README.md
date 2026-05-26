# 避難所サポート(訓練用ベータ版)

避難所に集まった住民数人が、QR コードを読むだけで役割分担し、1ステップずつ案内に従って避難所を立ち上げる Web アプリの試験版(ベータ)です。

**⚠ 本アプリの位置づけ**: 訓練・教材・デモを目的とした試験版です。実災害時の本番運用にはまだ対応していません。実際の避難所運営は、地域の防災計画・自治体マニュアル・現場の専門家判断を最優先してください。

- 本番(ベータ): https://hinanjo-app.vercel.app
- 利用規約・プライバシー・免責: https://hinanjo-app.vercel.app/policy
- セキュリティ姿勢: [SECURITY.md](./SECURITY.md)

---

## 概要

- **7班体制**: 総務 / 施設 / 情報 / 救護衛生 / 食料物資 / 要配慮者支援 / 本部
- **4フェーズ**: 0 初動(15分) / 1 開設初期(1時間) / 2 応急運営(2時間) / 3 安定運営(1日〜)
- **116ステップ**: 各 phase × 班 で 3-5件・1ステップ=1動作で 2-5分粒度
- **匿名+ニックネーム**: ログイン不要、QR を読むだけで参加
- **リアルタイム同期**: Supabase Realtime で複数人の進捗を即時共有

参考資料: 内閣府ガイドライン R6.12版、香川県・大阪市・調布市・山口県の各運営マニュアル、豊橋市7機能班別アクションガイド等(詳細は `/policy` ページ)。

## 技術スタック

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Supabase (Auth/DB/Realtime)
- PWA (manifest 設定済み・Service Worker は未実装)
- Vercel デプロイ

## 開発

```bash
npm install
npm run dev    # http://localhost:3000
npm run lint
npx tsc --noEmit
```

`.env.local` に Supabase の URL とAnonキーを設定:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## 公開レベルの考え方

本アプリは公開レベル別に必要な対策を整理しています(2026-05-22 評価):

| レベル | 内容 | 現状 |
|---|---|---|
| L1 | 友人と訓練 | ✓ 現状で OK |
| L2 | 一般公開ベータ(誰でも触れる訓練用) | ◯ 現状ここ |
| L3 | 自治体・町内会との限定本番 | ✗ 匿名認証+RLS 等が必要 |
| L4 | 実災害時の不特定多数本番 | ✗ 専門監修・SLA・保険等が必要 |

詳細とロードマップは [SECURITY.md](./SECURITY.md) を参照してください。

## 既知の制限(L2 公開時点)

- セッション・参加者データは参加コードを知る人なら API 経由で閲覧可能(匿名認証+per-session RLS は未実装、L3 移行時の対応事項)
- データの自動削除なし(削除依頼は `/policy` の問い合わせ窓口から)
- オフライン動作なし(電波が必要)
- 多言語対応なし(日本語のみ)
- アクセシビリティの WCAG 正式準拠は未実施(最低限の aria 対応のみ)

## ライセンス

未定。GitHub Public で公開していますが、再配布・改変・商用利用の条件は別途確認の上ご相談ください。

## お問い合わせ

不具合報告・要望・データ削除依頼:
https://github.com/tutibotaru/hinanjo-app/issues
