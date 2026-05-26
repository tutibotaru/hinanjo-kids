-- ============================================================================
-- 007 匿名認証ベースの RLS 厳格化【提案 — 段階的に適用すること】
-- ============================================================================
-- 目的:
--   001 以来 anon ロールに全テーブルを開放したままで、第三者が他セッションの
--   データを改ざん・削除できる(Supabase advisor「RLS Policy Always True」
--   警告6件)。匿名認証を導入し「自分が参加したセッションの行だけ書き込み可」
--   に絞る。005(段階A=DELETE禁止)に続く段階B。
--
-- 【適用前の必須準備】
--   (1) Supabase ダッシュボード → Authentication → Sign In / Up →
--       「Anonymous sign-ins」を有効化する。これが無いとアプリの
--       signInAnonymously() が失敗する。
--   (2) アプリ側のコードが入っていること:
--       - lib/supabase/client.ts の ensureAnonAuth()
--       - components/auth-gate.tsx(app/layout.tsx で全体をラップ済み)
--
-- 【安全な適用順序 — 必ずこの順で】
--   手順1: この 007 を適用する。
--          → authenticated ロール用ポリシーを「追加」するだけ。既存の
--            anon ポリシーは残すので、現行アプリ(anon のまま)は壊れない。
--   手順2: 新コード(AuthGate 入り)を Vercel にデプロイする。
--          → 以降アプリは authenticated ロールで動き、下記ポリシーが効く。
--   手順3: 実機で「参加→ニックネーム→役割選択→ステップ完了→取消→投稿→
--          運営パネル(フェーズ変更・リセット)」を一通り確認する。
--   手順4: 問題なければ、末尾の 008 ひな形で不要な anon ポリシーを削除する。
--
--   ※ 逆順(先にコードをデプロイ)は厳禁。authenticated 用ポリシーが
--     無い状態で authenticated リクエストが来ると全拒否され、アプリが
--     止まる。
--
--   冪等性: ポリシーは CREATE。再実行する場合は同名ポリシーを先に
--   DROP POLICY IF EXISTS すること。
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. 所有者列: 参加者の行を「作成した端末(auth.uid())」に紐づける
-- ----------------------------------------------------------------------------
ALTER TABLE public.participants
  ADD COLUMN IF NOT EXISTS owner UUID DEFAULT auth.uid();


-- ----------------------------------------------------------------------------
-- 2. セッション参加判定ヘルパー
--    「auth.uid() の端末が、その session_id に participant 行を持つか」。
--    step_progress / shared_posts は1セッション内で共同編集する設計のため、
--    「自分の行だけ」ではなく「自分が参加したセッションの行」で絞る。
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_session_member(target_session UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY INVOKER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.participants p
    WHERE p.session_id = target_session
      AND p.owner = auth.uid()
  );
$$;


-- ----------------------------------------------------------------------------
-- 3. authenticated ロール用ポリシー(追加。anon ポリシーは手順4まで残す)
-- ----------------------------------------------------------------------------

-- sessions: 閲覧は誰でも(コードを知る前提)。作成は認証済みなら可。
--   更新は「そのセッションに参加している人」だけ(運営パネルのフェーズ変更等)。
CREATE POLICY "auth read sessions"
  ON public.sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert sessions"
  ON public.sessions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update sessions"
  ON public.sessions FOR UPDATE TO authenticated
  USING (public.is_session_member(id))
  WITH CHECK (public.is_session_member(id));
-- DELETE ポリシーを作らない = authenticated は sessions を削除できない

-- participants: 閲覧は同席者を表示するため誰でも可。
--   追加は owner が自分のときだけ。更新も自分が作った行だけ。
CREATE POLICY "auth read participants"
  ON public.participants FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert participants"
  ON public.participants FOR INSERT TO authenticated
  WITH CHECK (owner = auth.uid());
CREATE POLICY "auth update participants"
  ON public.participants FOR UPDATE TO authenticated
  USING (owner = auth.uid())
  WITH CHECK (owner = auth.uid());
-- DELETE ポリシーを作らない = authenticated は participants を削除できない

-- step_progress: 閲覧は誰でも。追加/更新/削除は「参加セッションの行」だけ。
CREATE POLICY "auth read step_progress"
  ON public.step_progress FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert step_progress"
  ON public.step_progress FOR INSERT TO authenticated
  WITH CHECK (public.is_session_member(session_id));
CREATE POLICY "auth update step_progress"
  ON public.step_progress FOR UPDATE TO authenticated
  USING (public.is_session_member(session_id))
  WITH CHECK (public.is_session_member(session_id));
CREATE POLICY "auth delete step_progress"
  ON public.step_progress FOR DELETE TO authenticated
  USING (public.is_session_member(session_id));

-- shared_posts: 同上。投稿/更新/削除は「参加セッションの行」だけ。
CREATE POLICY "auth read shared_posts"
  ON public.shared_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert shared_posts"
  ON public.shared_posts FOR INSERT TO authenticated
  WITH CHECK (public.is_session_member(session_id));
CREATE POLICY "auth update shared_posts"
  ON public.shared_posts FOR UPDATE TO authenticated
  USING (public.is_session_member(session_id))
  WITH CHECK (public.is_session_member(session_id));
CREATE POLICY "auth delete shared_posts"
  ON public.shared_posts FOR DELETE TO authenticated
  USING (public.is_session_member(session_id));


-- ----------------------------------------------------------------------------
-- 残る advisor 警告について
--   上記適用後も「auth insert sessions」は WITH CHECK (true) のため
--   advisor に1件残る。セッション新規作成には自然な所有者制約が無いため
--   (作成時点ではまだ参加者がいない)。空セッションの作成自体はデータ
--   改ざんに当たらず、実害は小さい。気になる場合は /admin/new に
--   sessions へ owner 列を足して「作成者本人のみ」に絞る拡張が可能。
-- ----------------------------------------------------------------------------


-- ============================================================================
-- 008(ひな形)— 手順3 の実機確認が OK になってから別ファイルで実行する。
--   不要になった anon ポリシーを削除し、advisor 警告を解消する。
--   ※ ここはコメントのまま。手順3 完了まで絶対に流さないこと。
-- ============================================================================
-- DROP POLICY IF EXISTS "anon read sessions"        ON public.sessions;
-- DROP POLICY IF EXISTS "anon insert sessions"      ON public.sessions;
-- DROP POLICY IF EXISTS "anon update sessions"      ON public.sessions;
-- DROP POLICY IF EXISTS "anon read participants"    ON public.participants;
-- DROP POLICY IF EXISTS "anon insert participants"  ON public.participants;
-- DROP POLICY IF EXISTS "anon update participants"  ON public.participants;
-- DROP POLICY IF EXISTS "anon all on step_progress" ON public.step_progress;
-- DROP POLICY IF EXISTS "anon all on shared_posts"  ON public.shared_posts;
