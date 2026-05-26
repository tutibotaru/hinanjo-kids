# hinanjo-kids 引き継ぎメモ(本家から派生したセッションを移すための情報)

このファイルは、**本家(hinanjo-app)のセッションから派生して作った
「親子で避難所体験」(hinanjo-kids)** の作業を、**新セッションに引き継ぐため**の
全情報をまとめたもの。

新セッションを **このフォルダ(`C:\Users\hebik\OneDrive\デスクトップ\hinanjo-kids`)から
起動**して、最初にこのファイルと CLAUDE.md を読むようにすれば、Phase 4 以降を
そのまま続けられる。

---

## このプロジェクトの基本情報

- **アプリ名**: 親子で避難所体験(体験キャンプ版・ベータ)
- **対象ユーザー**: 小学3-6年生(8-12歳)親子、PTA・子ども会・防災イベント主催者
- **由来**: 本家 `tutibotaru/hinanjo-app`(自治体・自治会向け本格版)からフォーク
- **派生日**: 2026-05-26

### 各環境

| 種類 | URL / 識別子 |
|---|---|
| 本番(Vercel) | https://hinanjo-kids.vercel.app |
| GitHub リポ | https://github.com/tutibotaru/hinanjo-kids |
| Supabase プロジェクト名 | `hinanjo-kids` (region: ap-northeast-1) |
| ローカルフォルダ | `C:\Users\hebik\OneDrive\デスクトップ\hinanjo-kids` |
| Supabase 接続情報 | `.env.local`(機密情報・git 除外済) |

### 本家との関係

完全に独立した姉妹プロジェクト:
- GitHub リポ別
- Supabase プロジェクト別(本家=FMB、子ども版=hinanjo-kids)
- Vercel プロジェクト別
- ローカルフォルダ別
- 本家の改善は手動で取り込む方針

---

## 完了済み(Phase 1-3)

### Phase 1: ベース作り(2026-05-26 完了)
- ✓ GitHub 空リポ作成(本家からのフォークは仕様上できないため、空リポを作って手動コピー)
- ✓ Supabase 新プロジェクト `hinanjo-kids` 作成(無料プラン)
- ✓ migration 001 / 004 / 005 / 006 / 007 を新DBに適用済
- ✓ 本家フォルダから複製(.git/node_modules/.next/.tmp_extract を除外)
- ✓ ローカル `npm install` 完了、`.env.local` 設定済(新Supabase接続)
- ✓ Vercel に新プロジェクト作成、環境変数設定、デプロイ
- ✓ Supabase ダッシュボードで Anonymous sign-ins を有効化
- ✓ 初回 push(commit `1488cdb`)

### Phase 2: ブランディング(commit `e0ee7b7`)
- ✓ Tailwind emerald-* → orange-* 全70箇所一括置換
- ✓ themeColor `#1D9E75` → `#F97316`、background `#FFFBEB`
- ✓ アプリ名「避難所サポート」→「親子で避難所体験」
- ✓ トップ画面の文言を親子向けに(「📣 体験キャンプ版」「いっしょに参加」等)
- ✓ README/SECURITY.md/policy/CLAUDE.md を全面改訂

### Phase 3: コンテンツリライト(commit `330d1c6`)
- ✓ 役割を 7班 → **4班**(うけつけ/おへや/たべもの/けがびょうき)
- ✓ ステップを 116 → **28**(4班 × phase 0/3 + phase 1/4)
- ✓ フェーズを 4 → **2**(はじめる15分+ひらく30分・全45分)
- ✓ 文体を子ども向け(漢字最小・絵本トーン)
- ✓ 役割推薦 5問 → 4問(子ども向け)・4班に対応する重み
- ✓ finish 画面に「⭐⭐⭐ おつかれさま!」達成感バナー追加
- ✓ 主要 UI ラベル変更(マイ→じぶん、全体→みんな、共有→ひろば等)

### Supabase データ
- DEMO01「サンプル体験会場(まず試してみる)」を常設

---

## Phase 4 完了内容(2026-05-27)

### A. 子ども向けアイコン
- `public/icon.svg` を子ども向けデザインに(オレンジ家+親子+ハート)

### B. ふりがな(ルビ)機能
- `lib/ruby.ts` パーサー: `{漢字|よみ}` 記法 → `<ruby>` トークン
- `components/ruby-text.tsx` `<RubyText text />`
- `data/steps.json` の漢字 260 回をすべて 記法化
- 主要画面 (mission/role/board/finish/posts) の steps 表示を RubyText で包む
- UI ラベル(役割→やくわり、完了→できた、 等)を平仮名化または `<ruby>` 化
- `scripts/add-furigana.ps1` 一括置換スクリプト(再利用可)

### C. 修了証
- `app/s/[code]/certificate/page.tsx`: A4 縦のしゅうりょうしょう。
  finish 画面から「🏅 しゅうりょうしょうを みる」で遷移。
  `window.print()` で 印刷ダイアログ → PDF 保存可能。
- `globals.css` に `@media print` の A4 設定

### E. 絵文字スタンプ
- `posts` 画面に 6 種類のスタンプボタン (🥺💪😊⭐🎉🤔)。
  1 タップでpost。 タイムラインで絵文字は大きく表示。

### 追加機能: ふりがな ON/OFF トグル
- `components/furigana-toggle.tsx`: localStorage `hinanjo:furigana` を
  `document.body[data-furigana]` と同期し、 `globals.css` の
  `body[data-furigana=off] ruby rt { display: none }` で一括 OFF。
- 各主要画面のヘッダーに 「亜あ」ボタンとして配置。
- 直接書いた `<ruby>` も RubyText もすべて一括で消える。

### 修正: 役割保存エラー(通信エラー)
- 原因: `participants.role` の CHECK 制約が 7 班版 ID しか許可していなかった。
- 対応: `migrations/008_kids_roles.sql` で 子ども版 4 班 ID
  (uketsuke / oheya / monosuke / kyugo) を 制約に追加(7班 ID とも共存)。

---

## Phase 5 以降の候補

### D. 親子セット参加機能
- 受付時に「親子ペア」として登録
- ペア相手が次のステップに進むと自分にも通知
- DB に participants.pair_id 追加が必要

### F. 体験ガイド PDF(主催者向け)
- 「30 分版」「45 分版」「60 分版」の進行台本
- 体験キャンプを開く人が事前に読む(コンテンツ作成中心)

### G. 写真投稿(将来)
- Supabase Storage を使う
- 親が撮った体験の写真をアップロード(顔写真は禁止のルール)
- モデレーション(NG ワード・顔検出など)も併せて要検討

### H. 受付名簿の印刷
- 当日参加者一覧を A4 で印刷できる(主催者向け)
- 既存の修了証印刷機構を流用

---

## 重要な技術メモ

### コードの作りどころ
- `data/steps.json`: コンテンツ全部(本家とは完全に別物)
- `app/page.tsx`: トップ画面(3導線・親子向け文言)
- `app/s/[code]/role/page.tsx`: 役割選択(4問・4班スコア)
- `app/s/[code]/mission/page.tsx`: 1ステップ1動作画面(子ども向けラベル)
- `app/s/[code]/finish/page.tsx`: ⭐⭐⭐ おつかれさま画面
- `components/invite-button.tsx`: QR/リンク招待モーダル
- `components/training-banner.tsx`: 「📣 たいけんちゅう」帯
- `CLAUDE.md`: プロジェクト規約(子ども向け)

### migration の状態(本番DBに適用済)
- 001 initial_schema
- 004 stuck_count
- 005 hardening
- 006 roles_expanded(本家用の7値CHECKを継承)
- 007 anon_auth_rls(匿名認証+per-session RLS)
- 008 kids_roles(子ども版 4 班 ID を CHECK 制約に追加。 Phase 4 で適用)
- ※ anon ポリシー削除(`007` 末尾の 008 ひな形)はまだ未適用(本家と同じく)

### 既知のセキュリティアドバイザー警告
- `rls_policy_always_true` 系(007 適用後も一部残る)
- `rls_auto_enable` 関数(Supabase 標準・実害なし)
- 本家と同じ状態。L3 移行時に対応予定

---

## 新セッション開始の手順

1. ターミナル(PowerShell)で:
   ```powershell
   cd "C:\Users\hebik\OneDrive\デスクトップ\hinanjo-kids"
   claude
   ```
2. または Claude Code のフォルダ選択でこのパスを指定
3. Claude が起動したら、最初の発言で:
   - 「`HANDOFF.md` と `CLAUDE.md` を読んで、現状を把握してから次に進めたい」
   - とお願いすれば、この情報を踏まえて続きの作業ができる

---

## 本家側との混雑チェック(2026-05-26)

派生作業中、本家(hinanjo-app)側には**一切影響を出していない**ことを確認済:

- 本家リポ: 最新 commit `5bc36c9`(本家側の作業のみ)・未コミットゼロ・origin と同期
- 本家 Supabase(FMB): DEMO01 のみ(本家のサンプル)・子ども版データ混入なし
- 本家 Vercel(hinanjo-app): 別プロジェクトで完全分離
- 本家プロジェクトメモリ: 子ども版の言及ゼロ

つまり、本家側のセッションを「マイナーチェンジ版を作りたい」発言時点に戻しても、
このフォルダの作業内容は全て残る(リポ・DB・Vercel・ローカルファイルがすべて
独立しているため)。
