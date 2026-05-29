-- ============================================================================
-- 009 JC キャンプ事業 / 子どもだけ運営モード対応
-- ============================================================================
-- 目的:
--   元々は親子ペア前提 (family) だが、青年会議所(JC)主催の防災キャンプの
--   ように子どもだけで運営するシーン(共用端末・班別運営・リーダー介入)に
--   対応する。 切替は新しい列 sessions.audience_mode で行い、 既存の親子
--   モードと共存できるようにする。
--
--   併せて shared_posts.type に「ふりかえり」用の値を追加して、 finish 画面
--   からの「きょう おぼえたこと」 投稿を 通常の困った/みつけた と区別できる
--   ようにする。
-- ============================================================================

-- 1) sessions.audience_mode 列
-- 'family' = 親子で参加 (既存挙動)
-- 'kids'   = 子どもだけ + おとなリーダー運営 (JC キャンプ等)
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS audience_mode TEXT NOT NULL DEFAULT 'family';

ALTER TABLE public.sessions
  DROP CONSTRAINT IF EXISTS sessions_audience_mode_check;
ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_audience_mode_check CHECK (
    audience_mode IN ('family', 'kids')
  );

-- 2) shared_posts.type に reflection / stamp を許可
-- reflection: finish 画面のふりかえり投稿
-- stamp:      絵文字スタンプを将来別 type に分けたくなったとき用に予約
-- (現在のアプリは stamp も trouble/finding に振り分けているので未使用だが、
--  予約しておけば後で UI で表示を分けやすい)
ALTER TABLE public.shared_posts
  DROP CONSTRAINT IF EXISTS shared_posts_type_check;
ALTER TABLE public.shared_posts
  ADD CONSTRAINT shared_posts_type_check CHECK (
    type IN ('trouble', 'finding', 'reflection', 'stamp')
  );
