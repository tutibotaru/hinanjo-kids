"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import stepsData from "@/data/steps.json";

type StoredParticipant = { id: string; nickname: string };
type AnswerValue = 0 | 1 | 2;
type Answers = {
  q1?: AnswerValue;
  q2?: AnswerValue;
  q3?: AnswerValue;
  q4?: AnswerValue;
  q5?: AnswerValue;
};
type QuestionKey = "q1" | "q2" | "q3" | "q4" | "q5";
type Question = {
  key: QuestionKey;
  text: string;
  options: ReadonlyArray<{ label: string; value: AnswerValue }>;
};

// 7班に対応するため Q4(子育て・高齢者支援) と Q5(整理・数を扱う) を追加。
const questions: ReadonlyArray<Question> = [
  {
    key: "q1",
    text: "体を動かす作業はできますか?",
    options: [
      { label: "できる", value: 2 },
      { label: "少しなら", value: 1 },
      { label: "難しい", value: 0 },
    ],
  },
  {
    key: "q2",
    text: "医療や福祉の経験はありますか?",
    options: [
      { label: "ある", value: 2 },
      { label: "少しある", value: 1 },
      { label: "ない", value: 0 },
    ],
  },
  {
    key: "q3",
    text: "人前で話すのは得意ですか?",
    options: [
      { label: "得意", value: 2 },
      { label: "普通", value: 1 },
      { label: "苦手", value: 0 },
    ],
  },
  {
    key: "q4",
    text: "子育てや高齢者の支援の経験はありますか?",
    options: [
      { label: "ある", value: 2 },
      { label: "少しある", value: 1 },
      { label: "ない", value: 0 },
    ],
  },
  {
    key: "q5",
    text: "物の整理や数を扱う作業は得意ですか?",
    options: [
      { label: "得意", value: 2 },
      { label: "普通", value: 1 },
      { label: "苦手", value: 0 },
    ],
  },
];

// 訓練結果でチューニング想定の単純重み付け。Q が空(スキップ)時は 0 として扱う。
// 7班(総務/施設/情報/救護衛生/食料物資/要配慮者支援/本部)それぞれに
// 「向いている人の特徴」を反映。
// 設問の意味:
//   q1: 体力(運搬・点検・立ち仕事)
//   q2: 医療経験(検温・救護・薬の知識)
//   q3: 対人スキル(放送・案内・調整)
//   q4: 福祉経験(高齢者・障害者・乳幼児ケア)
//   q5: 整理整頓(名簿・在庫・掲示整理)
// WHY: 内閣府ガイドライン R6 と各自治体マニュアルを参照し、各班に
//   主要 2 問(重み2-3)+ 補助 1-2 問(重み1)を反映。
//   訓練データに応じて微調整可能。
function computeScores(answers: Answers): Record<string, number> {
  const q1 = answers.q1 ?? 0;
  const q2 = answers.q2 ?? 0;
  const q3 = answers.q3 ?? 0;
  const q4 = answers.q4 ?? 0;
  const q5 = answers.q5 ?? 0;
  return {
    // 受付・名簿管理:対人(声かけ)が主、整理(名簿)と軽い体力(立ち仕事)を補助
    "general-affairs": q3 * 2 + q5 + q1,
    // 安全確認・スペース設営:体力(資機材)が主、整理(レイアウト)と対人(現場調整)を補助
    facility: q1 * 2 + q5 + q3,
    // 通信・広報・掲示:対人(話す)が主、医療(健康情報)と整理(掲示整理)を補助
    information: q3 * 2 + q2 + q5,
    // 検温・救護・衛生:医療経験が必須に近い、福祉(要配慮者ケア)と体力を補助
    "medical-hygiene": q2 * 3 + q1 + q4,
    // 備蓄・在庫・配布:整理(在庫)と体力(運搬)が両輪、対人(配布時の声かけ)を補助
    supplies: q1 * 2 + q5 * 2 + q3,
    // 要配慮者・多文化:福祉経験と医療経験が両輪、対人(やさしい話)を補助
    "vulnerable-support": q4 * 2 + q2 * 2 + q3,
    // 司令塔・班間調整:対人が主、体力と医療判断と整理判断をバランスで補助
    leader: q3 * 2 + q1 + q2 + q5,
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
  }, [params.code, router]);

  if (!stored) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8">
        <p className="mx-auto max-w-md text-sm text-slate-500">読み込み中…</p>
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
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("participants")
      .update({ role: roleId })
      .eq("id", stored.id);
    if (updateError) {
      setSaving(false);
      setError("通信エラーが発生しました。もう一度お試しください。");
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
            i <= step ? "bg-emerald-500" : "bg-slate-300"
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
          <Progress />
          <p className="mb-2 text-center text-xs font-semibold tracking-widest text-emerald-700">
            質問 {step + 1} / {questions.length}
          </p>
          <h1 className="mb-8 text-center text-2xl font-bold leading-snug text-slate-900">
            {q.text}
          </h1>
          {step === 0 && alreadyHasRole && (
            <div className="mb-6 text-center">
              <button
                type="button"
                onClick={() => setStep(chooseStep)}
                className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
              >
                質問をスキップして役割だけ選ぶ →
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
                className="w-full rounded-lg border-2 border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-900 transition-colors hover:border-emerald-500 hover:bg-emerald-50 active:bg-emerald-100"
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
                ← 前の質問に戻る
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
    answers.q4 === undefined &&
    answers.q5 === undefined;
  const scores = computeScores(answers);
  const roles = stepsData.roles as Role[];
  const sortedRoles = [...roles].sort(
    (a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0),
  );
  const topId = skipped ? null : sortedRoles[0].id;

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-md">
        <Progress />
        <header className="mb-6 text-center">
          <p className="text-xs font-semibold tracking-widest text-emerald-700">
            役割をえらぶ
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            {skipped
              ? `${stored.nickname} さんの役割`
              : `${stored.nickname} さんへのおすすめ`}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            気が変わったら後から変更できます。
            <br />
            この避難所運営は本来7班で動きます。あなたが担当する1班を選んでください。
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
                  className={`flex w-full items-center gap-4 rounded-lg border-2 bg-white p-4 text-left transition-colors hover:bg-emerald-50 active:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 ${
                    isRecommended ? "border-emerald-500" : "border-slate-200"
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
                        <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-semibold text-white">
                          おすすめ
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      {role.description}
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
            ← 質問をやり直す
          </button>
        </div>
      </div>
    </main>
  );
}
