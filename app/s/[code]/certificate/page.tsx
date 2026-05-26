"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useStepProgress } from "@/lib/hooks/useStepProgress";
import { useParticipants } from "@/lib/hooks/useParticipants";
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
  short_name?: string;
  color: string;
};
type StoredParticipant = { id: string; nickname: string };
type Step = { id: string; role: string; phase: number };

function todayLabel(): string {
  const d = new Date();
  return `${d.getFullYear()}ねん ${d.getMonth() + 1}がつ ${d.getDate()}にち`;
}

export default function CertificatePage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const [ctx, setCtx] = useState<{
    session: Session;
    nickname: string;
    role: Role | null;
    participantId: string;
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
          .select("nickname, role")
          .eq("id", stored.id)
          .maybeSingle(),
      ]);

      if (!sessionRes.data) {
        router.replace("/");
        return;
      }
      const roleId = participantRes.data?.role ?? null;
      const roles = stepsData.roles as Role[];
      const role = roleId ? (roles.find((r) => r.id === roleId) ?? null) : null;

      setCtx({
        session: sessionRes.data as Session,
        nickname: participantRes.data?.nickname ?? stored.nickname,
        role,
        participantId: stored.id,
        code,
      });
    }
    load();
  }, [params.code, router]);

  if (!ctx) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8">
        <p className="mx-auto max-w-md text-sm text-slate-500">
          よみこみちゅう…
        </p>
      </main>
    );
  }

  return <CertificateView {...ctx} />;
}

function CertificateView({
  session,
  nickname,
  role,
  participantId,
  code,
}: {
  session: Session;
  nickname: string;
  role: Role | null;
  participantId: string;
  code: string;
}) {
  const { progress } = useStepProgress(session.id);
  const { participants } = useParticipants(session.id);

  const allSteps = stepsData.steps as Step[];
  const stepsInPhase = allSteps.filter((s) => s.phase <= session.phase);
  const totalSteps = stepsInPhase.length;
  const stepIdsInPhase = new Set(stepsInPhase.map((s) => s.id));
  const myDoneCount = progress.filter(
    (p) =>
      p.participant_id === participantId &&
      stepIdsInPhase.has(p.step_id) &&
      (p.status === "done" || p.status === "skipped"),
  ).length;
  const totalDone = progress.filter(
    (p) =>
      stepIdsInPhase.has(p.step_id) &&
      (p.status === "done" || p.status === "skipped"),
  ).length;
  const teamMates = participants.filter((p) => role && p.role === role.id).length;

  function handlePrint() {
    window.print();
  }

  return (
    <main className="min-h-screen bg-slate-100 py-6 print:bg-white print:py-0">
      <div className="mx-auto max-w-2xl">
        {/* 画面表示用の操作バー(印刷時は消える) */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 px-4 print:hidden">
          <Link
            href={`/s/${code}/finish`}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            ← おつかれさま画面に もどる
          </Link>
          <button
            type="button"
            onClick={handlePrint}
            style={{ minHeight: 48 }}
            className="rounded-md bg-orange-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-orange-700 active:bg-orange-800"
          >
            🖨 いんさつ / PDFほぞん
          </button>
        </div>

        {/* 修了証本体 */}
        <article
          aria-label="しゅうりょうしょう"
          className="mx-auto box-border bg-white p-6 shadow-xl ring-1 ring-orange-100 print:p-10 print:shadow-none print:ring-0"
          style={{
            width: "min(100%, 768px)",
            minHeight: "min(1024px, 90vh)",
          }}
        >
          <div className="flex h-full flex-col">
            {/* リボン風タイトル */}
            <header className="text-center">
              <p className="text-xs font-semibold tracking-widest text-orange-700">
                おやこで ひなんじょ たいけん
              </p>
              <h1 className="mt-3 text-4xl font-bold tracking-wider text-orange-900 sm:text-5xl">
                しゅうりょうしょう
              </h1>
              <div className="mx-auto mt-3 h-1 w-32 rounded-full bg-orange-400" />
            </header>

            {/* メイン本文 */}
            <section className="mt-10 flex-1 px-2 text-center">
              <p className="text-base text-slate-700">この しょうじょうを</p>
              <p className="mt-6 break-words text-3xl font-bold text-slate-900 sm:text-4xl">
                {nickname}{" "}
                <span className="text-base font-semibold text-slate-500">
                  さん
                </span>
              </p>
              <p className="mt-6 text-base leading-relaxed text-slate-700">
                あなたは{" "}
                <strong className="text-orange-900">{session.name}</strong>{" "}
                で
                {role && (
                  <>
                    {" "}
                    <span
                      className="inline-block rounded-full px-3 py-0.5 text-base font-bold text-white"
                      style={{ backgroundColor: role.color }}
                    >
                      {role.name}
                    </span>
                    {" "}チームの メンバーとして
                  </>
                )}
                <br />
                ひなんじょの たちあげを たいけんし、
                <br />
                <strong className="text-orange-900">
                  {myDoneCount} / {totalSteps}
                </strong>{" "}
                ステップに チャレンジしました。
              </p>

              {/* なかま情報 */}
              <div className="mx-auto mt-8 grid max-w-md grid-cols-3 gap-3 text-xs text-slate-600">
                <Stat label="チャレンジ" value={`${myDoneCount}こ`} />
                <Stat label="なかま" value={`${teamMates}にん`} />
                <Stat label="みんなで" value={`${totalDone}こ`} />
              </div>

              {/* 4 班のロゴ */}
              <div className="mx-auto mt-10 flex max-w-md flex-wrap items-center justify-center gap-3">
                {(stepsData.roles as Role[]).map((r) => (
                  <span
                    key={r.id}
                    className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
                  >
                    <span
                      aria-hidden
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: r.color }}
                    />
                    {r.name}
                  </span>
                ))}
              </div>
            </section>

            {/* フッター */}
            <footer className="mt-10 flex flex-wrap items-end justify-between gap-4 border-t border-orange-100 pt-6 text-xs text-slate-500">
              <div>
                <p className="font-semibold text-slate-700">
                  たいけんかいじょう
                </p>
                <p className="mt-1">{session.name}</p>
                <p className="text-[10px] text-slate-400">コード {code}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-slate-700">{todayLabel()}</p>
                <p className="mt-1">おやこで ひなんじょ たいけん</p>
                <p className="text-[10px] text-slate-400">
                  hinanjo-kids.vercel.app
                </p>
              </div>
            </footer>

            {/* 印刷用のメモ(画面でも控えめに表示) */}
            <p className="mt-6 text-center text-[10px] leading-relaxed text-slate-400 print:mt-4">
              ※ これは ぼうさいを まなぶための たいけんです。
              ほんものの さいがいのときは、おとなや まちのひとの しじを
              いちばんに きいてね。
            </p>
          </div>
        </article>

        <p className="mt-4 px-4 text-center text-xs text-slate-500 print:hidden">
          スマホの ばあいは いんさつ ダイアログから「PDFにほぞん」を えらんでね。
        </p>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-orange-200 bg-orange-50 px-2 py-2">
      <p className="text-[10px] font-semibold text-orange-700">{label}</p>
      <p className="mt-0.5 text-base font-bold text-orange-900">{value}</p>
    </div>
  );
}
