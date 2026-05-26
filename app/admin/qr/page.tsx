"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { createClient } from "@/lib/supabase/client";

type Session = { name: string; qr_code: string };

export default function AdminQRPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8">
          <p className="mx-auto max-w-md text-sm text-slate-500">読み込み中…</p>
        </main>
      }
    >
      <QRView />
    </Suspense>
  );
}

function QRView() {
  const searchParams = useSearchParams();
  const code = (searchParams.get("code") ?? "").toUpperCase();
  const [origin, setOrigin] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!code) {
      setLoading(false);
      return;
    }
    const supabase = createClient();
    supabase
      .from("sessions")
      .select("name, qr_code")
      .eq("qr_code", code)
      .maybeSingle()
      .then(({ data, error: dbError }) => {
        if (dbError) {
          setError(dbError.message);
        } else {
          setSession((data as Session | null) ?? null);
        }
        setLoading(false);
      });
  }, [code]);

  if (!code) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8">
        <div className="mx-auto max-w-md text-center">
          <h1 className="text-lg font-bold text-slate-900">
            コードを指定してください
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            URL に <code>?code=XXX</code> を付けるか、
            <Link href="/admin/new" className="text-emerald-700 underline">
              新しい避難所を開設
            </Link>
            してください。
          </p>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8">
        <p className="mx-auto max-w-md text-sm text-slate-500">読み込み中…</p>
      </main>
    );
  }

  if (error || !session) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8">
        <div className="mx-auto max-w-md text-center">
          <h1 className="text-lg font-bold text-slate-900">
            セッションが見つかりません
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            コード <code>{code}</code> のセッションは存在しないようです。
          </p>
          <Link
            href="/admin/new"
            className="mt-4 inline-block text-sm text-emerald-700 underline"
          >
            新しい避難所を開設する →
          </Link>
        </div>
      </main>
    );
  }

  const joinUrl = origin ? `${origin}/?code=${code}` : "";

  return (
    <main className="min-h-screen bg-white">
      <div className="print:hidden">
        <header className="border-b border-slate-200 px-5 py-3">
          <div className="mx-auto flex max-w-3xl items-baseline justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-widest text-emerald-700">
                管理者 / QR発行
              </p>
              <h1 className="mt-0.5 text-lg font-bold text-slate-900">
                {session.name}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                印刷
              </button>
              <Link
                href="/admin/new"
                className="text-xs text-slate-500 underline"
              >
                別の避難所
              </Link>
            </div>
          </div>
        </header>
      </div>

      <section className="mx-auto flex max-w-3xl flex-col items-center px-5 py-8 print:py-0">
        <p className="text-sm font-semibold tracking-widest text-slate-700 print:text-base">
          {session.name}
        </p>
        <h2 className="mt-2 text-2xl font-bold text-slate-900 print:text-4xl">
          ここをスマホで読んでください
        </h2>

        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 print:border-2 print:border-black print:p-6">
          <QRCodeSVG
            value={joinUrl}
            size={320}
            level="M"
            marginSize={2}
            style={{ display: "block" }}
          />
        </div>

        <p className="mt-6 text-center text-sm text-slate-600 print:text-lg">
          うまく読み取れないときは、下のコードを入力してください
        </p>
        <p className="mt-2 font-mono text-3xl font-bold tracking-[0.5em] text-slate-900 print:mt-1 print:text-5xl">
          {code}
        </p>

        <p className="mt-8 break-all text-center text-xs text-slate-400 print:mt-6 print:text-sm">
          {joinUrl || `${code} 用URL`}
        </p>

        <p className="mt-6 text-center text-xs text-slate-500 print:mt-10 print:text-base">
          避難所運営アプリ — このQRから参加して、役割を分担しましょう。
        </p>
      </section>
    </main>
  );
}
