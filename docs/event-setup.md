# 本番セッション セットアップ手順 — 6/6(土)

## ステップ 1: セッション作成

**月曜 (6/1) までに 確定** したい項目:

| 項目 | デフォルト案 | 確定値 |
|---|---|---|
| 会場名 | 高梁市立福地小学校 体育館 | _____________ |
| 参加コード | `FKJ606` (= 福地JC 6/6) | _____________ |
| audience_mode | `kids` (確定) | kids |
| mode | `training` で 開始 | training |

### A. ブラウザから 作成する場合

1. https://hinanjo-kids.vercel.app/admin/new を 開く
2. 運営者ゲート(チェック + 計算)を 通過
3. **避難所名**: 確定値を 入力
4. **参加コード**: 確定値を 入力(または 再生成)
5. **参加するのは**: 「子どもだけ」 を 選択
6. 「開設して QR を発行」

### B. SQL から 直接作成する場合(推奨・確実)

主催者と相談して 参加コードが決まったら、 開発者が Supabase SQL Editor で:

```sql
INSERT INTO public.sessions (name, qr_code, audience_mode, mode, phase)
VALUES (
  '福地小学校体育館 ぼうさいキャンプ',  -- ← 確定した会場名(高梁市立福地小学校 体育館)
  'FKJ606',                         -- ← 確定した参加コード(英大文字+数字)
  'kids',
  'training',
  0
)
ON CONFLICT (qr_code) DO UPDATE
SET name = EXCLUDED.name,
    audience_mode = EXCLUDED.audience_mode
RETURNING id, qr_code, name;
```

## ステップ 2: QR コード生成

1. https://hinanjo-kids.vercel.app/admin/qr?code={確定コード} を 開く
2. ブラウザで「右クリック → 画像を保存」 で QR の PNG を 取得
3. 受付ポスター(`public/poster-template.svg` を コピーして 編集)に 貼る
4. A3 で印刷

## ステップ 3: 受付ポスター 文言差し替え

1. `public/poster-template.svg` を コピー (例: `poster-fkj.svg`)
2. 以下の `EDIT-HERE` を 差し替え:
   - 主催名: 「福地JC ぼうさいキッズキャンプ」
   - 開催日: 「2026年 6月6日(土)〜7日(日)」 ← アプリ体験スロットは主催者確定(候補: 6/6 15:40「避難所設営訓練」45分枠)
   - QR 画像 (ステップ 2 で 保存した PNG を `<image>` で貼る)
   - 参加コード: 「FKJ606」 等の確定値
3. ブラウザで開いて 「印刷」 → A3 紙 / PDF 保存

## ステップ 4: リーダー側の 確認

- 各班リーダー (JC メンバー) が スマホで `/s/FKJ606/manage` を 開ける
- 自動アンロックは role='leader' のみ(現バージョン)
- 一般の運営者は 参加コード `FKJ606` を 再入力すれば 開ける

## ステップ 5: 本番直前(当日 -1 時間)

1. 全端末(スマホ/タブレット 17 台)で `https://hinanjo-kids.vercel.app` が 開けるか 確認
2. リーダー全員で `/s/FKJ606/manage` を 開いて、 班別ダッシュボードが 空で 表示されるか 確認
3. ⏸ ストップ → ▶ 再開 を 試して、 全端末が 動くことを 確認
4. 万一 何か壊れていたら、 直前修正は **しない**(凍結)。 紙運用にスイッチ

## 本番セッション 作成後の 確認用 URL

主催者と共有する URL リスト:

```
参加者向け:   https://hinanjo-kids.vercel.app/?code=FKJ606
              (または QR を読む)
リーダー用:   https://hinanjo-kids.vercel.app/s/FKJ606/manage
ボード:       https://hinanjo-kids.vercel.app/s/FKJ606/board
ふりかえり:   https://hinanjo-kids.vercel.app/s/FKJ606/posts
修了証:       https://hinanjo-kids.vercel.app/s/FKJ606/finish
              (子ども側 の finish 経由)
QR ページ:    https://hinanjo-kids.vercel.app/admin/qr?code=FKJ606
```

## イベント終了後

### A. データの保全(推奨)

- 何もしない = データは Supabase に残り続ける
- 報告書作成中は 削除しない

### B. データの 削除(任意・報告書完了後)

```sql
-- ふりかえり投稿の削除
DELETE FROM public.shared_posts
 WHERE session_id = (SELECT id FROM public.sessions WHERE qr_code = 'FKJ606');

-- 進捗の削除
DELETE FROM public.step_progress
 WHERE session_id = (SELECT id FROM public.sessions WHERE qr_code = 'FKJ606');

-- 参加者の削除
DELETE FROM public.participants
 WHERE session_id = (SELECT id FROM public.sessions WHERE qr_code = 'FKJ606');

-- セッション本体の削除
DELETE FROM public.sessions WHERE qr_code = 'FKJ606';
```

または 「次回も同じコードで 使う」 場合は `/s/FKJ606/manage` で
「ぜんぶ もとに もどす」 を タップすれば 進捗だけ消える(参加者と
セッションは 残る)。

---

最終更新: 2026-05-30 / 本番: 2026-06-06(土) 60名
