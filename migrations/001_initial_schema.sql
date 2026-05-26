-- ============================================================================
-- 避難所運営支援アプリ MVP - 初期スキーマ
-- ============================================================================
-- このファイルは Supabase の SQL Editor に丸ごと貼り付けて実行する想定。
-- 実行は1回だけ(CREATE TABLE IF NOT EXISTS なので2回実行しても壊れない)。
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. sessions: 避難所運営の単位(QR 1つに紐づく)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sessions (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT         NOT NULL,                              -- 例: ○○小学校体育館
  qr_code     TEXT         UNIQUE NOT NULL,                       -- QRに埋め込む短い識別子
  phase       INTEGER      NOT NULL DEFAULT 0,                    -- 0:初動 / 1:開設初期 / 2:応急運営
  mode        TEXT         NOT NULL DEFAULT 'training'            -- training / production
                          CHECK (mode IN ('training', 'production')),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_qr ON public.sessions(qr_code);


-- ----------------------------------------------------------------------------
-- 2. participants: セッションへの参加者(匿名 + ニックネーム)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.participants (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID         NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  nickname    TEXT         NOT NULL,
  role        TEXT         CHECK (role IN ('general-affairs', 'facility', 'information')),
  joined_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_participants_session ON public.participants(session_id);


-- ----------------------------------------------------------------------------
-- 3. step_progress: 各ステップの進捗(1セッション×1ステップ=1行)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.step_progress (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID         NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  step_id         TEXT         NOT NULL,                                  -- data/steps.json の id (例: ga-001)
  participant_id  UUID         REFERENCES public.participants(id) ON DELETE SET NULL,
  status          TEXT         NOT NULL CHECK (status IN ('done', 'skipped', 'stuck')),
  trouble_label   TEXT,                                                    -- 「困った」の理由
  completed_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (session_id, step_id)                                             -- 1ステップにつき最新状態だけ持つ
);

CREATE INDEX IF NOT EXISTS idx_step_progress_session ON public.step_progress(session_id);


-- ----------------------------------------------------------------------------
-- 4. shared_posts: 共有タイムライン(困った / 発見の投稿)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shared_posts (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID         NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  participant_id  UUID         REFERENCES public.participants(id) ON DELETE SET NULL,
  content         TEXT         NOT NULL,
  photo_url       TEXT,                                                    -- Supabase Storage の URL
  type            TEXT         NOT NULL CHECK (type IN ('trouble', 'finding')),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shared_posts_session
  ON public.shared_posts(session_id, created_at DESC);


-- ----------------------------------------------------------------------------
-- Realtime: テーブル変更を WebSocket で配信(進捗ボード・タイムラインに必須)
-- ----------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.step_progress;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_posts;


-- ----------------------------------------------------------------------------
-- RLS (Row Level Security)
-- MVP では「QR を知っている人 = アクセスしてよい人」と割り切り、
-- anon ロールに全テーブルの読み書きを開放する(訓練利用のため)。
-- 本番化のときは session_id を絞り込むポリシーに置き換える。
-- ----------------------------------------------------------------------------
ALTER TABLE public.sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.step_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_posts  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon all on sessions"
  ON public.sessions       FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon all on participants"
  ON public.participants   FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon all on step_progress"
  ON public.step_progress  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon all on shared_posts"
  ON public.shared_posts   FOR ALL TO anon USING (true) WITH CHECK (true);
