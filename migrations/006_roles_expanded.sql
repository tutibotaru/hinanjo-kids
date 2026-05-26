-- ============================================================================
-- 006 役割を7班に拡張 (B案: 開設+運営移行を視野)
-- ============================================================================
-- 既存の participants.role CHECK ('general-affairs','facility','information')
-- に 4つの新ロール ('medical-hygiene','supplies','vulnerable-support','leader')
-- を許可する。冪等(2回流しても壊れない)。
-- 本ファイル実行前にアプリのコードはすでに7班対応済み。先に DB を更新
-- してからアプリのデプロイが反映される(順序逆でも data 側は何も壊れない:
-- 新ロールで INSERT しようとした participant が CHECK で弾かれるだけ)。
-- ============================================================================

ALTER TABLE public.participants
  DROP CONSTRAINT IF EXISTS participants_role_check;

ALTER TABLE public.participants
  ADD CONSTRAINT participants_role_check
  CHECK (
    role IS NULL OR role IN (
      'general-affairs',
      'facility',
      'information',
      'medical-hygiene',
      'supplies',
      'vulnerable-support',
      'leader'
    )
  );
