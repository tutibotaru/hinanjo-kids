"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
  created_at: string;
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

function formatElapsed(ms: number): string {
  if (ms <= 0) return "0分";
  const totalMin = Math.floor(ms / 60_000);
  if (totalMin < 60) return `${totalMin}分`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m === 0 ? `${h}時間` : `${h}時間${m}分`;
}

// 困った回数。migration 004 適用後は stuck_count を使う。未適用の DB
// (列が返らない)では現ステータスが stuck かで代替し旧挙動を維持する
// (移行前後どちらでも退行しない)。
function troubleHits(p: { stuck_count?: number; status: string }): number {
  return p.stuck_count ?? (p.status === "stuck" ? 1 : 0);
}

export default function FinishPage() {
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
        .select("id, name, qr_code, phase, created_at")
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
  return <FinishView session={ctx.session} code={ctx.code} />;
}

function FinishView({ session, code }: { session: Session; code: string }) {
  const { progress } = useStepProgress(session.id);
  const { participants } = useParticipants(session.id);

  const roles = stepsData.roles as Role[];
  const allSteps = stepsData.steps as Step[];
  const functions = (stepsData.functions ?? []) as RoleFunction[];

  const participantById = useMemo(() => {
    const m = new Map<string, string>();
    participants.forEach((p) => m.set(p.id, p.nickname));
    return m;
  }, [participants]);

  const stepById = useMemo(() => {
    const m = new Map<string, Step>();
    allSteps.forEach((s) => m.set(s.id, s));
    return m;
  }, [allSteps]);

  const doneCount = progress.filter((p) => p.status === "done").length;
  const skippedCount = progress.filter((p) => p.status === "skipped").length;
  // 困った: 最終ステータスではなく「一度でも困った」を数える(学習ループ)。
  const stuckCount = progress.filter((p) => troubleHits(p) > 0).length;
  const stepsInPhase = allSteps.filter((s) => s.phase <= session.phase);
  const totalSteps = stepsInPhase.length;
  const stepIdsInPhase = new Set(stepsInPhase.map((s) => s.id));
  // 着手 = 何らかの進捗行があるステップ数(done/skip/stuck の重複加算を避ける)
  const attemptedCount = progress.filter((p) =>
    stepIdsInPhase.has(p.step_id),
  ).length;

  // 経過時間: 最初の参加者の joined_at から現在まで(参加者ゼロなら 0)
  const firstJoinedAt = participants[0]?.joined_at;
  const elapsedMs = firstJoinedAt
    ? Date.now() - new Date(firstJoinedAt).getTime()
    : 0;

  const stuckItems = useMemo(
    () =>
      progress
        .filter((p) => troubleHits(p) > 0)
        .map((p) => ({
          step: stepById.get(p.step_id),
          troubleLabel: p.trouble_label,
          count: troubleHits(p),
          resolved: p.status === "done" || p.status === "skipped",
          nickname: p.participant_id
            ? (participantById.get(p.participant_id) ?? null)
            : null,
          at: p.completed_at,
        })),
    [progress, stepById, participantById],
  );

  return (
    <main className="min-h-screen bg-amber-50 pb-12">
      <div className="mx-auto max-w-md">
        <header className="border-b border-orange-200 bg-gradient-to-br from-orange-100 via-amber-50 to-yellow-50 px-5 py-8 text-center">
          {(() => {
            // 達成率で星の数を決める(50%未満で1、80%未満で2、それ以上で3)
            const rate = totalSteps > 0 ? doneCount / totalSteps : 0;
            const stars = rate >= 0.8 ? 3 : rate >= 0.5 ? 2 : 1;
            return (
              <p
                className="text-4xl"
                aria-label={`星${stars}つ獲得`}
              >
                {"⭐".repeat(stars)}
                <span aria-hidden className="opacity-25">
                  {"⭐".repeat(3 - stars)}
                </span>
              </p>
            );
          })()}
          <h1 className="mt-3 text-3xl font-bold text-orange-900">
            おつかれさま!
          </h1>
          <p className="mt-2 text-sm font-semibold text-orange-800">
            {doneCount} / {totalSteps} ステップ できたよ
          </p>
          <p className="mt-3 text-xs leading-relaxed text-slate-600">
            {session.name}({code}) / かかった じかん {formatElapsed(elapsedMs)}
          </p>
        </header>

        {functions.length > 0 && (
          <section className="border-b border-slate-200 bg-white px-5 py-4">
            <h2 className="text-sm font-bold text-slate-900">
              4つのチームのおはなし
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              ほんものの避難所は、もっとたくさんのチームでうごいているよ。
              きょうは その中の 4つのチームを 体験したよ。
            </p>
            <ul className="mt-3 grid grid-cols-1 gap-1.5">
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

        <section className="grid grid-cols-2 gap-3 px-5 py-5">
          <StatCard label="できた!" value={doneCount} unit="こ" color="emerald" />
          <StatCard label="とばした" value={skippedCount} unit="こ" color="slate" />
          <StatCard
            label="こまった"
            value={stuckCount}
            unit="こ"
            color="amber"
            hint={stuckCount > 0 ? "つぎはこうしよう" : undefined}
          />
          <StatCard
            label="なかま"
            value={participants.length}
            unit="人"
            color="blue"
          />
        </section>

        <section className="px-5">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">
            チームごとに できたこと
          </h2>
          <div className="space-y-2">
            {roles.map((role) => {
              const roleSteps = stepsInPhase.filter((s) => s.role === role.id);
              const roleDone = roleSteps.filter((s) => {
                const p = progress.find((pp) => pp.step_id === s.id);
                return p?.status === "done" || p?.status === "skipped";
              }).length;
              const roleStuck = roleSteps.filter((s) => {
                const p = progress.find((pp) => pp.step_id === s.id);
                return p ? troubleHits(p) > 0 : false;
              }).length;
              const rolePeople = participants.filter(
                (p) => p.role === role.id,
              ).length;
              return (
                <div
                  key={role.id}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2"
                >
                  <span
                    aria-hidden
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: role.color }}
                  />
                  <p className="flex-1 text-sm font-bold text-slate-900">
                    {role.name}
                  </p>
                  <p className="text-xs text-slate-600">
                    {roleSteps.length
                      ? `${roleDone}/${roleSteps.length}`
                      : "—"}
                  </p>
                  <p className="text-xs text-slate-500">{rolePeople}人</p>
                  {roleStuck > 0 && (
                    <p className="text-xs text-amber-700">⚠{roleStuck}</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {stuckItems.length > 0 && (
          <section className="mt-6 px-5">
            <h2 className="mb-2 text-sm font-semibold text-slate-700">
              こまったこと(つぎは こうしよう)
            </h2>
            <ul className="space-y-2">
              {stuckItems.map((item, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-amber-200 bg-amber-50 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-amber-900">
                      {item.step?.title ?? item.troubleLabel ?? "—"}
                    </p>
                    <span className="flex-shrink-0 rounded-full bg-amber-200 px-2 py-0.5 text-xs font-bold text-amber-800">
                      こまった {item.count}かい
                    </span>
                  </div>
                  {item.troubleLabel && (
                    <p className="mt-1 text-xs text-amber-700">
                      りゆう: {item.troubleLabel}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-amber-600">
                    {item.resolved
                      ? "→ さいごは できた!"
                      : "→ まだ できてない"}
                    {item.nickname ? ` / つたえた人: ${item.nickname}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-6 px-5">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">
            きょうの まとめ
          </h2>
          <p className="text-xs leading-relaxed text-slate-600">
            ぜんぶで {totalSteps} ステップのうち、{attemptedCount} ステップに
            ちょうせんしたよ(
            {totalSteps ? Math.round((attemptedCount / totalSteps) * 100) : 0}
            %)。
            できた: {doneCount} / とばした: {skippedCount}。
            {stuckCount > 0
              ? `こまったこと: ${stuckCount} こ。つぎはもっと うまくいくよ!`
              : "こまったことは ほとんどなかったよ。すごい!"}
          </p>
        </section>

        <section className="mt-8 px-5">
          <div className="rounded-lg bg-orange-100 p-4 text-center">
            <p className="text-sm font-bold text-orange-900">
              🎉 きょうの 体験は ここまで!
            </p>
            <p className="mt-2 text-xs leading-relaxed text-orange-800">
              ほんものの 災害のときは、おとなや まちの人と いっしょに
              うごこう。きょう おぼえたことを かぞくに はなしてみてね。
            </p>
          </div>
        </section>

        <div className="mt-8 flex flex-col gap-2 px-5">
          <Link
            href={`/s/${code}/board`}
            className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            ぜんたいボードを みる
          </Link>
          <Link
            href={`/s/${code}/mission`}
            className="rounded-lg border border-orange-300 bg-orange-50 px-4 py-3 text-center text-sm font-semibold text-orange-800 hover:bg-orange-100"
          >
            もういちど やってみる
          </Link>
          <Link
            href="/"
            className="rounded-lg bg-slate-100 px-4 py-3 text-center text-sm font-semibold text-slate-600 hover:bg-slate-200"
          >
            トップに もどる
          </Link>
        </div>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  unit,
  color,
  hint,
}: {
  label: string;
  value: number;
  unit: string;
  color: "emerald" | "slate" | "amber" | "blue";
  hint?: string;
}) {
  const styles: Record<typeof color, string> = {
    emerald: "border-orange-200 bg-orange-50 text-orange-900",
    slate: "border-slate-200 bg-white text-slate-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    blue: "border-sky-200 bg-sky-50 text-sky-900",
  };
  return (
    <div className={`rounded-lg border p-3 ${styles[color]}`}>
      <p className="text-xs font-semibold opacity-70">{label}</p>
      <p className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-bold">{value}</span>
        <span className="text-xs">{unit}</span>
      </p>
      {hint && <p className="mt-0.5 text-[10px] opacity-60">{hint}</p>}
    </div>
  );
}
