-- ============================================================================
-- 005 公開向けセキュリティ強化(安全に実行できる範囲)
-- ============================================================================
-- これは「実行してよい」migration。Supabase の SQL Editor に貼って Run。
-- 冪等(2回流しても壊れない)。本番アプリの動作を壊さないことを確認済み:
--   アプリは sessions / participants を DELETE しない(grep 確認済)。
--   step_progress / shared_posts の DELETE は 取消・リセットで必要なので残す。
--
-- これで塞げること:
--   - 第三者APIによる「全避難所・全参加者の一括削除」を遮断
--   - 巨大データ投入(ニックネーム/投稿の極端な長さ)を DB 側で制限
-- これで塞げないこと(= 別途 anon 認証が必要。SECURITY.md 参照):
--   - クロスセッションの SELECT(コードを知らない第三者の閲覧)
-- ============================================================================


-- ---- sessions: anon は SELECT/INSERT/UPDATE のみ(DELETE 不可) ----
DROP POLICY IF EXISTS "anon all on sessions"     ON public.sessions;
DROP POLICY IF EXISTS "anon read sessions"       ON public.sessions;
DROP POLICY IF EXISTS "anon insert sessions"     ON public.sessions;
DROP POLICY IF EXISTS "anon update sessions"     ON public.sessions;

CREATE POLICY "anon read sessions"
  ON public.sessions FOR SELECT TO anon USING (true);
CREATE POLICY "anon insert sessions"
  ON public.sessions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon update sessions"
  ON public.sessions FOR UPDATE TO anon USING (true) WITH CHECK (true);


-- ---- participants: anon は SELECT/INSERT/UPDATE のみ(DELETE 不可) ----
DROP POLICY IF EXISTS "anon all on participants"    ON public.participants;
DROP POLICY IF EXISTS "anon read participants"      ON public.participants;
DROP POLICY IF EXISTS "anon insert participants"    ON public.participants;
DROP POLICY IF EXISTS "anon update participants"    ON public.participants;

CREATE POLICY "anon read participants"
  ON public.participants FOR SELECT TO anon USING (true);
CREATE POLICY "anon insert participants"
  ON public.participants FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon update participants"
  ON public.participants FOR UPDATE TO anon USING (true) WITH CHECK (true);


-- ---- step_progress / shared_posts: 取消・リセットで DELETE が要るので
--      FOR ALL を維持(変更しない)。001 のポリシーのまま。 ----


-- ---- 入力長の DB 側上限(API 直叩きの巨大データ投入を遮断) ----
-- NOT VALID: 既存行は検査せず、以後の INSERT/UPDATE にのみ適用(安全)。
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'participants_nickname_len'
  ) THEN
    ALTER TABLE public.participants
      ADD CONSTRAINT participants_nickname_len
      CHECK (char_length(nickname) BETWEEN 1 AND 30) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'shared_posts_content_len'
  ) THEN
    ALTER TABLE public.shared_posts
      ADD CONSTRAINT shared_posts_content_len
      CHECK (char_length(content) BETWEEN 1 AND 2000) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sessions_name_len'
  ) THEN
    ALTER TABLE public.sessions
      ADD CONSTRAINT sessions_name_len
      CHECK (char_length(name) BETWEEN 1 AND 60) NOT VALID;
  END IF;
END $$;
