"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

// WHY: 参加者画面(mission/board/posts)から友達を招待しやすくする。
// 災害時・訓練時を問わず「同じ避難所を見せる」が一発でできる。
// /admin/qr は管理者画面なので、参加者向けにモーダル表示で完結させる。
export default function InviteButton({
  code,
  label = "招待",
}: {
  code: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const joinUrl = origin ? `${origin}/?code=${code}` : "";

  async function handleCopy() {
    if (!joinUrl) return;
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // クリップボード API が使えない環境では何もしない(下にURL表示済み)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="この避難所への招待リンクとQRコードを表示"
        style={{ minHeight: 40 }}
        className="flex items-center justify-center rounded-md border border-emerald-300 bg-emerald-50 px-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 active:bg-emerald-200"
      >
        📨 {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="友達を招待"
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="text-center">
              <p className="text-xs font-semibold tracking-widest text-emerald-700">
                友達を招待
              </p>
              <h2 className="mt-1 text-lg font-bold text-slate-900">
                同じ避難所に参加してもらう
              </h2>
              <p className="mt-2 text-xs text-slate-500">
                QR を読み取るか、リンクを送ってください。
              </p>
            </header>

            <div className="mt-5 flex flex-col items-center">
              {joinUrl && (
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <QRCodeSVG
                    value={joinUrl}
                    size={180}
                    level="M"
                    marginSize={2}
                    style={{ display: "block" }}
                  />
                </div>
              )}
              <p className="mt-3 text-2xl font-bold tracking-widest text-slate-900">
                {code}
              </p>
              <p className="mt-1 break-all text-center text-[10px] text-slate-500">
                {joinUrl}
              </p>
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleCopy}
                style={{ minHeight: 48 }}
                className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 active:bg-emerald-800"
              >
                {copied ? "✓ コピーしました" : "リンクをコピー"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{ minHeight: 44 }}
                className="w-full rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                とじる
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
