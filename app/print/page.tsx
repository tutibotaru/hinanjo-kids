"use client";

import Link from "next/link";
import { useState } from "react";
import RubyText from "@/components/ruby-text";
import FuriganaToggle from "@/components/furigana-toggle";
import stepsData from "@/data/steps.json";

type Role = {
  id: string;
  name: string;
  short_name?: string;
  description: string;
  mission?: string;
  color: string;
};
type Phase = {
  id: number;
  name: string;
  label: string;
};
type Trouble = { label: string; action: string };
type Step = {
  id: string;
  role: string;
  phase: number;
  order: number;
  title: string;
  duration_minutes: number;
  instructions: string[];
  completion_condition: string;
  point?: string;
  troubles: Trouble[];
  depends_on: string[];
};

const ALL_ROLES = "all";

export default function PrintPage() {
  const [selected, setSelected] = useState<string>(ALL_ROLES);

  const roles = stepsData.roles as Role[];
  const phases = stepsData.phases as Phase[];
  const steps = stepsData.steps as Step[];

  const rolesToPrint =
    selected === ALL_ROLES ? roles : roles.filter((r) => r.id === selected);

  return (
    <main className="min-h-screen bg-slate-100 print:bg-white">
      {/* 操作バー(印刷時は消える) */}
      <div className="border-b border-slate-200 bg-white px-5 py-3 print:hidden">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-widest text-orange-700">
              印刷用ハンドアウト
            </p>
            <h1 className="mt-1 text-lg font-bold text-slate-900">
              やくわりカード(A4 印刷)
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              各班に 1 枚ずつ配って、 当日の手元資料 として使えます。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FuriganaToggle />
            <button
              type="button"
              onClick={() => window.print()}
              style={{ minHeight: 44 }}
              className="rounded-md bg-orange-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-orange-700 active:bg-orange-800"
            >
              🖨 いんさつ / PDFほぞん
            </button>
            <Link
              href="/"
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              ← トップへ
            </Link>
          </div>
        </div>
        <div className="mx-auto mt-3 flex max-w-5xl flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-700">
            印刷する 班:
          </span>
          <SelectChip
            active={selected === ALL_ROLES}
            onClick={() => setSelected(ALL_ROLES)}
            color="#94A3B8"
            label="ぜんぶ(4 まい)"
          />
          {roles.map((r) => (
            <SelectChip
              key={r.id}
              active={selected === r.id}
              onClick={() => setSelected(r.id)}
              color={r.color}
              label={r.name}
            />
          ))}
        </div>
      </div>

      {/* ハンドアウト本体 */}
      <div className="mx-auto max-w-5xl px-5 py-6 print:p-0">
        {rolesToPrint.map((role, idx) => (
          <RoleHandout
            key={role.id}
            role={role}
            phases={phases}
            steps={steps.filter((s) => s.role === role.id)}
            isLast={idx === rolesToPrint.length - 1}
          />
        ))}
      </div>
    </main>
  );
}

function SelectChip({
  active,
  onClick,
  color,
  label,
}: {
  active: boolean;
  onClick: () => void;
  color: string;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-xs font-semibold transition-colors ${
        active
          ? "border-orange-500 bg-orange-50 text-orange-900"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
      }`}
    >
      <span
        aria-hidden
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </button>
  );
}

// 1 役割 = A4 1〜2 ページ。 page-break-after でかならず次の役割と分ける。
function RoleHandout({
  role,
  phases,
  steps,
  isLast,
}: {
  role: Role;
  phases: Phase[];
  steps: Step[];
  isLast: boolean;
}) {
  const sortedSteps = [...steps].sort((a, b) => {
    if (a.phase !== b.phase) return a.phase - b.phase;
    return a.order - b.order;
  });

  return (
    <article
      className={`role-handout mb-8 bg-white shadow-md ring-1 ring-slate-200 print:m-0 print:mb-0 print:shadow-none print:ring-0 ${
        !isLast ? "page-break-after" : ""
      }`}
      style={{ minHeight: "275mm" }}
      aria-label={`${role.name} のハンドアウト`}
    >
      {/* ヘッダー: 班カラー帯 */}
      <header
        className="rounded-t px-6 py-4 text-white print:rounded-none"
        style={{ backgroundColor: role.color }}
      >
        <p className="text-xs font-semibold uppercase tracking-widest opacity-80">
          やくわりカード
        </p>
        <h1 className="mt-1 text-3xl font-bold leading-tight">
          <RubyText text={role.name} />
        </h1>
        <p className="mt-1 text-sm">
          <RubyText text={role.description} />
        </p>
      </header>

      <div className="px-6 py-4">
        {/* ミッション */}
        {role.mission && (
          <section className="mb-4 rounded-lg border-2 border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
              わたしたちの しごと
            </p>
            <p className="mt-1 text-sm leading-relaxed text-slate-900">
              <RubyText text={role.mission} />
            </p>
          </section>
        )}

        {/* フェーズごとに ステップ */}
        {phases.map((phase) => {
          const phaseSteps = sortedSteps.filter((s) => s.phase === phase.id);
          if (phaseSteps.length === 0) return null;
          return (
            <section key={phase.id} className="mb-3">
              <h2 className="mb-2 inline-block rounded-full bg-slate-800 px-3 py-0.5 text-xs font-bold text-white">
                {phase.name}({phase.label})
              </h2>
              <ol className="space-y-2">
                {phaseSteps.map((step) => (
                  <li
                    key={step.id}
                    className="rounded-md border border-slate-200 p-2 text-xs leading-snug"
                  >
                    <div className="flex items-baseline gap-2">
                      <span
                        className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                        style={{ backgroundColor: role.color }}
                      >
                        {step.order}
                      </span>
                      <p className="flex-1 text-sm font-bold text-slate-900">
                        <RubyText text={step.title} />
                      </p>
                      <span className="flex-shrink-0 text-[10px] font-semibold text-slate-500">
                        {step.duration_minutes}<ruby>分<rt>ふん</rt></ruby>
                      </span>
                    </div>
                    <ul className="mt-1 space-y-0.5 pl-7">
                      {step.instructions.map((ins, i) => (
                        <li key={i} className="text-slate-700">
                          ・<RubyText text={ins} />
                        </li>
                      ))}
                    </ul>
                    <div className="mt-1.5 grid grid-cols-1 gap-1 pl-7 sm:grid-cols-2">
                      <p className="rounded bg-orange-50 px-2 py-0.5 text-[10px] text-orange-900">
                        <span className="font-bold">できたサイン:</span>{" "}
                        <RubyText text={step.completion_condition} />
                      </p>
                      {step.troubles[0] && (
                        <p className="rounded bg-amber-50 px-2 py-0.5 text-[10px] text-amber-900">
                          <span className="font-bold">こまったら:</span>{" "}
                          <RubyText text={step.troubles[0].label} />
                          {" → "}
                          <RubyText text={step.troubles[0].action} />
                        </p>
                      )}
                    </div>
                    {step.point && (
                      <p className="mt-1 rounded bg-sky-50 px-2 py-0.5 pl-7 text-[10px] leading-snug text-sky-900">
                        💡 <RubyText text={step.point} />
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          );
        })}
      </div>

      {/* フッター */}
      <footer className="border-t border-slate-200 px-6 py-2 text-[10px] text-slate-500">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>
            ※ これは ぼうさいを まなぶための たいけんです。
            ほんものの さいがいのときは リーダーや まちのひとの しじを
            いちばんに きいてね。
          </span>
          <span className="font-semibold text-slate-700">
            おやこで ひなんじょ たいけん
          </span>
        </div>
      </footer>
    </article>
  );
}
