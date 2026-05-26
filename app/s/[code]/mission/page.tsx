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
import type { StepStatus } from "@/lib/types/database";

type Session = {
  id: string;
  name: string;
  qr_code: string;
  phase: number;
  mode: string;
};
type Participant = {
  id: string;
  nickname: string;
  role: string;
};
type Role = {
  id: string;
  name: string;
  short_name?: string;
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
  point?: string;
  troubles: Trouble[];
  depends_on: string[];
};
type StoredParticipant = { id: string; nickname: string };

export default function MissionPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const [ctx, setCtx] = useState<{
    session: Session;
    participant: Participant;
    role: Role;
    code: string;
  } | null>(null);

  useEffect(() => {
    async function load() {
      const code = params.code.toUpperCase();
      const raw = localStorage.getItem(`hinanjo:participant:${code}`);
      if (!raw) {
        router.replace(`/s/${code}/nickname`);
        return;
      }
      let stored: StoredParticipant;
      try {
        stored = JSON.parse(raw) as StoredParticipant;
        if (!stored.id) throw new Error();
      } catch {
        router.replace(`/s/${code}/nickname`);
        return;
      }

      const supabase = createClient();
      const [sessionRes, participantRes] = await Promise.all([
        supabase
          .from("sessions")
          .select("id, name, qr_code, phase, mode")
          .eq("qr_code", code)
          .maybeSingle(),
        supabase
          .from("participants")
          .select("id, nickname, role")
          .eq("id", stored.id)
          .maybeSingle(),
      ]);

      if (!sessionRes.data) {
        router.replace("/");
        return;
      }
      const participantData = participantRes.data;
      if (!participantData) {
        router.replace(`/s/${code}/nickname`);
        return;
      }
      const roleId = participantData.role;
      if (!roleId) {
        router.replace(`/s/${code}/role`);
        return;
      }

      const roles = stepsData.roles as Role[];
      const foundRole = roles.find((r) => r.id === roleId);
      if (!foundRole) {
        router.replace(`/s/${code}/role`);
        return;
      }

      setCtx({
        session: sessionRes.data as Session,
        participant: { ...participantData, role: roleId } as Participant,
        role: foundRole,
        code,
      });
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

  return <MissionView {...ctx} />;
}

function MissionView({
  session,
  participant,
  role,
  code,
}: {
  session: Session;
  participant: Participant;
  role: Role;
  code: string;
}) {
  const [actionError, setActionError] = useState<string | null>(null);
  const [showTrouble, setShowTrouble] = useState(false);
  const [acting, setActing] = useState(false);

  const { byStepId } = useStepProgress(session.id);
  const { participants } = useParticipants(session.id);

  const myRoleSteps = useMemo(() => {
    const all = stepsData.steps as Step[];
    return all.filter((s) => s.role === role.id && s.phase <= session.phase);
  }, [role.id, session.phase]);

  const queue = useMemo(() => {
    return myRoleSteps
      .map((s) => ({ step: s, progress: byStepId.get(s.id) }))
      .filter(({ progress }) => {
        if (!progress) return true;
        return progress.status === "stuck";
      })
      .sort((a, b) => {
        const aStuck = a.progress?.status === "stuck";
        const bStuck = b.progress?.status === "stuck";
        if (aStuck && !bStuck) return 1;
        if (!aStuck && bStuck) return -1;
        return a.step.order - b.step.order;
      });
  }, [myRoleSteps, byStepId]);

  const current = queue[0] ?? null;
  const totalForRole = myRoleSteps.length;
  const completedCount = useMemo(
    () =>
      myRoleSteps.filter((s) => {
        const p = byStepId.get(s.id);
        return p && (p.status === "done" || p.status === "skipped");
      }).length,
    [myRoleSteps, byStepId],
  );

  const sameRoleCount = useMemo(
    () => participants.filter((p) => p.role === role.id).length,
    [participants, role.id],
  );

  // 並行で動いている他の app-managed 班(自分以外)の合計人数と参加中の班数。
  // 7班分を1行で並べると 360px 幅で3行に折返るため、合計だけを短く出し
  // 「全班の中での自分の位置」を1行で伝える。詳細はボードに譲る。
  const otherSummary = useMemo(() => {
    const roles = stepsData.roles as Role[];
    const others = roles.filter((r) => r.id !== role.id);
    let people = 0;
    let activeBands = 0;
    others.forEach((r) => {
      const c = participants.filter((p) => p.role === r.id).length;
      people += c;
      if (c > 0) activeBands += 1;
    });
    return { people, activeBands, totalOthers: others.length };
  }, [participants, role.id]);

  // 現在ステップが「役割内で何番目か」(1始まり)。
  // 完了したものも含めた全体の中での位置を示すための数。
  const currentPosition = useMemo(() => {
    if (!current) return 0;
    const idx = myRoleSteps.findIndex((s) => s.id === current.step.id);
    return idx >= 0 ? idx + 1 : 0;
  }, [current, myRoleSteps]);

  async function persist(
    status: StepStatus,
    troubleLabel: string | null,
  ): Promise<boolean> {
    if (!current) return false;
    setActing(true);
    setActionError(null);
    const supabase = createClient();
    const base = {
      session_id: session.id,
      step_id: current.step.id,
      participant_id: participant.id,
      completed_at: new Date().toISOString(),
    };

    let error;
    if (status === "stuck") {
      // 困った: stuck_count を +1。done/skip 後でも残るので学習ループに使える。
      // WHY read-modify-write: upsert は増分できない。同一ステップで複数人が
      // 同時に困る確率は訓練規模では低く、多少の取りこぼしは許容する。
      // WHY フォールバック: migration 004 未適用の DB だと stuck_count 列が
      // 無くエラーになる。その場合は列なしの従来 upsert で劣化動作させる。
      const { data: cur, error: readErr } = await supabase
        .from("step_progress")
        .select("stuck_count")
        .eq("session_id", session.id)
        .eq("step_id", current.step.id)
        .maybeSingle();

      if (readErr) {
        ({ error } = await supabase.from("step_progress").upsert(
          { ...base, status, trouble_label: troubleLabel },
          { onConflict: "session_id,step_id" },
        ));
      } else {
        const next = ((cur?.stuck_count as number | undefined) ?? 0) + 1;
        ({ error } = await supabase.from("step_progress").upsert(
          { ...base, status, trouble_label: troubleLabel, stuck_count: next },
          { onConflict: "session_id,step_id" },
        ));
      }
    } else {
      // done / skipped: stuck_count と trouble_label を payload に含めない。
      // PostgREST の on-conflict は渡した列だけ更新するので、過去の
      // 困った回数・理由は保持される(= 学習ループのデータが消えない)。
      ({ error } = await supabase.from("step_progress").upsert(
        { ...base, status },
        { onConflict: "session_id,step_id" },
      ));
    }

    setActing(false);
    if (error) {
      setActionError("通信エラーが発生しました。もう一度お試しください。");
      return false;
    }
    return true;
  }

  async function handleDone() {
    await persist("done", null);
  }
  async function handleSkip() {
    await persist("skipped", null);
  }
  async function handleTrouble(label: string) {
    const ok = await persist("stuck", label);
    if (ok) setShowTrouble(false);
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-52">
      <TrainingBanner mode={session.mode} />
      <div className="mx-auto max-w-md">
        <header className="border-b border-slate-200 bg-white px-5 py-3">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: role.color }}
            />
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-900">
                {participant.nickname} さん / {role.name}
              </p>
              <p className="text-sm text-slate-500">
                仲間 {sameRoleCount}人 / {session.name} ({code})
              </p>
              <p className="mt-0.5 text-xs leading-snug text-slate-400">
                他班 {otherSummary.activeBands}/{otherSummary.totalOthers}班{" "}
                計{otherSummary.people}人(詳細はボード)
              </p>
            </div>
            <div className="flex flex-shrink-0 flex-col gap-1">
              <InviteButton code={code} />
              <Link
                href={`/s/${code}/nickname`}
                style={{ minHeight: 40 }}
                className="flex items-center justify-center rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                なまえ
              </Link>
              <Link
                href={`/s/${code}/role`}
                style={{ minHeight: 40 }}
                className="flex items-center justify-center rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                役割
              </Link>
            </div>
          </div>
        </header>

        <div className="bg-white px-5 py-3">
          <div className="flex items-baseline justify-between text-xs text-slate-600">
            <span>フェーズ {session.phase}</span>
            <span>
              {completedCount} / {totalForRole} 完了
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{
                width: totalForRole
                  ? `${(completedCount / totalForRole) * 100}%`
                  : "0%",
              }}
            />
          </div>
        </div>

        {role.id === "leader" && (
          <section className="border-y border-slate-700 bg-slate-800 px-5 py-3 text-white">
            <div className="flex items-center gap-3">
              <span aria-hidden className="text-lg">
                🛡
              </span>
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-300">
                  あなたは本部役です
                </p>
                <p className="mt-0.5 text-sm font-bold leading-snug">
                  フェーズ進行・モード変更は運営パネルから
                </p>
              </div>
              <Link
                href={`/s/${code}/manage`}
                style={{ minHeight: 44 }}
                className="flex flex-shrink-0 items-center rounded-md bg-emerald-500 px-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-400 active:bg-emerald-600"
              >
                運営パネル →
              </Link>
            </div>
          </section>
        )}

        {totalForRole === 0 ? (
          <section className="px-5 py-16 text-center">
            <h1 className="text-xl font-bold text-slate-900">
              ステップ準備中
            </h1>
            <p className="mt-3 text-sm text-slate-600">
              「{role.name}」のステップは現在準備中です。
              <br />
              データは <code className="text-xs">data/steps.json</code> から読まれます。
            </p>
          </section>
        ) : !current ? (
          <section className="px-5 py-16 text-center">
            <p className="text-4xl">🎉</p>
            <h1 className="mt-4 text-xl font-bold text-slate-900">
              いまのフェーズはおしまい!
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              次のフェーズが始まるまでお待ちください。
            </p>
            <Link
              href={`/s/${code}/finish`}
              className="mt-6 inline-block rounded-lg border border-emerald-300 bg-emerald-50 px-5 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
            >
              振り返りを見る →
            </Link>
          </section>
        ) : (
          <section className="px-5 py-6">
            <div className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
              {current.progress?.status === "stuck"
                ? "再チャレンジ"
                : "いまやること"}
            </div>
            <h1 className="mt-3 text-2xl font-bold leading-snug text-slate-900">
              {current.step.title}
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              ステップ {currentPosition} / 全 {totalForRole} ・ 目安{" "}
              {current.step.duration_minutes} 分
            </p>

            <ol className="mt-6 space-y-3">
              {current.step.instructions.map((instr, i) => (
                <li
                  key={i}
                  className="flex gap-3 rounded-lg border border-slate-200 bg-white p-3"
                >
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                    {i + 1}
                  </span>
                  <p className="text-sm leading-relaxed text-slate-800">
                    {instr}
                  </p>
                </li>
              ))}
            </ol>

            <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs font-semibold text-emerald-700">完了条件</p>
              <p className="mt-1 text-sm text-emerald-900">
                {current.step.completion_condition}
              </p>
            </div>

            {current.step.point && (
              <div className="mt-3 flex gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3">
                <span aria-hidden className="text-base leading-none">
                  💡
                </span>
                <div>
                  <p className="text-xs font-semibold text-sky-700">ポイント</p>
                  <p className="mt-1 text-sm text-sky-900">
                    {current.step.point}
                  </p>
                </div>
              </div>
            )}

            <p className="mt-4 text-[10px] leading-relaxed text-slate-400">
              ※ 本アプリは内閣府ガイドライン等を参考にした行動指針で、
              医療判断・法的判断を行うものではありません。
              現場の専門家(医療従事者・行政等)の指示を優先してください。
            </p>

            {actionError && (
              <p
                role="alert"
                className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
              >
                {actionError}
              </p>
            )}
          </section>
        )}
      </div>

      {current && (
        <div className="fixed inset-x-0 bottom-14 z-10 border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-md p-4">
            <button
              type="button"
              onClick={handleDone}
              disabled={acting}
              aria-label={`「${current.step.title}」を完了として記録する`}
              style={{ minHeight: 52 }}
              className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-base font-bold text-white shadow-sm transition-colors hover:bg-emerald-700 active:bg-emerald-800 focus-visible:ring-4 focus-visible:ring-emerald-300 disabled:opacity-50"
            >
              {acting ? "保存中…" : "✓ できた"}
            </button>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setShowTrouble(true)}
                disabled={acting}
                aria-label="困ったを報告する(理由を選んで送信)"
                style={{ minHeight: 48 }}
                className="flex-1 rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-amber-500 hover:bg-amber-50 focus-visible:ring-4 focus-visible:ring-amber-200 disabled:opacity-50"
              >
                困った
              </button>
              <button
                type="button"
                onClick={handleSkip}
                disabled={acting}
                aria-label={`「${current.step.title}」をスキップして次のステップへ進む`}
                style={{ minHeight: 48 }}
                className="flex-1 rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500 focus-visible:ring-4 focus-visible:ring-slate-200 disabled:opacity-50"
              >
                スキップ
              </button>
            </div>
          </div>
        </div>
      )}

      {showTrouble && current && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-slate-900/50 sm:items-center">
          <div className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-lg sm:rounded-2xl">
            <h2 className="text-lg font-bold text-slate-900">
              何が困っていますか?
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              1つえらんで報告すると、ヘルプを呼べます。
            </p>

            <ul className="mt-4 space-y-2">
              {current.step.troubles.map((t, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => handleTrouble(t.label)}
                    disabled={acting}
                    style={{ minHeight: 56 }}
                    className="w-full rounded-lg border-2 border-slate-200 bg-white p-3 text-left transition-colors hover:border-amber-500 hover:bg-amber-50 disabled:opacity-50"
                  >
                    <p className="text-sm font-bold text-slate-900">{t.label}</p>
                    <p className="mt-1 text-xs text-slate-500">→ {t.action}</p>
                  </button>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => setShowTrouble(false)}
              disabled={acting}
              className="mt-4 w-full rounded-lg bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      <BottomNav code={code} sessionId={session.id} />
    </main>
  );
}
