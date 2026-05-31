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

## Phase 5 完了内容(2026-05-27)— JC 防災キャンプ事業対応

親子前提から「子どもだけ + リーダー(おとな)運営」 への汎用化。
JC(青年会議所)の福地 ぼうさいキャンプを 想定。

### A. audience_mode 追加
- `migrations/009_camp_mode.sql`: `sessions.audience_mode TEXT NOT NULL DEFAULT
  'family' CHECK IN ('family', 'kids')`
- `lib/audience.ts`: family / kids ごとの文言テーブル (`phrases(mode)`)。
  「おうちの 人」 → 「リーダー」 などを切替
- `app/admin/new/page.tsx` に 親子/子どもだけ のラジオ追加
- finish / certificate で audience_mode を session から取得して文言切替

### B. 共用端末「📱 こうたい」ボタン
- `mission` ヘッダーに、 1 タップで localStorage を消して /nickname に戻る
  ボタンを追加。 班で 1 台のタブレットを順に渡す運用に対応。
- DB の participant 行は消さないので、 各自の進捗・困った履歴は保持される。

### C. 班別ダッシュボード
- `manage` パネルに `<TeamDashboard />` を追加。
- 各班の 完了率を 進捗バーで表示し、 困った件数が 3 以上 / 進行中の
  困った がある班は赤に、 50% 未満は黄色に色分け。
- リーダーが「どの班に介入すべきか」が一目で分かる。

### D. 一斉ストップ + PausedOverlay
- `migrations/009`: `sessions.mode` に `'paused'` 値を許容
  (元々 CHECK 制約なしのカラムなので追加なし)
- `manage` に 「⏸ いっせいストップ / ▶ さいかい」 ボタン
- `components/paused-overlay.tsx`: mode === 'paused' のとき 全画面に
  「いったん てを とめよう」 のオーバーレイを表示し、 操作不能化
- mission / board / posts / finish で `useSession` (Realtime) と組み合わせ、
  リーダーが押した瞬間に全端末で 反映される

### E. ふりかえり投稿
- `migrations/009`: `shared_posts.type` に `'reflection'`, `'stamp'` を許容
- `finish` 画面に `<ReflectionForm />`: 「きょう おぼえたこと」 を
  1 タップで送信
- `posts` タイムラインで `type='reflection'` は 水色バッジで強調表示
- キャンプ事業の学習効果(ふりかえりが核)に応える

### F. 主催団体可変
- `lib/brand.ts`: `NEXT_PUBLIC_BRAND_NAME` / `_SHORT` / `_HOST` で
  アプリ名・修了証フッターを 環境変数差し替え可能に
- `app/layout.tsx` の metadata と `certificate` 描画で BRAND を参照
- Vercel 環境ごとに 主催団体名を分けてマルチテナント運用できる

### G. JC 福地 サンプルセッション
- `sessions` に `qr_code='JCKIDS', audience_mode='kids'` で
  「福地JC ぼうさいキャンプ(サンプル)」 を常設
- トップ画面に DEMO01 (おやこ) と JCKIDS (こどもだけ) の
  2 つの 体験入口を 並べる

---

## Phase 6 以降の候補

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
- 009 camp_mode(`sessions.audience_mode` 追加 + `shared_posts.type` に
  `reflection` / `stamp` 追加。 Phase 5 で適用)
- ※ anon ポリシー削除(`007` 末尾の 008 ひな形)はまだ未適用(本家と同じく)

### サンプルセッション(本番DBに常設)
- DEMO01 family モード「サンプル体験会場(まず試してみる)」
- JCKIDS kids モード「福地JC ぼうさいキャンプ(サンプル)」

---

## 本番運用 — 福地JC 2026/06/06 (土) 60名

### 関連ドキュメント (docs/)
- `docs/leader-guide.md` リーダー手引き(運営マニュアル)
- `docs/event-day-checklist.md` 当日 1 ページ チェックリスト
- `docs/troubleshooting.md` 想定問題集
- `docs/event-setup.md` 本番セッション 作成手順
- `public/poster-template.svg` 受付ポスター A3 SVG テンプレ

### スケジュール
- 5/30 (今日) ドキュメント・印刷物テンプレ 投入(完了)
- 5/31 (日) 実機テスト + 印刷物文言確定
- 6/1 (月) 主催者最終確認 + 本番セッション作成
- 6/2 (火) 印刷依頼
- 6/3-4 (水木) JC メンバーへ リーダー手引き 共有 + ミニリハ
- 6/5 (金) 端末 / 充電 / 予備機 準備
- **6/6 (土) 本番**

### 削った機能(本番までに 間に合わない/不要)
- 班編成機能(当日 推薦+自由選択でしのぐ)
- 水害シナリオ拡張
- カスタムドメイン
- 写真投稿
- CSV エクスポート

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

---

## 🔖 セッション最終状態(2026-05-30 引き継ぎ用)

このセッションでは、 アプリ本体に加え **高梁青年会議所(高梁JC)防災キャンプ
2026/06/06-07 開催用** の運用ドキュメントと Canva スライドを 仕上げた。

### 関連リソース

| 種類 | URL / パス |
|---|---|
| アプリ本番 | https://hinanjo-kids.vercel.app |
| GitHub | https://github.com/tutibotaru/hinanjo-kids |
| **Canva スライド(アプリ使い方ガイド)** | https://www.canva.com/d/8NjmXfUnDWqzmf2 |
| Canva 元テンプレ shortlink | https://canva.link/n9tia034eujtz3a (緑と白 自然 セミナー) |
| **JC事業 別プロジェクトフォルダ** | `C:\Users\hebik\OneDrive\デスクトップ\JC避難所体験\` |
| 元の引き継ぎ MD | `JC避難所体験\HANDOFF_新プロジェクト用引き継ぎ.md` |

### 確定済みイベント情報

| 項目 | 値 |
|---|---|
| 主催 | 一般社団法人 高梁青年会議所 |
| 形式 | 避難所自主運営型 防災キャンプ(風水害想定) |
| 日程 | 2026.06.06(土) 14:00 〜 06.07(日) 9:00(1泊2日) |
| 会場 | 高梁市内 体育館(具体名は要確認) |
| 対象 | 親子参加・想定読み合いレベル=**中学生** |
| 規模 | 60名 想定(要確認) |
| 哲学 | 「答えを教えない・自分たちで考える」 / 介入レベル L0-L3 |
| アプリ参加コード | 未確定(`FKJ606` などをサンプル提案中) |

### このセッションでの 主要成果物

#### アプリ側
- `migrations/008_kids_roles.sql` 本番DBに適用済
- `migrations/009_camp_mode.sql` 本番DBに適用済(audience_mode, paused mode, reflection投稿)
- `app/s/[code]/certificate/page.tsx` 修了証ページ
- `app/print/page.tsx` 紙芝居型ミッションカード印刷ページ
- `components/furigana-toggle.tsx` ふりがな ON/OFF
- `components/paused-overlay.tsx` 緊急停止オーバーレイ
- 班別ダッシュボード(manage 内)
- 共用端末「📱こうたい」(mission ヘッダー)
- スタンプ機能(posts)
- ふりかえり投稿(finish)

#### 印刷物・ドキュメント
- `docs/leader-guide.md` リーダー手引き(60名運用ガイド含む)
- `docs/event-day-checklist.md` 当日チェックリスト
- `docs/troubleshooting.md` トラブル対応
- `docs/event-setup.md` 本番セッション作成手順
- `public/poster-template.svg` 受付用 A3 SVG
- `public/screenshots/{top,print,admin-new}.png` Canva 添付用スクショ

#### Canva スライド(16ページ)
- アプリ使い方ガイド構成: 起動 → 役割選び → ステップ進める → 困った時 → 振り返り
- 介入レベル L0-L3 を P13 に詳細記載
- 中学生レベルの ですます調・常用漢字使用
- アプリスクショ 2枚(P2 アプリトップ / P8 mission画面相当)挿入

### 残課題(次セッション以降の候補)

#### 短期(本番までに完成させたい)
- [ ] **本番セッション作成**: 主催者が参加コード(`FKJ606` 等)を確定したら SQL で作成 → QR印刷
- [ ] **印刷物の主催者文言確定** + 印刷依頼(緊急連絡先・会場名 含む)
- [ ] **Canva スライド P16 を埋める**: お問い合わせ先・主催者向けURL 等
- [ ] **mission画面のスクショ取得**: ユーザーがスマホで実機ログインして撮影 → 私が Canva に挿入

#### 中期(余裕があれば)
- [ ] 班編成機能(DBスキーマ変更 5-8h)
- [ ] CSV 出力(事後報告書用に班別集計)
- [ ] 風水害シナリオの steps.json バリエーション(現状は地震想定だが、 名前を意識せず流用可能)

#### 長期
- [ ] 親子セット参加機能
- [ ] 写真投稿(モデレーション付き)
- [ ] カスタムドメイン

### 次セッション 開始時の推奨プロンプト

```
このフォルダ(C:\Users\hebik\OneDrive\デスクトップ\hinanjo-kids)の HANDOFF.md を
最初に読んで、 アプリ「hinanjo-kids」 と 高梁青年会議所 防災キャンプ
(2026/06/06-07・体育館・60名・風水害)用の運用準備の現状を把握してください。

別プロジェクト(JC避難所体験)のフォルダは
C:\Users\hebik\OneDrive\デスクトップ\JC避難所体験\
に各種ドキュメント一式が揃っています。

その上で、 次にやることを相談したいです。
```

### 注意点(次セッションで覚えておいてほしいこと)

1. **このセッションはアプリ(hinanjo-kids)に関する作業**。
   高梁JCキャンプ事業の運営マニュアル/タイムテーブル等は 別フォルダの
   「JC避難所体験」プロジェクトで管理されている。 混同しないこと。
2. Canva スライドは「**アプリの使い方説明**」 が主目的。 キャンプ事業全体の
   説明資料ではない。 (一度ミスして 修正した経緯あり)
3. 対象は **親子** だが、 読みのレベルは **中学生** で 設計する。
   (小学生向けは アプリ内のふりがな ON で対応する)
4. 災害想定は **風水害(大雨・台風)**。 地震ではない。
5. ふりがな機能・絵文字スタンプ・修了証など 子ども向け機能は実装済だが、
   中学生主体のキャンプではあえて使わない判断も可。 主催者と要相談。
