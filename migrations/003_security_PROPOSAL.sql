-- ============================================================================
-- 003 セキュリティ強化【提案 — まだ実行しないこと】
-- ============================================================================
-- 現状の問題:
--   001 の RLS が全テーブル `FOR ALL TO anon USING (true) WITH CHECK (true)`。
--   + GitHub が Public + anon キーは Next.js バンドルに露出。
--   → デプロイURLを見た第三者が、全避難所の参加者名・住所を読み・改ざん・
--     全削除できる(実名/住所を入れたら個人情報漏洩事故)。
--
-- 注意:
--   ポリシーを間違えると「本番サイトが急に動かなくなる」。必ず
--   (1) 先に動作中アプリの読み書き経路を把握し
--   (2) Supabase の SQL Editor で1段階ずつ適用し
--   (3) 各段階でアプリを実機確認
--   してから次へ進むこと。これは自動適用しない。
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 段階A(低リスク・推奨をまず適用):
--   アプリは sessions / participants を DELETE しない。anon の DELETE を
--   この2テーブルだけ禁止すれば「避難所/参加者ごと全消し」を塞げる。
--   step_progress / shared_posts は undo・リセットで DELETE が必要なので残す。
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "anon all on sessions"     ON public.sessions;
DROP POLICY IF EXISTS "anon all on participants" ON public.participants;

CREATE POLICY "anon read sessions"
  ON public.sessions FOR SELECT TO anon USING (true);
CREATE POLICY "anon insert sessions"
  ON public.sessions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon update sessions"
  ON public.sessions FOR UPDATE TO anon USING (true) WITH CHECK (true);
-- DELETE ポリシーを作らない = anon は sessions を削除できない

CREATE POLICY "anon read participants"
  ON public.participants FOR SELECT TO anon USING (true);
CREATE POLICY "anon insert participants"
  ON public.participants FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon update participants"
  ON public.participants FOR UPDATE TO anon USING (true) WITH CHECK (true);
-- DELETE ポリシーを作らない = anon は participants を削除できない


-- ----------------------------------------------------------------------------
-- 段階B(本来の解決・要設計判断・未記述):
--   匿名認証(supabase.auth.signInAnonymously())を導入し、各端末に JWT を
--   発行 → participants に auth uid を保存 → ポリシーを「自分が属する
--   session の行のみ読み書き可」に絞る。これがクロスセッション漏洩の根治。
--   ただしクライアント/フックの認証導線追加が必要なので別タスクで実装する。
--
--   さらに GitHub を Private に戻すと anon キー露出の窓を1つ減らせる
--   (バンドルにキーが乗る事実は変わらないので根治ではない)。
-- ----------------------------------------------------------------------------
-- (段階B はコード変更とセットでないと成立しないため SQL は未記載)
