"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useStepProgress } from "@/lib/hooks/useStepProgress";
import { useParticipants } from "@/lib/hooks/useParticipants";
import BottomNav from "@/components/bottom-nav";
import TrainingBanner from "@/components/training-banner";
import InviteButton from "@/components/invite-button";
import RubyText from "@/components/ruby-text";
import FuriganaToggle from "@/components/furigana-toggle";
import PausedOverlay from "@/components/paused-overlay";
import NewPhaseOverlay from "@/components/new-phase-overlay";
import { useSession } from "@/lib/hooks/useSession";
import { stripRuby } from "@/lib/ruby";
import { phaseLabel } from "@/lib/phases";
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
        <p className="mx-auto max-w-md text-sm text-slate-500">よみこみちゅう…</p>
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
  const [menuOpen, setMenuOpen] = useState(false);

  const { byStepId } = useStepProgress(session.id);
  const { participants } = useParticipants(session.id);
  const { session: liveSession } = useSession(session.id);
  const paused = liveSession?.mode === "paused";
  // WHY: リーダーが manage でフェーズを進めた瞬間に、全端末で新しいぶんのタスクが
  // 開くように、静的な prop(初回ロード時の値)ではなく Realtime の
  // liveSession.phase を使う。これが無いと、フェーズを進めても各自がページを
  // リロードするまで新しいタスクが出てこない(中央統制が効かない)。
  // liveSession 取得前の一瞬だけ prop の session.phase でフォールバックする。
  const currentPhase = liveSession?.phase ?? session.phase;

  // フェーズが進んだら「あたらしい やること」を全画面で知らせる。
  // WHY: リーダーが進めると画面は Realtime で更新されるが、一度見て下を向いた人は
  // 更新に気づけなかった(本番のふりかえり)。マウント時の値を基準に、フェーズが
  // 上がったら一度だけ合図を出し、タップで新しいやることへ。
  const [newPhaseAnnounce, setNewPhaseAnnounce] = useState<number | null>(null);
  const seenPhaseRef = useRef<number | null>(null);
  useEffect(() => {
    if (seenPhaseRef.current === null) {
      seenPhaseRef.current = currentPhase;
      return;
    }
    if (currentPhase > seenPhaseRef.current) {
      setNewPhaseAnnounce(currentPhase);
    }
    seenPhaseRef.current = currentPhase;
  }, [currentPhase]);

  const myRoleSteps = useMemo(() => {
    const all = stepsData.steps as Step[];
    return all.filter((s) => s.role === role.id && s.phase <= currentPhase);
  }, [role.id, currentPhase]);

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
  // WHY: 最終フェーズまで開いていれば「ぜんぶ おしまい」、まだ先がある(リーダーが
  // 次を開く)なら「いまの ぶんは おしまい・まってね」を出すための判定。
  const isLastPhase =
    currentPhase >= Math.max(...(stepsData.steps as Step[]).map((s) => s.phase));
  // 進捗は「いまいるブロック(フェーズ)」単位で出す。全体の◯より「このブロック◯/N」で達成感を。
  const currentBlock = current ? current.step.phase : currentPhase;
  const blockSteps = useMemo(
    () => myRoleSteps.filter((s) => s.phase === currentBlock),
    [myRoleSteps, currentBlock],
  );
  const blockTotal = blockSteps.length;
  const blockDone = useMemo(
    () =>
      blockSteps.filter((s) => {
        const p = byStepId.get(s.id);
        return p && (p.status === "done" || p.status === "skipped");
      }).length,
    [blockSteps, byStepId],
  );

  const sameRoleCount = useMemo(
    () => participants.filter((p) => p.role === role.id).length,
    [participants, role.id],
  );

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
      setActionError("つうしんエラー。もういちど ためしてね");
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
        <header className="border-b border-slate-200 bg-white px-5 py-2">
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
                なかま {sameRoleCount}<ruby>人<rt>にん</rt></ruby>
              </p>
            </div>
            <div className="relative flex flex-shrink-0">
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="メニュー(ふりがな・こうたい・しょうたい・なまえ・やくわり)"
                aria-expanded={menuOpen}
                style={{ minHeight: 44, minWidth: 44 }}
                className="flex items-center justify-center rounded-md border border-slate-200 bg-white text-xl font-bold text-slate-500 hover:bg-slate-50"
              >
                ⋯
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-12 z-20 flex w-52 flex-col gap-1 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                  <div className="flex items-center justify-between px-1 pb-1">
                    <span className="text-xs text-slate-500">ふりがな</span>
                    <FuriganaToggle />
                  </div>
                  <InviteButton code={code} />
                  <Link
                    href={`/s/${code}/nickname`}
                    style={{ minHeight: 40 }}
                    className="flex items-center justify-center rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    なまえをかえる
                  </Link>
                  <Link
                    href={`/s/${code}/role`}
                    style={{ minHeight: 40 }}
                    className="flex items-center justify-center rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    やくわりをかえる
                  </Link>
                  {/* 共用端末で次の子に渡す:localStorage を消して /nickname に戻すだけ。
                      participant 行は DB に残るので進捗データは保持される。 */}
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm(
                          "つぎの ひとに わたす? あなたの できた・こまったは のこるよ。",
                        )
                      ) {
                        localStorage.removeItem(`hinanjo:participant:${code}`);
                        window.location.href = `/s/${code}/nickname`;
                      }
                    }}
                    style={{ minHeight: 40 }}
                    className="flex items-center justify-center rounded-md border border-orange-300 bg-orange-50 px-3 text-xs font-semibold text-orange-700 hover:bg-orange-100 active:bg-orange-200"
                    aria-label="つぎの ひとに わたす"
                  >
                    📱 つぎの ひとに わたす
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="bg-white px-5 py-2">
          <div className="flex items-baseline justify-between text-xs text-slate-600">
            <span>いま:{phaseLabel(current ? current.step.phase : currentPhase)}</span>
            <span>
              このブロック {blockDone} / {blockTotal}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full bg-orange-500 transition-all"
              style={{
                width: blockTotal
                  ? `${(blockDone / blockTotal) * 100}%`
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
                className="flex flex-shrink-0 items-center rounded-md bg-orange-500 px-3 text-sm font-bold text-white shadow-sm hover:bg-orange-400 active:bg-orange-600"
              >
                運営パネル →
              </Link>
            </div>
          </section>
        )}

        {totalForRole === 0 ? (
          <section className="px-5 py-16 text-center">
            <h1 className="text-xl font-bold text-slate-900">
              これから はじまるよ
            </h1>
            <p className="mt-3 text-sm text-slate-600">
              「{role.name}」のステップは まだ じゅんびちゅう。
              <br />
              ちょっと まっててね。
            </p>
          </section>
        ) : !current ? (
          <section className="px-5 py-16 text-center">
            <p className="text-5xl">🎉</p>
            <h1 className="mt-4 text-xl font-bold text-slate-900">
              {isLastPhase ? "ぜんぶ おしまい!" : "いまの ぶんは おしまい!"}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {isLastPhase
                ? "よく がんばったね。おつかれさま!"
                : "つぎの ステップが はじまるまで まってね。"}
            </p>
            <Link
              href={`/s/${code}/finish`}
              className="mt-6 inline-block rounded-lg border border-orange-300 bg-orange-50 px-5 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-100"
            >
              ⭐ おつかれさま画面を みる →
            </Link>
          </section>
        ) : (
          <section className="px-5 py-4">
            <div className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
              {current.progress?.status === "stuck"
                ? "もういちど やってみる"
                : "いま やること"}
            </div>
            <h1 className="mt-3 text-2xl font-bold leading-snug text-slate-900">
              <RubyText text={current.step.title} />
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              めやす {current.step.duration_minutes} <ruby>分<rt>ふん</rt></ruby>
            </p>

            <ol className="mt-6 space-y-3">
              {current.step.instructions.map((instr, i) => (
                <li
                  key={i}
                  className="flex gap-3 rounded-lg border border-slate-200 bg-white p-3"
                >
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-700">
                    {i + 1}
                  </span>
                  <p className="text-sm leading-relaxed text-slate-800">
                    <RubyText text={instr} />
                  </p>
                </li>
              ))}
            </ol>

            <div className="mt-6 rounded-lg border border-orange-200 bg-orange-50 p-3">
              <p className="text-xs font-semibold text-orange-700">できたサイン</p>
              <p className="mt-1 text-sm text-orange-900">
                <RubyText text={current.step.completion_condition} />
              </p>
            </div>

            {current.step.point && (
              <details
                key={current.step.id}
                className="mt-3 rounded-lg border border-sky-200 bg-sky-50 p-3"
              >
                <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold text-sky-700 [&::-webkit-details-marker]:hidden">
                  <span aria-hidden className="text-base leading-none">
                    💡
                  </span>
                  だいじなこと
                  <span className="ml-auto font-normal text-sky-500">
                    くわしく ▼
                  </span>
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-sky-900">
                  <RubyText text={current.step.point} />
                </p>
              </details>
            )}

            <p className="mt-4 text-[10px] leading-relaxed text-slate-400">
              ※ これは <ruby>防災<rt>ぼうさい</rt></ruby>を まなぶための{" "}
              <ruby>体験<rt>たいけん</rt></ruby>です。ほんものの{" "}
              <ruby>災害<rt>さいがい</rt></ruby>のときは、おとなや まちの{" "}
              <ruby>人<rt>ひと</rt></ruby>の しじを いちばんに きいてね。
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
              aria-label={`「${stripRuby(current.step.title)}」が できたよ`}
              style={{ minHeight: 52 }}
              className="w-full rounded-lg bg-orange-600 px-4 py-3 text-base font-bold text-white shadow-sm transition-colors hover:bg-orange-700 active:bg-orange-800 focus-visible:ring-4 focus-visible:ring-orange-300 disabled:opacity-50"
            >
              {acting ? "ほぞんちゅう…" : "✓ できた!"}
            </button>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setShowTrouble(true)}
                disabled={acting}
                aria-label="こまったを つたえる(りゆうを えらぶ)"
                style={{ minHeight: 48 }}
                className="flex-1 rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-amber-500 hover:bg-amber-50 focus-visible:ring-4 focus-visible:ring-amber-200 disabled:opacity-50"
              >
                こまった
              </button>
              <button
                type="button"
                onClick={handleSkip}
                disabled={acting}
                aria-label={`「${stripRuby(current.step.title)}」を とばして つぎへ`}
                style={{ minHeight: 48 }}
                className="flex-1 rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500 focus-visible:ring-4 focus-visible:ring-slate-200 disabled:opacity-50"
              >
                とばす
              </button>
            </div>
          </div>
        </div>
      )}

      {showTrouble && current && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-slate-900/50 sm:items-center">
          <div className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-lg sm:rounded-2xl">
            <h2 className="text-lg font-bold text-slate-900">
              なにが こまっている?
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              1つ えらんで つたえると、ヘルプを よべるよ。
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
                    <p className="text-sm font-bold text-slate-900">
                      <RubyText text={t.label} />
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      → <RubyText text={t.action} />
                    </p>
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
      <PausedOverlay visible={paused} sessionName={session.name} />
      <NewPhaseOverlay
        visible={newPhaseAnnounce !== null}
        blockName={phaseLabel(newPhaseAnnounce ?? currentPhase)}
        onDismiss={() => setNewPhaseAnnounce(null)}
      />
    </main>
  );
}
