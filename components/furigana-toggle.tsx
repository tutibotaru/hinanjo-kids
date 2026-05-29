"use client";

import { useEffect, useState } from "react";

// ふりがな表示の ON/OFF を切り替えるトグルボタン。
//
// 仕組み:
// - localStorage "hinanjo:furigana" = "on" / "off"(default = "on")
// - html[data-furigana] を同じ値で同期
// - globals.css の `html[data-furigana="off"] ruby rt { display: none }`
//   で全画面の <ruby> ふりがなを一括で消す(RubyText・直接書いた <ruby>
//   両方に効く)
// - FOUC は app/layout.tsx の <head> 内 blocking script で paint 前に
//   html[data-furigana] をセットすることで完全に消している
//
// なぜ Context ではなく DOM 属性経由か:
// - 直接書いた <ruby> も含めて 1 行の CSS で対応できる
// - server component と混在しても動く

const STORAGE_KEY = "hinanjo:furigana";

function readStored(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(STORAGE_KEY) !== "off";
}

function applyToHtml(on: boolean) {
  if (typeof document === "undefined") return;
  if (on) {
    document.documentElement.removeAttribute("data-furigana");
  } else {
    document.documentElement.setAttribute("data-furigana", "off");
  }
}

export default function FuriganaToggle() {
  // 初期値を lazy initializer で localStorage から読む。SSR 時は
  // window が無いので true(default)になるが、 hydration 後の最初の
  // render 前に useEffect で即補正する。 アイコン表示の一瞬のずれは
  // CSS による rt 非表示(layout.tsx で paint 前に確定済み)とは独立して
  // 動くため、 ruby のチラつきは発生しない。
  const [enabled, setEnabled] = useState<boolean>(() => readStored());

  useEffect(() => {
    const initial = readStored();
    setEnabled(initial);
    applyToHtml(initial);
  }, []);

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
    applyToHtml(next);
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
