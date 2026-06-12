"use client";

// フェーズが進んで「あたらしいブロックのやること」が開いたことを、目立つ全画面で知らせる。
//
// WHY: リーダーが manage でフェーズを進めると、参加者の画面は Realtime で更新されるが、
// 一度見て下を向いた人は「更新された」ことに気づけない(本番のふりかえりで判明)。
// そこでフェーズが上がった瞬間に大きな合図を出し、タップで新しいやることへ戻す。
// PausedOverlay と同じ全画面パターンだが、こちらは参加者が自分でタップして閉じる。
export default function NewPhaseOverlay({
  visible,
  blockName,
  onDismiss,
}: {
  visible: boolean;
  blockName: string;
  onDismiss: () => void;
}) {
  if (!visible) return null;
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={`あたらしい やること「${blockName}」が はじまりました`}
      onClick={onDismiss}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 px-6 py-8 text-center"
    >
      <div className="max-w-sm rounded-2xl bg-gradient-to-br from-orange-400 via-orange-500 to-amber-500 p-7 shadow-2xl">
        <p className="animate-bounce text-6xl" aria-hidden>
          🔔
        </p>
        <h2 className="mt-3 text-2xl font-extrabold text-white">
          あたらしい やること！
        </h2>
        <p className="mt-2 text-lg font-bold text-white">
          「{blockName}」の ぶんが はじまったよ
        </p>
        <p className="mt-2 text-sm text-orange-50">
          つぎの やることが ひらいたよ。みてみよう！
        </p>
        <button
          type="button"
          onClick={onDismiss}
          style={{ minHeight: 52 }}
          className="mt-5 w-full rounded-xl bg-white px-5 py-3 text-base font-bold text-orange-700 shadow hover:bg-orange-50 active:bg-orange-100"
        >
          やることを みる →
        </button>
      </div>
    </div>
  );
}
