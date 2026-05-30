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
  const steps = stepsData.steps as Step[];
  const phases = stepsData.phases as Phase[];

  // 選んだ役割のステップのみ抽出。 並び順は phase → order。
  const filteredSteps = (
    selected === ALL_ROLES
      ? steps
      : steps.filter((s) => s.role === selected)
  )
    .slice()
    .sort((a, b) =>
      a.phase !== b.phase ? a.phase - b.phase : a.order - b.order,
    );

  const totalCount = filteredSteps.length;
  const roleById = new Map(roles.map((r) => [r.id, r]));
  const phaseById = new Map(phases.map((p) => [p.id, p]));

  return (
    <main className="min-h-screen bg-slate-100 print:bg-white">
      {/* 操作バー(印刷時に消える) */}
      <div className="border-b border-slate-200 bg-white px-5 py-3 print:hidden">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-widest text-orange-700">
              ミッションカード(紙芝居)
            </p>
            <h1 className="mt-1 text-lg font-bold text-slate-900">
              1 ステップ = A4 1 まい
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              アプリの「いま やること」画面を 紙にした カード。
              端末トラブル時の バックアップ や リハの 教材として使えます。
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
            label={`ぜんぶ(${steps.length} まい)`}
          />
          {roles.map((r) => {
            const count = steps.filter((s) => s.role === r.id).length;
            return (
              <SelectChip
                key={r.id}
                active={selected === r.id}
                onClick={() => setSelected(r.id)}
                color={r.color}
                label={`${r.name}(${count} まい)`}
              />
            );
          })}
        </div>
        <p className="mx-auto mt-2 max-w-5xl text-[10px] leading-relaxed text-slate-500">
          ※ ブラウザの印刷ダイアログで「背景の色とイメージを印刷」を ON
          にすると 班カラー帯が きれいに 出ます。
          A4 縦、 余白「最小/なし」 推奨。
        </p>
      </div>

      {/* カード本体 */}
      <div className="mx-auto max-w-3xl px-4 py-6 print:max-w-none print:p-0">
        {filteredSteps.map((step, idx) => {
          const role = roleById.get(step.role);
          const phase = phaseById.get(step.phase);
          if (!role || !phase) return null;
          return (
            <MissionCard
              key={step.id}
              step={step}
              role={role}
              phase={phase}
              pageIndex={idx + 1}
              totalPages={totalCount}
            />
          );
        })}
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

// 1 ミッション = A4 1 ページ。
// 画面では カード風に shadow、 印刷では shadow を消して 紙そのもの。
function MissionCard({
  step,
  role,
  phase,
  pageIndex,
  totalPages,
}: {
  step: Step;
  role: Role;
  phase: Phase;
  pageIndex: number;
  totalPages: number;
}) {
  return (
    <article
      className="mission-card mb-8 bg-white shadow-lg ring-1 ring-slate-200 print:m-0 print:mb-0 print:shadow-none print:ring-0"
      style={{
        // A4 サイズ (210mm × 297mm) から 余白 12mm × 2 を引いた本紙領域
        width: "186mm",
        minHeight: "273mm",
        margin: "0 auto",
        padding: "0",
        boxSizing: "border-box",
      }}
      aria-label={`ミッションカード ${pageIndex} / ${totalPages}: ${step.title}`}
    >
      <div className="flex h-full flex-col">
        {/* 上部: 班カラー帯 + 番号 + 時間 */}
        <header
          className="flex items-center justify-between px-8 py-4 text-white"
          style={{ backgroundColor: role.color }}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-2xl font-bold" style={{ color: role.color }}>
              {step.order}
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest opacity-80">
                {phase.name}({phase.label})
              </p>
              <p className="text-lg font-bold">
                <RubyText text={role.name} />
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-widest opacity-80">
              めやす
            </p>
            <p className="text-2xl font-bold">
              {step.duration_minutes}<ruby className="text-base">分<rt>ふん</rt></ruby>
            </p>
          </div>
        </header>

        {/* タイトル(大きく) */}
        <section className="px-8 pt-8 pb-4">
          <p className="text-xs font-bold uppercase tracking-widest text-orange-700">
            いま やること
          </p>
          <h1 className="mt-2 text-4xl font-bold leading-tight text-slate-900">
            <RubyText text={step.title} />
          </h1>
        </section>

        {/* やること 3 つ(指で押せるサイズ感) */}
        <section className="flex-1 px-8 pb-4">
          <ol className="space-y-3">
            {step.instructions.map((ins, i) => (
              <li
                key={i}
                className="flex items-start gap-4 rounded-xl border-2 border-slate-200 bg-slate-50 p-4"
              >
                <span
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
                  style={{ backgroundColor: role.color }}
                >
                  {i + 1}
                </span>
                <p className="pt-1.5 text-xl font-semibold leading-relaxed text-slate-900">
                  <RubyText text={ins} />
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* できたサイン */}
        <section className="mx-8 mb-3 rounded-xl border-2 border-orange-300 bg-orange-50 p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-orange-700">
            ✓ できたサイン
          </p>
          <p className="mt-1 text-base font-semibold leading-relaxed text-orange-900">
            <RubyText text={step.completion_condition} />
          </p>
        </section>

        {/* こまったら */}
        {step.troubles.length > 0 && (
          <section className="mx-8 mb-3 rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-700">
              ⚠ こまったら
            </p>
            <ul className="mt-1 space-y-1">
              {step.troubles.map((t, i) => (
                <li key={i} className="text-sm leading-snug text-amber-900">
                  <span className="font-bold">
                    <RubyText text={t.label} />
                  </span>
                  {" → "}
                  <RubyText text={t.action} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ポイント(絵本トーン) */}
        {step.point && (
          <section className="mx-8 mb-4 rounded-xl border-2 border-sky-300 bg-sky-50 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-sky-700">
              💡 だいじなこと
            </p>
            <p className="mt-1 text-sm leading-relaxed text-sky-900">
              <RubyText text={step.point} />
            </p>
          </section>
        )}

        {/* フッター */}
        <footer className="border-t border-slate-200 px-8 py-2 text-[10px] text-slate-500">
          <div className="flex items-center justify-between">
            <span>
              ステップ {pageIndex} / {totalPages} ・{" "}
              ぼうさいを まなぶための たいけんです
            </span>
            <span className="font-semibold text-slate-700">
              おやこで ひなんじょ たいけん
            </span>
          </div>
        </footer>
      </div>
    </article>
  );
}
