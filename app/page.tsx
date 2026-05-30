"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import FuriganaToggle from "@/components/furigana-toggle";
import { BRAND } from "@/lib/brand";

export default function Home() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8">
          <p className="mx-auto max-w-md text-sm text-slate-500">
            よみこみちゅう…
          </p>
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
      setError("さんかコードを いれてね");
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
      setError("つうしんエラー。もういちど ためしてね");
      return;
    }
    if (!data) {
      setSubmitting(false);
      setError("そのコードの たいけんかいじょうが みつからないよ");
      return;
    }

    router.push(`/s/${trimmed}/nickname`);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-md">
        <div className="mb-4 flex justify-end">
          <FuriganaToggle />
        </div>
        <header className="mb-8">
          <div className="mb-3 inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
            📣 たいけんキャンプ<ruby>版<rt>ばん</rt></ruby>
          </div>
          <p className="text-xs font-semibold tracking-widest text-orange-700">
            {BRAND.name}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            いっしょに <ruby>参加<rt>さんか</rt></ruby>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            QR コードを よんで、おうちの{" "}
            <ruby>人<rt>ひと</rt></ruby>といっしょに{" "}
            <ruby>避難所<rt>ひなんじょ</rt></ruby>を{" "}
            <ruby>立<rt>た</rt></ruby>ち
            <ruby>上<rt>あ</rt></ruby>げてみよう。 やくわりを えらんで、
            ステップに そって うごくだけ。
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="code"
              className="block text-sm font-semibold text-slate-700"
            >
              さんかコード
            </label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="れい: TEST01"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              autoFocus
              maxLength={20}
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-lg uppercase tracking-widest text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
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
            className="w-full rounded-lg bg-orange-600 px-4 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-orange-700 active:bg-orange-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {submitting ? "かくにんちゅう…" : "いっしょに さんかする"}
          </button>
        </form>

        <div className="mt-10 border-t border-slate-200 pt-6">
          <p className="text-sm leading-relaxed text-slate-500">
            はってある QR コードを、スマホの カメラで よむと
            このがめんが じどうで ひらいて、コードも はいるよ。
            よめないときは、 QR の <ruby>下<rt>した</rt></ruby>に かいてある
            さんかコードを <ruby>上<rt>うえ</rt></ruby>の らんに いれてね。
          </p>
        </div>

        <section className="mt-8 rounded-lg border border-orange-200 bg-orange-50 p-4">
          <p className="text-xs font-semibold text-orange-800">
            🌟 はじめての <ruby>人<rt>ひと</rt></ruby>は こちらから
          </p>
          <p className="mt-1 text-xs leading-relaxed text-orange-900">
            たいけんかいじょうを すぐ ためせるよ。
            ほかの <ruby>人<rt>ひと</rt></ruby>も さわっているかも しれないけど、
            たいけんようだから じゆうに さわってOK!
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <Link
              href="/?code=DEMO01"
              onClick={() => setCode("DEMO01")}
              style={{ minHeight: 48 }}
              className="flex items-center justify-center rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700 active:bg-orange-800"
            >
              👨‍👩‍👧 おやこモードの サンプル(DEMO01)
            </Link>
            <Link
              href="/?code=JCKIDS"
              onClick={() => setCode("JCKIDS")}
              style={{ minHeight: 48 }}
              className="flex items-center justify-center rounded-lg border-2 border-orange-500 bg-white px-4 py-2 text-sm font-bold text-orange-700 hover:bg-orange-50 active:bg-orange-100"
            >
              🏕 こどもだけ + リーダー モード(JCKIDS)
            </Link>
          </div>
        </section>

        {/* 当日 リーダーが すぐ manage に飛べるよう、 大きな ショートカットを置く。
            参加コードを 知っていれば 直接 /s/{コード}/manage に行ける構成。 */}
        <section className="mt-4 rounded-lg border-2 border-slate-700 bg-slate-800 p-4 text-white">
          <p className="text-xs font-semibold text-slate-300">
            🛡 リーダー・うんえいの 方は こちら
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-300">
            さんかコードを いれて 「いっしょに さんか」 を おすと、
            ニックネームの あとに リーダーパネルに いけるよ。
            <br />
            まだ かいじょうが ない場合は ↓
          </p>
          <Link
            href="/admin/new"
            style={{ minHeight: 48 }}
            className="mt-3 flex items-center justify-center rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700 active:bg-orange-800"
          >
            ➕ あたらしい かいじょうを つくる
          </Link>
        </section>

        <section className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold text-slate-700">
            たいけんキャンプを <ruby>主催<rt>しゅさい</rt></ruby>する
            <ruby>方<rt>かた</rt></ruby>へ
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            <ruby>新<rt>あたら</rt></ruby>しい たいけんかいじょうを{" "}
            <ruby>作<rt>つく</rt></ruby>って、
            <ruby>参加<rt>さんか</rt></ruby>する{" "}
            <ruby>親子用<rt>おやこよう</rt></ruby>の QR コードを{" "}
            <ruby>発行<rt>はっこう</rt></ruby>できます。 PTA・
            <ruby>子<rt>こ</rt></ruby>ども<ruby>会<rt>かい</rt></ruby>・
            <ruby>防災<rt>ぼうさい</rt></ruby>イベント
            <ruby>主催者<rt>しゅさいしゃ</rt></ruby>
            <ruby>向<rt>む</rt></ruby>け。
          </p>
          <Link
            href="/admin/new"
            style={{ minHeight: 48 }}
            className="mt-3 flex items-center justify-center rounded-lg border-2 border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            ➕ <ruby>新<rt>あたら</rt></ruby>しい たいけんかいじょうを{" "}
            <ruby>作<rt>つく</rt></ruby>る(<ruby>主催者<rt>しゅさいしゃ</rt></ruby>むけ)
          </Link>
        </section>

        <footer className="mt-10 border-t border-slate-200 pt-6 text-xs text-slate-500">
          <p className="leading-relaxed">
            このアプリは <ruby>親子<rt>おやこ</rt></ruby>で たのしむ「
            <ruby>避難所<rt>ひなんじょ</rt></ruby>
            <ruby>体験<rt>たいけん</rt></ruby>キャンプ」<ruby>用<rt>よう</rt></ruby>
            の しけんばん(ベータ)です。 ほんものの{" "}
            <ruby>災害<rt>さいがい</rt></ruby>のときに{" "}
            <ruby>使<rt>つか</rt></ruby>うことは{" "}
            <ruby>想定<rt>そうてい</rt></ruby>していません。
            たいけんを とおして、
            <ruby>避難所<rt>ひなんじょ</rt></ruby>のしくみと、
            もしものとき かぞくで できることを いっしょに{" "}
            <ruby>考<rt>かんが</rt></ruby>える きっかけに なれば うれしいです。
          </p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/policy" className="text-orange-700 underline">
              <ruby>利用規約<rt>りようきやく</rt></ruby>・プライバシー・
              <ruby>免責<rt>めんせき</rt></ruby>
            </Link>
            <a
              href="https://github.com/tutibotaru/hinanjo-kids"
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-700 underline"
            >
              GitHub
            </a>
            <a
              href="https://github.com/tutibotaru/hinanjo-kids/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-700 underline"
            >
              お<ruby>問<rt>と</rt></ruby>い<ruby>合<rt>あ</rt></ruby>わせ
            </a>
          </div>
          <p className="mt-3 text-[10px] text-slate-400">
            <ruby>提供<rt>ていきょう</rt></ruby>:{" "}
            <ruby>親子<rt>おやこ</rt></ruby>で{" "}
            <ruby>避難所<rt>ひなんじょ</rt></ruby>
            <ruby>体験<rt>たいけん</rt></ruby>(
            <ruby>個人<rt>こじん</rt></ruby>
            <ruby>開発<rt>かいはつ</rt></ruby>・オープンソース)
          </p>
        </footer>
      </div>
    </main>
  );
}
