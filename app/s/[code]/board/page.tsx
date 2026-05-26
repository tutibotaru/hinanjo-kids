"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useStepProgress } from "@/lib/hooks/useStepProgress";
import { useParticipants } from "@/lib/hooks/useParticipants";
import BottomNav from "@/components/bottom-nav";
import TrainingBanner from "@/components/training-banner";
import InviteButton from "@/components/invite-button";
import stepsData from "@/data/steps.json";

type Session = {
  id: string;
  name: string;
  qr_code: string;
  phase: number;
  mode: string;
};
type Role = {
  id: string;
  name: string;
  short_name: string;
  description: string;
  color: string;
  mission?: string;
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
  troubles: Trouble[];
  depends_on: string[];
};
// 「全体の班構成」マップ用。in_app=false の班はアプリ管理外で
// 現場で別途運営される(救護衛生・食料物資・要配慮者支援等)。
type RoleFunction = {
  id: string;
  name: string;
  short_name: string;
  responsibility: string;
  examples: string[];
  in_app: boolean;
  color: string;
};
type StoredParticipant = { id: string; nickname: string };

export default function BoardPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const [ctx, setCtx] = useState<{ session: Session; code: string } | null>(
    null,
  );

  useEffect(() => {
    async function load() {
      const code = params.code.toUpperCase();
      const raw = localStorage.getItem(`hinanjo:participant:${code}`);
      if (!raw) {
        router.replace(`/s/${code}/nickname`);
        return;
      }
      try {
        const parsed = JSON.parse(raw) as StoredParticipant;
        if (!parsed.id) throw new Error();
      } catch {
        router.replace(`/s/${code}/nickname`);
        return;
      }

      const supabase = createClient();
      const { data: session } = await supabase
        .from("sessions")
        .select("id, name, qr_code, phase, mode")
        .eq("qr_code", code)
        .maybeSingle();

      if (!session) {
        router.replace("/");
        return;
      }

      setCtx({ session: session as Session, code });
    }
    load();
  }, [params.code, router]);

  if (!ctx) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8">
        <p className="mx-auto max-w-md text-sm text-slate-500">読み込み中…</p>
      </main>
    );
  }

  return <BoardView session={ctx.session} code={ctx.code} />;
}

function BoardView({ session, code }: { session: Session; code: string }) {
  const { byStepId } = useStepProgress(session.id);
  const { participants } = useParticipants(session.id);

  // WHY: 取消は他人の完了も消せる破壊操作。1タップ誤爆を防ぐため
  // 「1回目で対象を armed、2回目で実行」の2段階にする(リセットと同じ作法)。
  const [armedUndoId, setArmedUndoId] = useState<string | null>(null);

  const roles = stepsData.roles as Role[];
  const allSteps = stepsData.steps as Step[];
  const functions = (stepsData.functions ?? []) as RoleFunction[];

  const participantById = useMemo(() => {
    const m = new Map<string, string>();
    participants.forEach((p) => m.set(p.id, p.nickname));
    return m;
  }, [participants]);

  async function undoStep(progressId: string) {
    if (armedUndoId !== progressId) {
      setArmedUndoId(progressId);
      return;
    }
    setArmedUndoId(null);
    const supabase = createClient();
    await supabase.from("step_progress").delete().eq("id", progressId);
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      <TrainingBanner mode={session.mode} />
      <div className="mx-auto max-w-md">
        <header className="border-b border-slate-200 bg-white px-5 py-3">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-widest text-emerald-700">
                全体ボード
              </p>
              <h1 className="mt-1 text-lg font-bold text-slate-900">
                {session.name}
              </h1>
              <p className="mt-0.5 text-xs text-slate-500">
                コード {code} / フェーズ {session.phase}
              </p>
            </div>
            <div className="flex flex-shrink-0 flex-col items-end gap-1 text-xs">
              <InviteButton code={code} />
              <Link
                href={`/s/${code}/finish`}
                className="text-emerald-700 underline"
              >
                振り返り
              </Link>
              <Link
                href={`/s/${code}/manage`}
                className="text-emerald-700 underline"
              >
                運営
              </Link>
            </div>
          </div>
        </header>

        {functions.length > 0 && (
          <section className="border-b border-slate-200 bg-white px-5 py-4">
            <h2 className="text-sm font-bold text-slate-900">
              全体の班構成
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              避難所運営は本来この7班が並行して動きます。
              <span className="font-semibold text-emerald-700">●</span>{" "}
              はこのアプリで管理。
              <span className="font-semibold text-slate-500">○</span>{" "}
              は現場で別途運営してください(本アプリの管理対象外)。
            </p>
            <ul className="mt-3 space-y-1.5">
              {functions.map((fn) => {
                const inAppCount = fn.in_app
                  ? participants.filter((p) => p.role === fn.id).length
                  : null;
                return (
                  <li
                    key={fn.id}
                    className="flex items-start gap-2 rounded-md border border-slate-100 bg-slate-50 px-2 py-1.5"
                  >
                    <span
                      aria-hidden
                      className="mt-0.5 inline-block h-3 w-3 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: fn.color }}
                    />
                    <div className="flex-1 text-xs leading-snug">
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-bold text-slate-900">
                          {fn.in_app ? "●" : "○"} {fn.name}
                        </span>
                        {fn.in_app && (
                          <span className="text-slate-500">
                            ({inAppCount}人)
                          </span>
                        )}
                        {!fn.in_app && (
                          <span className="text-[10px] text-slate-400">
                            現場担当
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-slate-600">
                        {fn.responsibility}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <div className="space-y-4 px-5 py-5">
          {roles.map((role) => {
            const roleSteps = allSteps
              .filter((s) => s.role === role.id && s.phase <= session.phase)
              .sort((a, b) => a.order - b.order);
            const rolePeople = participants.filter((p) => p.role === role.id);
            const completedCount = roleSteps.filter((s) => {
              const p = byStepId.get(s.id);
              return p && (p.status === "done" || p.status === "skipped");
            }).length;
            const total = roleSteps.length;
            const stuckCount = roleSteps.filter((s) => {
              const p = byStepId.get(s.id);
              return p?.status === "stuck";
            }).length;

            return (
              <section
                key={role.id}
                className="overflow-hidden rounded-lg border border-slate-200 bg-white"
              >
                <header className="border-b border-slate-100 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: role.color }}
                    />
                    <p className="flex-1 text-base font-bold text-slate-900">
                      {role.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      仲間 {rolePeople.length}人
                    </p>
                  </div>
                  <div className="mt-2">
                    <div className="flex items-baseline justify-between text-xs text-slate-600">
                      <span>
                        {total
                          ? `${completedCount} / ${total} 完了`
                          : "ステップなし"}
                      </span>
                      {stuckCount > 0 && (
                        <span className="text-amber-700">
                          ⚠ 困った {stuckCount}件
                        </span>
                      )}
                    </div>
                    {total > 0 && (
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full bg-emerald-500 transition-all"
                          style={{
                            width: `${(completedCount / total) * 100}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                </header>

                {total === 0 ? (
                  <p className="px-4 py-3 text-xs text-slate-400">
                    ステップ準備中
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {roleSteps.map((step) => {
                      const p = byStepId.get(step.id);
                      const nickname = p?.participant_id
                        ? (participantById.get(p.participant_id) ?? null)
                        : null;
                      return (
                        <li
                          key={step.id}
                          className="flex items-start gap-3 px-4 py-3"
                        >
                          <StatusIcon status={p?.status ?? null} />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-900">
                              {step.title}
                            </p>
                            {p?.status === "done" && nickname && (
                              <p className="mt-0.5 text-xs text-slate-500">
                                {nickname} さんが完了
                              </p>
                            )}
                            {p?.status === "skipped" && nickname && (
                              <p className="mt-0.5 text-xs text-slate-500">
                                {nickname} さんがスキップ
                              </p>
                            )}
                            {p?.status === "stuck" && (
                              <p className="mt-0.5 text-xs text-amber-700">
                                ⚠ {p.trouble_label}
                                {nickname ? ` (${nickname} さん)` : ""}
                              </p>
                            )}
                          </div>
                          {p && (
                            <button
                              type="button"
                              onClick={() => undoStep(p.id)}
                              onBlur={() =>
                                setArmedUndoId((cur) =>
                                  cur === p.id ? null : cur,
                                )
                              }
                              style={{ minHeight: 44 }}
                              className={`flex-shrink-0 self-center rounded-md border px-3 text-sm font-semibold transition-colors ${
                                armedUndoId === p.id
                                  ? "border-rose-400 bg-rose-50 text-rose-700"
                                  : "border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                              }`}
                            >
                              {armedUndoId === p.id ? "本当に取消?" : "取消"}
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      </div>

      <BottomNav code={code} sessionId={session.id} />
    </main>
  );
}

function StatusIcon({ status }: { status: string | null }) {
  if (status === "done") {
    return (
      <span
        role="img"
        aria-label="完了"
        className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white"
      >
        <span aria-hidden="true">✓</span>
      </span>
    );
  }
  if (status === "skipped") {
    return (
      <span
        role="img"
        aria-label="スキップ"
        className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-slate-300 text-xs text-slate-700"
      >
        <span aria-hidden="true">⊘</span>
      </span>
    );
  }
  if (status === "stuck") {
    return (
      <span
        role="img"
        aria-label="困った"
        className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-white"
      >
        <span aria-hidden="true">!</span>
      </span>
    );
  }
  return (
    <span
      role="img"
      aria-label="未着手"
      className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 border-slate-300 text-xs"
    />
  );
}
