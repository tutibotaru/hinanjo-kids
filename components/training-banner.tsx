// 訓練モードのときだけ画面最上部に表示する帯。
// 本番(production)では何も描画しない。
export default function TrainingBanner({ mode }: { mode: string }) {
  if (mode !== "training") return null;
  return (
    <div className="sticky top-0 z-30 bg-amber-400 px-4 py-1 text-center text-xs font-bold text-amber-950">
      訓練モード — これは練習です(本番ではありません)
    </div>
  );
}
