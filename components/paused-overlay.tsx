"use client";

// session.mode === "paused" のとき全画面を覆ってボタン操作を止めるオーバーレイ。
// リーダーが mission/board/posts などのどの画面からでも 「いったん集まれ」 を
// 一斉に伝えるための仕組み。 mode が training/production に戻ると消える。
//
// 設計メモ:
// - useSession Realtime と組み合わせて、mode 変更が即時で全端末に反映される
// - z-index は ボトムナビ(20)・モーダル(40)を超え、 招待モーダル等とも
//   重なっても上に来るよう 50 にする
// - 操作不能を表現するため pointer-events: auto + 内部に「リーダーに きいてね」
//   メッセージのみ。 自力で閉じる手段は持たない(リーダーが解除する)
export default function PausedOverlay({
  visible,
  sessionName,
}: {
  visible: boolean;
  sessionName?: string;
}) {
  if (!visible) return null;
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="リーダーが いっせいストップ しました"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 px-6 py-8 text-center"
    >
      <div className="max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <p className="text-6xl" aria-hidden>
          ⏸
        </p>
        <h2 className="mt-4 text-2xl font-bold text-slate-900">
          いったん てを とめよう
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-700">
          リーダーが いっせいストップを かけたよ。
          <br />
          リーダーの ところに あつまって、 つぎの しじを きいてね。
        </p>
        {sessionName && (
          <p className="mt-4 text-xs text-slate-400">{sessionName}</p>
        )}
        <p className="mt-2 text-[10px] text-slate-400">
          リーダーが さいかいすると ここは きえるよ
        </p>
      </div>
    </div>
  );
}
