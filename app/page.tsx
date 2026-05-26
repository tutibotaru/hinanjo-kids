"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Home() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8">
          <p className="mx-auto max-w-md text-sm text-slate-500">読み込み中…</p>
        </main>
      }
    >
      <HomeForm />
    </Suspense>
  );
}

function HomeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCode = (searchParams.get("code") ?? "").toUpperCase();
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setError("参加コードを入力してください");
      return;
    }

    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { data, error: dbError } = await supabase
      .from("sessions")
      .select("qr_code")
      .eq("qr_code", trimmed)
      .maybeSingle();

    if (dbError) {
      setSubmitting(false);
      setError("通信エラーが発生しました。もう一度お試しください。");
      return;
    }
    if (!data) {
      setSubmitting(false);
      setError("そのコードの避難所が見つかりません");
      return;
    }

    router.push(`/s/${trimmed}/nickname`);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-md">
        <header className="mb-8">
          <div className="mb-3 inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
            ⚠ 訓練用ベータ版
          </div>
          <p className="text-xs font-semibold tracking-widest text-emerald-700">
            避難所サポート
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">参加する</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            QRコードまたは参加コードで、避難所運営チームに加わります。
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="code"
              className="block text-sm font-semibold text-slate-700"
            >
              参加コード
            </label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="例: TEST01"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              autoFocus
              maxLength={20}
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-lg uppercase tracking-widest text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{ minHeight: 52 }}
            className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 active:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {submitting ? "確認中…" : "参加する"}
          </button>
        </form>

        <div className="mt-10 border-t border-slate-200 pt-6">
          <p className="text-sm leading-relaxed text-slate-500">
            掲示された QR コードは、スマホのカメラアプリで読み取ると
            この画面が自動で開き、コードも入ります。うまく読めないときは
            QR の下に書かれた参加コードを上に入力してください。
          </p>
        </div>

        <section className="mt-8 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-semibold text-emerald-800">
            初めての方はこちらから
          </p>
          <p className="mt-1 text-xs leading-relaxed text-emerald-900">
            常設のサンプル避難所「DEMO01」をすぐ試せます。
            既に他の人が動かしているかもしれませんが、
            訓練用なので自由に触ってください。
          </p>
          <Link
            href="/?code=DEMO01"
            onClick={() => setCode("DEMO01")}
            style={{ minHeight: 48 }}
            className="mt-3 flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 active:bg-emerald-800"
          >
            🎯 サンプル避難所「DEMO01」を試す
          </Link>
        </section>

        <section className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold text-slate-700">
            あなたが訓練・運営する側の場合
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            新しい避難所セッションを開設して、QR コードを発行できます。
            自治会や PTA、防災訓練の主催者向けです。
          </p>
          <Link
            href="/admin/new"
            style={{ minHeight: 48 }}
            className="mt-3 flex items-center justify-center rounded-lg border-2 border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            ➕ 新しい避難所を開設(運営者向け)
          </Link>
        </section>

        <footer className="mt-10 border-t border-slate-200 pt-6 text-xs text-slate-500">
          <p className="leading-relaxed">
            本アプリは避難所運営訓練を支援する試験版(ベータ)です。
            実災害時の本番運用には対応していません。
            内容は地域の防災計画・自治体マニュアル・現場の判断と
            合わせてご利用ください。
          </p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/policy" className="text-emerald-700 underline">
              利用規約・プライバシー・免責
            </Link>
            <a
              href="https://github.com/tutibotaru/hinanjo-app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-700 underline"
            >
              GitHub
            </a>
            <a
              href="https://github.com/tutibotaru/hinanjo-app/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-700 underline"
            >
              お問い合わせ
            </a>
          </div>
          <p className="mt-3 text-[10px] text-slate-400">
            提供: 個人開発・避難所サポート(オープンソース)
          </p>
        </footer>
      </div>
    </main>
  );
}
