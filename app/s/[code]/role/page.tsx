"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient, ensureAnonAuth } from "@/lib/supabase/client";
import RubyText from "@/components/ruby-text";
import FuriganaToggle from "@/components/furigana-toggle";
import stepsData from "@/data/steps.json";

type StoredParticipant = { id: string; nickname: string };
type AnswerValue = 0 | 1 | 2;
type Answers = {
  q1?: AnswerValue;
  q2?: AnswerValue;
  q3?: AnswerValue;
  q4?: AnswerValue;
};
type QuestionKey = "q1" | "q2" | "q3" | "q4";
type Question = {
  key: QuestionKey;
  text: string;
  options: ReadonlyArray<{ label: string; value: AnswerValue }>;
};

// 4班(うけつけ/おへや/たべもの/けが)に対応する4問。
// 子ども親子向けに「すき / ふつう / にがて」形式で答えやすく。
const questions: ReadonlyArray<Question> = [
  {
    key: "q1",
    text: "からだを うごかすのは すき?",
    options: [
      { label: "すき", value: 2 },
      { label: "ふつう", value: 1 },
      { label: "にがて", value: 0 },
    ],
  },
  {
    key: "q2",
    text: "{人|ひと}と はなしたり、せわするのは すき?",
    options: [
      { label: "すき", value: 2 },
      { label: "ふつう", value: 1 },
      { label: "にがて", value: 0 },
    ],
  },
  {
    key: "q3",
    text: "ものを かたづけたり、かぞえたりするのは すき?",
    options: [
      { label: "すき", value: 2 },
      { label: "ふつう", value: 1 },
      { label: "にがて", value: 0 },
    ],
  },
  {
    key: "q4",
    text: "だれかが ぐあいわるいとき、こえをかけられる?",
    options: [
      { label: "できる", value: 2 },
      { label: "たぶん", value: 1 },
      { label: "むずかしい", value: 0 },
    ],
  },
];

// 4班それぞれに「向いている人の特徴」を反映。
// 設問の意味:
//   q1: からだをうごかすのが すき(体力)
//   q2: 人とはなす・せわするのが すき(対人)
//   q3: かたづけ・かぞえるのが すき(整理)
//   q4: ぐあいわるい人にこえをかけられる(共感・救護)
// 各班に主要 1問(重み2)+ 補助 1問(重み1)を反映。
function computeScores(answers: Answers): Record<string, number> {
  const q1 = answers.q1 ?? 0;
  const q2 = answers.q2 ?? 0;
  const q3 = answers.q3 ?? 0;
  const q4 = answers.q4 ?? 0;
  return {
    // うけつけ: 人とはなす + 整理(名簿)
    uketsuke: q2 * 2 + q3,
    // おへやづくり: 体力(運搬・点検) + 整理(レイアウト)
    oheya: q1 * 2 + q3,
    // たべものとみず: 整理(かぞえる) + 体力(はこぶ)
    monosuke: q3 * 2 + q1,
    // けがびょうき: こえかけ(共感) + 体力(けが人を運ぶ)
    kyugo: q4 * 2 + q1,
  };
}

type Role = {
  id: string;
  name: string;
  description: string;
  color: string;
  mission?: string;
};

export default function RolePage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const [stored, setStored] = useState<StoredParticipant | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  // step: 0..questions.length-1 が質問、questions.length が選択画面。
  // 7班・5問への拡張で literal-union が煩雑になるため number で管理。
  const [step, setStep] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyHasRole, setAlreadyHasRole] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const code = params.code.toUpperCase();
    const raw = localStorage.getItem(`hinanjo:participant:${code}`);
    if (!raw) {
      router.replace(`/s/${code}/nickname`);
      return;
    }
    let parsed: StoredParticipant;
    try {
      parsed = JSON.parse(raw) as StoredParticipant;
      if (!parsed.id) throw new Error();
    } catch {
      router.replace(`/s/${code}/nickname`);
      return;
    }
    setStored(parsed);

    const supabase = createClient();
    supabase
      .from("participants")
      .select("role")
      .eq("id", parsed.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.role) setAlreadyHasRole(true);
      });

    // WHY: 役割の偏り(全員うけつけ/けが0人 等)を、指導なしでも自分で避けられるよう
    // 各チームの現在人数を見せる。セッション→参加者をたどって役割ごとに集計。
    supabase
      .from("sessions")
      .select("id")
      .eq("qr_code", code)
      .maybeSingle()
      .then(({ data: sess }) => {
        if (!sess?.id) return;
        supabase
          .from("participants")
          .select("role")
          .eq("session_id", sess.id)
          .then(({ data: parts }) => {
            if (!parts) return;
            const tally: Record<string, number> = {};
            for (const p of parts) {
              const r = (p as { role: string | null }).role;
              if (r) tally[r] = (tally[r] ?? 0) + 1;
            }
            setCounts(tally);
          });
      });
  }, [params.code, router]);

  if (!stored) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8">
        <p className="mx-auto max-w-md text-sm text-slate-500">よみこみちゅう…</p>
      </main>
    );
  }

  const code = params.code.toUpperCase();
  const totalSteps = questions.length + 1;
  const chooseStep = questions.length;

  function handleAnswer(value: AnswerValue) {
    if (step >= questions.length) return;
    const key = questions[step].key;
    setAnswers((a) => ({ ...a, [key]: value }));
    setStep((s) => Math.min(s + 1, chooseStep));
  }

  function handleBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function selectRole(roleId: string) {
    if (!stored) return;
    setSaving(true);
    setError(null);
    // WHY: 役割保存も匿名サインインを確定してから。owner が自分の auth.uid() で
    // ないと下の UPDATE が RLS で 0 行になる。
    await ensureAnonAuth();
    const supabase = createClient();
    // WHY .select(): update().eq() は RLS で 0 行更新でも error=null を返す。
    // owner 不一致(NULL等)で保存されないまま mission へ進むと、mission が
    // role=null を読んで /role へ戻り「役割選択から先に進めない」無限ループになる。
    // 更新行を select で受けて 0 行なら保存失敗として扱い、遷移せずに再試行を促す。
    const { data: updated, error: updateError } = await supabase
      .from("participants")
      .update({ role: roleId })
      .eq("id", stored.id)
      .select("id");
    if (updateError || !updated || updated.length === 0) {
      setSaving(false);
      setError("ほぞんできなかったよ。もういちど おしてね");
      return;
    }
    router.push(`/s/${code}/mission`);
  }

  const Progress = () => (
    <div className="mb-8 flex items-center justify-center gap-1.5">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <span
          key={i}
          aria-hidden
          className={`h-2 w-2 rounded-full ${
            i <= step ? "bg-orange-500" : "bg-slate-300"
          }`}
        />
      ))}
    </div>
  );

  // 質問ステップ
  if (step < questions.length) {
    const q = questions[step];
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8">
        <div className="mx-auto max-w-md">
          <div className="mb-3 flex justify-end">
            <FuriganaToggle />
          </div>
          <Progress />
          <p className="mb-2 text-center text-xs font-semibold tracking-widest text-orange-700">
            しつもん {step + 1} / {questions.length}
          </p>
          <h1 className="mb-8 text-center text-2xl font-bold leading-snug text-slate-900">
            <RubyText text={q.text} />
          </h1>
          {step === 0 && alreadyHasRole && (
            <div className="mb-6 text-center">
              <button
                type="button"
                onClick={() => setStep(chooseStep)}
                className="rounded-lg border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-100"
              >
                しつもんをとばして やくわりだけえらぶ →
              </button>
            </div>
          )}
          <div className="space-y-3">
            {q.options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleAnswer(opt.value)}
                style={{ minHeight: 56 }}
                className="w-full rounded-lg border-2 border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-900 transition-colors hover:border-orange-500 hover:bg-orange-50 active:bg-orange-100"
              >
                {opt.label}
              </button>
            ))}
          </div>
          {step > 0 && (
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={handleBack}
                className="text-sm text-slate-500 underline"
              >
                ← まえのしつもんに もどる
              </button>
            </div>
          )}
        </div>
      </main>
    );
  }

  // 推薦 + 選択ステップ
  const skipped =
    answers.q1 === undefined &&
    answers.q2 === undefined &&
    answers.q3 === undefined &&
    answers.q4 === undefined;
  const scores = computeScores(answers);
  const roles = stepsData.roles as Role[];
  const sortedRoles = [...roles].sort(
    (a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0),
  );
  const topId = skipped ? null : sortedRoles[0].id;
  const countValues = roles.map((r) => counts[r.id] ?? 0);
  const maxCount = Math.max(0, ...countValues);
  const minCount = countValues.length ? Math.min(...countValues) : 0;

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-md">
        <div className="mb-3 flex justify-end">
          <FuriganaToggle />
        </div>
        <Progress />
        <header className="mb-6 text-center">
          <p className="text-xs font-semibold tracking-widest text-orange-700">
            やくわりをえらぶ
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            {skipped
              ? `${stored.nickname} さんのやくわり`
              : `${stored.nickname} さんへのおすすめ`}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            きがかわったら あとでかえられるよ。
            <br />
            4つのチームから、じぶんが やりたいのを1つえらんでね。
          </p>
        </header>

        {error && (
          <p
            role="alert"
            className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
          >
            {error}
          </p>
        )}

        <ul className="space-y-3">
          {sortedRoles.map((role) => {
            const isRecommended = role.id === topId;
            return (
              <li key={role.id}>
                <button
                  type="button"
                  onClick={() => selectRole(role.id)}
                  disabled={saving}
                  style={{ minHeight: 80 }}
                  className={`flex w-full items-center gap-4 rounded-lg border-2 bg-white p-4 text-left transition-colors hover:bg-orange-50 active:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50 ${
                    isRecommended ? "border-orange-500" : "border-slate-200"
                  }`}
                >
                  <span
                    aria-hidden
                    className="h-4 w-4 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: role.color }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-base font-bold text-slate-900">
                        {role.name}
                      </p>
                      {isRecommended && (
                        <span className="rounded-full bg-orange-500 px-2 py-0.5 text-xs font-semibold text-white">
                          おすすめ
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      <RubyText text={role.description} />
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      いま {counts[role.id] ?? 0}
                      <RubyText text="{人|にん}" />
                      {maxCount >= 2 &&
                        (counts[role.id] ?? 0) === minCount && (
                          <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-amber-800">
                            すくないよ
                          </span>
                        )}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => setStep(questions.length - 1)}
            className="text-sm text-slate-500 underline"
          >
            ← しつもんを やりなおす
          </button>
        </div>
      </div>
    </main>
  );
}
