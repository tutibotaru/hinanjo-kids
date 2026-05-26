-- ============================================================================
-- 008 子ども版 4 班の役割IDを CHECK 制約に追加
-- ============================================================================
-- 目的:
--   migration 006 で participants.role の CHECK 制約を 7 班 + leader に
--   拡張したが、子ども版(hinanjo-kids)では 4 班 (uketsuke / oheya /
--   monosuke / kyugo)を使う。子ども版 ID が許可されておらず、役割選択で
--   UPDATE が CHECK 違反でエラーになり「通信エラー」として fall through
--   していた。
--
--   既存の 7 班 ID も残し、両方を共存させる(本家由来データに影響を与え
--   ない & 将来 merge する余地を残す)。
-- ============================================================================

ALTER TABLE public.participants
  DROP CONSTRAINT IF EXISTS participants_role_check;

ALTER TABLE public.participants
  ADD CONSTRAINT participants_role_check CHECK (
    role IS NULL
    OR role IN (
      -- 本家(hinanjo-app)の 7 班
      'general-affairs',
      'facility',
      'information',
      'medical-hygiene',
      'supplies',
      'vulnerable-support',
      'leader',
      -- 子ども版(hinanjo-kids)の 4 班
      'uketsuke',
      'oheya',
      'monosuke',
      'kyugo'
    )
  );
