# 親子で避難所体験(体験キャンプ版・ベータ)

小学生親子の防災体験キャンプ向けに「避難所運営を1時間で疑似体験できる」Web アプリの試験版(ベータ)です。

**⚠ 本アプリの位置づけ**: 体験キャンプ・教材・親子の防災学習を目的とした試験版です。実災害時の本番運用には対応していません。

- 本番(ベータ): https://hinanjo-kids.vercel.app
- 利用規約・プライバシー・免責: https://hinanjo-kids.vercel.app/policy
- 本家プロジェクト: [tutibotaru/hinanjo-app](https://github.com/tutibotaru/hinanjo-app)(自治体・自治会向け版)
- セキュリティ姿勢: [SECURITY.md](./SECURITY.md)

---

## 概要

「避難所運営の手順」を、おうちの人と子どもが一緒に役割を分担して、QR コードから参加 → 1ステップずつ動くだけで体験できる構成です。

- **複数の班(役割)** に分かれて並行で動く
- **QR で参加・ニックネームだけ**(個人情報なし)
- **1ステップ=1動作**で迷わない
- **リアルタイム同期**で他の家族の動きも見える

本家(hinanjo-app)の自治体・防災担当向け本格仕様から、**子どもと親が一緒に楽しめる**よう以下を調整しています:

- 動詞をやさしく(設置→おく / 区画する→へやをわける など)
- 漢字を最小限+ふりがな候補
- 役割もシンプル化(検討中)
- 体験キャンプ向けに「修了感」を持てるフロー(検討中)

参考資料: 内閣府ガイドライン R6.12版、各自治体の避難所運営マニュアル(詳細は `/policy` ページ)。

## 技術スタック

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS(オレンジ系の暖色テーマ)
- Supabase (Auth/DB/Realtime + 匿名認証)
- PWA (manifest 設定済み)
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
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

## 本家からの差分

- アプリ名: 避難所サポート → **親子で避難所体験**
- 色テーマ: 緑(emerald) → **オレンジ(orange)** 暖色系
- トップ画面の文言: 大人運営者向け → **親子参加者向け**(やさしい日本語)
- Supabase プロジェクト・Vercel プロジェクトは別の独立した環境

将来予定:
- コンテンツ(`data/steps.json`)を子ども向けにリライト
- 役割の数を体験用にシンプル化(7班 → 4-5班?)
- 「親子セット参加」「修了証」「クイズ要素」など体験キャンプ用機能

## 公開レベルの考え方

本アプリは公開レベル別に必要な対策を整理しています:

| レベル | 内容 | 現状 |
|---|---|---|
| L1 | 友人や家族と試す | ✓ 現状で OK |
| L2 | 一般公開ベータ(体験会場として誰でも触れる) | ◯ 現状ここ |
| L3 | PTA・子ども会・自治体イベントとの限定本番 | ✗ 主催者向け運用ガイド整備が必要 |

詳細とロードマップは [SECURITY.md](./SECURITY.md) を参照してください。

## お問い合わせ

不具合報告・要望・データ削除依頼:
https://github.com/tutibotaru/hinanjo-kids/issues
