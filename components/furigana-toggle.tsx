"use client";

import { useEffect, useState } from "react";

// ふりがな表示の ON/OFF を切り替えるトグルボタン。
//
// 仕組み:
// - localStorage に "hinanjo:furigana" = "on" / "off"(default = "on")
// - document.body[data-furigana] を同じ値で同期
// - globals.css の `body[data-furigana="off"] ruby rt { display: none }`
//   で全画面の <ruby> ふりがなを一括で消す(RubyText・直接書いた <ruby>
//   両方に効く)
//
// なぜ Context ではなく DOM 属性経由か:
// - 直接書いた <ruby> も含めて 1 行の CSS で対応できる
// - server component と混在しても 動く
// - ハイドレーション時のチラつきは初期 SSR が "on" 前提なので
//   ふりがなが一度表示 → OFF 設定の人は一瞬で消える程度に収まる

const STORAGE_KEY = "hinanjo:furigana";

function readStored(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(STORAGE_KEY) !== "off";
}

function applyToBody(on: boolean) {
  if (typeof document === "undefined") return;
  document.body.dataset.furigana = on ? "on" : "off";
}

export default function FuriganaToggle() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const initial = readStored();
    setEnabled(initial);
    applyToBody(initial);
  }, []);

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
    applyToBody(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={enabled ? "ふりがなを けす" : "ふりがなを つける"}
      title={enabled ? "ふりがなを けす" : "ふりがなを つける"}
      style={{ minHeight: 40, minWidth: 40 }}
      className="flex items-center justify-center rounded-md border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 hover:bg-slate-50 active:bg-slate-100"
    >
      {enabled ? (
        // ON: 「亜あ」(漢字+ふりがな) のミニ表示。<ruby> を使うので
        // OFF にすると自動で「亜」だけ表示になる(意図通り)。
        <ruby className="leading-none">
          亜<rt className="text-[8px]">あ</rt>
        </ruby>
      ) : (
        <span className="text-slate-400">亜</span>
      )}
    </button>
  );
}
