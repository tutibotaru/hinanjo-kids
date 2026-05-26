"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// I/0/O/L/1 など紛らわしい文字を除外
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ACK_KEY = "hinanjo:admin:acknowledged";

function generateCode(length = 6): string {
  return Array.from(
    { length },
    () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)],
  ).join("");
}

export default function AdminNewPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState(generateCode());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // WHY: /admin/new は URL 直叩きで誰でもセッション作成可能だった
  // (本格的な認証は別途実装予定)。L2 公開ベータの誤操作・乱立防止として
  // 「運営者であることの自己宣言」と「簡易チャレンジ」のゲートを置く。
  // 同意済みは localStorage で記憶し、再訪時は省略する。
  const [acknowledged, setAcknowledged] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [challenge, setChallenge] = useState({ a: 0, b: 0 });
  const [challengeAnswer, setChallengeAnswer] = useState("");
  const [gateError, setGateError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const ack = localStorage.getItem(ACK_KEY) === "true";
      setAcknowledged(ack);
    }
    setChallenge({
      a: Math.floor(Math.random() * 8) + 2,
      b: Math.floor(Math.random() * 8) + 2,
    });
  }, []);

  function handleGateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) {
      setGateError("『運営者である』のチェックを入れてください。");
      return;
    }
    const expected = challenge.a + challenge.b;
    const got = parseInt(challengeAnswer.trim(), 10);
    if (!Number.isFinite(got) || got !== expected) {
      setGateError("計算の答えが違います。新しい問題を表示します。");
      setChallenge({
        a: Math.floor(Math.random() * 8) + 2,
        b: Math.floor(Math.random() * 8) + 2,
      });
      setChallengeAnswer("");
      return;
    }
    localStorage.setItem(ACK_KEY, "true");
    setAcknowledged(true);
    setGateError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedCode = code.trim().toUpperCase();

    if (!trimmedName) {
      setError("避難所名を入力してください");
      return;
    }
    if (!/^[A-Z0-9]{4,12}$/.test(trimmedCode)) {
      setError("参加コードは英数字 4〜12 文字で入力してください");
      return;
    }

    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { error: insertError } = await supabase
      .from("sessions")
      .insert({ name: trimmedName, qr_code: trimmedCode });

    if (insertError) {
      setSubmitting(false);
      if (insertError.code === "23505") {
        setError(
          "そのコードは既に使われています。別のコードを生成してください。",
        );
        setCode(generateCode());
      } else {
        setError("作成に失敗しました。もう一度お試しください。");
      }
      return;
    }

    router.push(`/admin/qr?code=${trimmedCode}`);
  }

  if (!acknowledged) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8">
        <div className="mx-auto max-w-md">
          <header className="mb-6">
            <p className="text-xs font-semibold tracking-widest text-emerald-700">
              管理者向けゲート
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              この画面は避難所運営者向けです
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              ここは新しい避難所セッションを作る画面です。
              一般の避難者の方は、配布された QR コードから参加してください。
            </p>
            <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
              ⚠ 訓練用ベータ版です。実災害時の本番運用にはまだ対応していません。
              意味のないセッションを乱立させないでください。
            </p>
          </header>
          <form onSubmit={handleGateSubmit} className="space-y-4">
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 h-4 w-4 flex-shrink-0"
              />
              <span>
                私は避難所の運営者(自治会・行政・防災担当)または、
                訓練の主催者として利用します。
              </span>
            </label>
            <div>
              <label
                htmlFor="challenge"
                className="block text-sm font-semibold text-slate-700"
              >
                確認のため計算してください: {challenge.a} + {challenge.b} = ?
              </label>
              <input
                id="challenge"
                type="number"
                inputMode="numeric"
                value={challengeAnswer}
                onChange={(e) => setChallengeAnswer(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-lg text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
            {gateError && (
              <p
                role="alert"
                className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
              >
                {gateError}
              </p>
            )}
            <button
              type="submit"
              style={{ minHeight: 52 }}
              className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-base font-bold text-white hover:bg-emerald-700 active:bg-emerald-800"
            >
              運営者として開く
            </button>
            <Link
              href="/"
              style={{ minHeight: 48 }}
              className="flex items-center justify-center rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              参加者の方はこちらから →
            </Link>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-md">
        <header className="mb-8">
          <p className="text-xs font-semibold tracking-widest text-emerald-700">
            管理者
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            新しい避難所を開設
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            避難所名と参加コードを設定すると、QR コードが発行されます。
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-semibold text-slate-700"
            >
              避難所名
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: ○○小学校体育館"
              maxLength={40}
              autoFocus
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          <div>
            <label
              htmlFor="code"
              className="block text-sm font-semibold text-slate-700"
            >
              参加コード
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={12}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3 text-lg uppercase tracking-widest text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
              <button
                type="button"
                onClick={() => setCode(generateCode())}
                className="rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                再生成
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              紛らわしい文字 (0/O/1/I/L) は除外しています。
            </p>
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
            className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-base font-bold text-white transition-colors hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50"
          >
            {submitting ? "作成中…" : "開設して QR を発行"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <Link href="/" className="text-sm text-slate-500 underline">
            ← トップに戻る
          </Link>
        </div>
      </div>
    </main>
  );
}
