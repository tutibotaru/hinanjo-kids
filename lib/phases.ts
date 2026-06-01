// WHY: 子ども向け画面では専門用語「フェーズ」を出さない(CLAUDE.md 文体ルール)。
// 大きな区切り(session.phase)を、やさしい日本語ラベルに変換する。
// 運営パネル(manage)は大人=リーダー向けなので、そちらの「フェーズ」表記はそのまま。

const PHASE_SHORT: Record<number, string> = {
  0: "はじめる",
  1: "ひらく",
  2: "つづける",
  3: "おちつく",
};

/**
 * 子ども向けのやさしいフェーズ名を返す。
 * 未知の値でも「Nぶんめ」で破綻しないようにする。
 */
export function phaseLabel(phase: number): string {
  return PHASE_SHORT[phase] ?? `${phase + 1}ぶんめ`;
}
