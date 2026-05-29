"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { createClient } from "@/lib/supabase/client";
import { useStepProgress } from "@/lib/hooks/useStepProgress";
import { useParticipants } from "@/lib/hooks/useParticipants";
import stepsData from "@/data/steps.json";
import type { StepProgress } from "@/lib/types/database";

type DashboardRole = {
  id: string;
  name: string;
  color: string;
};
type DashboardStep = {
  id: string;
  role: string;
  phase: number;
};

type Session = {
  id: string;
  name: string;
  qr_code: string;
  phase: number;
  mode: string;
};

const PHASE_LABELS: Record<number, string> = {
  0: "はじめる(さいしょの15ふん)",
  1: "ひらく(つぎの30ぷん)",
  2: "つづける(1〜2じかん)",
  3: "おちつく(1にち〜)",
};
const PHASE_MAX = 3;

export default function ManagePage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [origin, setOrigin] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetArmed, setResetArmed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  // WHY: リーダーパネルはフェーズ変更・進捗リセット等の破壊操作を持つ。
  // 一般参加者の誤タップ防止のため、コード再入力で意思確認する
  // (RLS による本来のアクセス制御は別途サーバ側で対応する想定)。
  // ただし本部(leader)ロールを選んだ参加者は運営する立場なので、
  // 自動アンロックして mission からの導線をスムーズにする。
  const [unlocked, setUnlocked] = useState(false);
  const [autoUnlockReason, setAutoUnlockReason] = useState<string | null>(null);
  const [gateInput, setGateInput] = useState("");

  const code = params.code.toUpperCase();

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    supabase
      .from("sessions")
      .select("id, name, qr_code, phase, mode")
      .eq("qr_code", code)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (!data) {
          router.replace("/");
          return;
        }
        setSession(data as Session);
      });
    return () => {
      cancelled = true;
    };
  }, [code, router]);

  // 本部ロール参加者の自動アンロック判定。
  // localStorage に participant id があれば Supabase で role を確認。
  // leader ならゲートを開ける。それ以外は従来通り再入力ゲートに留める。
  useEffect(() => {
    if (unlocked) return;
    const raw = localStorage.getItem(`hinanjo:participant:${code}`);
    if (!raw) return;
    let parsed: { id?: string } = {};
    try {
      parsed = JSON.parse(raw) as { id?: string };
    } catch {
      return;
    }
    if (!parsed.id) return;
    const supabase = createClient();
    let cancelled = false;
    supabase
      .from("participants")
      .select("role")
      .eq("id", parsed.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (data?.role === "leader") {
          setUnlocked(true);
          setAutoUnlockReason("リーダーとして ひらいたよ");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [code, unlocked]);

  async function refresh() {
    const supabase = createClient();
    const { data } = await supabase
      .from("sessions")
      .select("id, name, qr_code, phase, mode")
      .eq("qr_code", code)
      .maybeSingle();
    if (data) setSession(data as Session);
  }

  async function changePhase(delta: number) {
    if (!session) return;
    const next = Math.max(0, Math.min(PHASE_MAX, session.phase + delta));
    if (next === session.phase) return;
    setBusy(true);
    setMsg(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("sessions")
      .update({ phase: next })
      .eq("id", session.id);
    setBusy(false);
    if (error) {
      setMsg("フェーズが かえられなかったよ。");
      return;
    }
    await refresh();
    setMsg(`フェーズを ${next} に かえたよ。`);
  }

  async function toggleMode() {
    if (!session) return;
    const next = session.mode === "training" ? "production" : "training";
    setBusy(true);
    setMsg(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("sessions")
      .update({ mode: next })
      .eq("id", session.id);
    setBusy(false);
    if (error) {
      setMsg("モードが かえられなかったよ。");
      return;
    }
    await refresh();
    setMsg(next === "training" ? "たいけんモードに したよ。" : "ほんばんモードに したよ。");
  }

  // いっせいストップ:全端末に PausedOverlay を出して操作を止める。
  // 復帰は常に training に戻す(イベント中なので production には戻さない)。
  async function togglePaused() {
    if (!session) return;
    const next = session.mode === "paused" ? "training" : "paused";
    setBusy(true);
    setMsg(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("sessions")
      .update({ mode: next })
      .eq("id", session.id);
    setBusy(false);
    if (error) {
      setMsg("ストップの きりかえに しっぱいしたよ。");
      return;
    }
    await refresh();
    setMsg(
      next === "paused"
        ? "ぜんいんの がめんを ストップしたよ。"
        : "さいかいしたよ。",
    );
  }

  async function resetProgress() {
    if (!session) return;
    if (!resetArmed) {
      setResetArmed(true);
      return;
    }
    setBusy(true);
    setMsg(null);
    const supabase = createClient();
    const r1 = await supabase
      .from("step_progress")
      .delete()
      .eq("session_id", session.id);
    const r2 = await supabase
      .from("shared_posts")
      .delete()
      .eq("session_id", session.id);
    const r3 = await supabase
      .from("sessions")
      .update({ phase: 0 })
      .eq("id", session.id);
    setBusy(false);
    setResetArmed(false);
    if (r1.error || r2.error || r3.error) {
      setMsg("もどせなかったよ。もういちど ためしてね。");
      return;
    }
    await refresh();
    setMsg("できた と ひろばを ぜんぶ もどして、フェーズを 0に したよ。");
  }

  async function copyLink() {
    const link = `${origin}/?code=${code}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setMsg("コピーできなかったよ。URL を じぶんで えらんでね。");
    }
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8">
        <p className="mx-auto max-w-md text-sm text-slate-500">よみこみちゅう…</p>
      </main>
    );
  }

  if (!unlocked) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8">
        <div className="mx-auto max-w-md">
          <h1 className="text-xl font-bold text-slate-900">リーダーパネル</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            この がめんでは{" "}
            <strong>
              フェーズの きりかえ・モードの きりかえ・ぜんぶ もとに もどす
            </strong>{" "}
            ことが できるよ。リーダーの ひとだけ ひらいてね。
            ちがうひとは、 した のボタンで ボードに もどってね。
          </p>
          <label
            htmlFor="gate"
            className="mt-6 block text-sm font-semibold text-slate-700"
          >
            さんかコードを いれて ひらく
          </label>
          <input
            id="gate"
            type="text"
            value={gateInput}
            onChange={(e) => setGateInput(e.target.value.toUpperCase())}
            placeholder={code}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-lg uppercase tracking-widest text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
          />
          <button
            type="button"
            onClick={() => {
              if (gateInput.trim().toUpperCase() === code) {
                setMsg(null);
                setUnlocked(true);
              } else {
                setMsg("コードが ちがうよ。");
              }
            }}
            style={{ minHeight: 52 }}
            className="mt-3 w-full rounded-lg bg-orange-600 px-4 py-3 text-base font-bold text-white hover:bg-orange-700"
          >
            リーダーとして ひらく
          </button>
          {msg && (
            <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {msg}
            </p>
          )}
          <Link
            href={`/s/${code}/board`}
            style={{ minHeight: 48 }}
            className="mt-6 flex items-center justify-center rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            ボードに もどる
          </Link>
        </div>
      </main>
    );
  }

  const joinUrl = origin ? `${origin}/?code=${code}` : "";

  return (
    <main className="min-h-screen bg-slate-50 pb-16">
      <div className="mx-auto max-w-md">
        <header className="border-b border-slate-200 bg-white px-5 py-3">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-widest text-orange-700">
                リーダーパネル
              </p>
              <h1 className="mt-1 text-lg font-bold text-slate-900">
                {session.name}
              </h1>
              <p className="mt-0.5 text-xs text-slate-500">
                コード {code} / フェーズ {session.phase} /{" "}
                {session.mode === "training" ? "たいけん" : "ほんばん"}
              </p>
              {autoUnlockReason && (
                <p className="mt-1 inline-block rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-800">
                  {autoUnlockReason}
                </p>
              )}
            </div>
            <div className="flex flex-shrink-0 flex-col items-end gap-1">
              <Link
                href={`/s/${code}/board`}
                className="text-xs text-orange-700 underline"
              >
                ボードへ
              </Link>
              {autoUnlockReason && (
                <Link
                  href={`/s/${code}/mission`}
                  className="text-xs text-slate-500 underline"
                >
                  じぶんへ もどる
                </Link>
              )}
            </div>
          </div>
        </header>

        <div className="space-y-5 px-5 py-5">
          {msg && (
            <p className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-800">
              {msg}
            </p>
          )}

          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-bold text-slate-900">フェーズを すすめる</h2>
            <p className="mt-1 text-xs text-slate-500">
              いま: フェーズ {session.phase} — {PHASE_LABELS[session.phase]}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => changePhase(-1)}
                disabled={busy || session.phase <= 0}
                style={{ minHeight: 48 }}
                className="flex-1 rounded-lg border-2 border-slate-300 bg-white text-sm font-semibold text-slate-700 disabled:opacity-40"
              >
                ← まえのフェーズ
              </button>
              <button
                type="button"
                onClick={() => changePhase(1)}
                disabled={busy || session.phase >= PHASE_MAX}
                style={{ minHeight: 48 }}
                className="flex-1 rounded-lg bg-orange-600 text-sm font-bold text-white disabled:opacity-40"
              >
                つぎのフェーズ →
              </button>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-bold text-slate-900">モード</h2>
            <p className="mt-1 text-xs text-slate-500">
              たいけんモードでは がめんの うえに きいろの おびが でるよ。
            </p>
            <button
              type="button"
              onClick={toggleMode}
              disabled={busy || session.mode === "paused"}
              style={{ minHeight: 48 }}
              className="mt-3 w-full rounded-lg border-2 border-slate-300 bg-white text-sm font-semibold text-slate-700 disabled:opacity-40"
            >
              {session.mode === "paused"
                ? "ストップちゅう(さきに さいかいしてね)"
                : session.mode === "training"
                  ? "ほんばんモードに きりかえる"
                  : "たいけんモードに きりかえる"}
            </button>
          </section>

          <section
            className={`rounded-lg border p-4 ${
              session.mode === "paused"
                ? "border-amber-300 bg-amber-50"
                : "border-slate-200 bg-white"
            }`}
          >
            <h2 className="text-sm font-bold text-slate-900">
              ⏸ いっせい ストップ
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              ぜんいんの がめんを いったん とめて、リーダーの ところに あつめるよ。
              さいかい するまで みんなは そうさ できない。
            </p>
            <button
              type="button"
              onClick={togglePaused}
              disabled={busy}
              style={{ minHeight: 48 }}
              className={`mt-3 w-full rounded-lg text-sm font-bold text-white disabled:opacity-40 ${
                session.mode === "paused"
                  ? "bg-orange-600 hover:bg-orange-700"
                  : "bg-amber-500 hover:bg-amber-600"
              }`}
            >
              {session.mode === "paused"
                ? "▶ さいかい する"
                : "⏸ いっせい ストップ"}
            </button>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-bold text-slate-900">
              さんかよう QR / リンク
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              いんさつしなくても、この がめんを みせるか リンクを おくれば
              さんかできるよ。
            </p>
            <div className="mt-3 flex flex-col items-center">
              {joinUrl && (
                <QRCodeSVG
                  value={joinUrl}
                  size={180}
                  level="M"
                  marginSize={2}
                  style={{ display: "block" }}
                />
              )}
              <p className="mt-3 break-all text-center text-xs text-slate-500">
                {joinUrl}
              </p>
              <button
                type="button"
                onClick={copyLink}
                className="mt-3 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {copied ? "コピーした!" : "リンクを コピー"}
              </button>
              <Link
                href={`/admin/qr?code=${code}`}
                className="mt-2 text-xs text-orange-700 underline"
              >
                いんさつようの ページを ひらく
              </Link>
            </div>
          </section>

          <TeamDashboard
            sessionId={session.id}
            phase={session.phase}
          />

          <section className="rounded-lg border border-rose-200 bg-rose-50 p-4">
            <h2 className="text-sm font-bold text-rose-900">
              ぜんぶ もとに もどす(やりなおし)
            </h2>
            <p className="mt-1 text-xs text-rose-700">
              ステップの できた・ひろばの とうこうを ぜんぶ きえして、
              フェーズを 0に もどします。 さんかしたひとと やくわりは のこるよ。
              もとには もどせないよ。
            </p>
            <button
              type="button"
              onClick={resetProgress}
              disabled={busy}
              style={{ minHeight: 48 }}
              className={`mt-3 w-full rounded-lg text-sm font-bold text-white disabled:opacity-40 ${
                resetArmed
                  ? "bg-rose-700 hover:bg-rose-800"
                  : "bg-rose-500 hover:bg-rose-600"
              }`}
            >
              {resetArmed
                ? "ほんとうに もどす(もういちど タップ)"
                : "ぜんぶ もとに もどす"}
            </button>
            {resetArmed && (
              <button
                type="button"
                onClick={() => setResetArmed(false)}
                className="mt-2 w-full text-xs text-rose-600 underline"
              >
                やめる
              </button>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

// 班別ダッシュボード:各班の 人数・できた率・困った件数を 1 行で見える化。
// リーダーがどの班に介入すべきかを 一目で判断できるよう、 困った件数が
// 多い班は赤、 進捗が遅れている班は黄色で色分けする。
function TeamDashboard({
  sessionId,
  phase,
}: {
  sessionId: string;
  phase: number;
}) {
  const { progress } = useStepProgress(sessionId);
  const { participants } = useParticipants(sessionId);
  const roles = stepsData.roles as DashboardRole[];
  const allSteps = stepsData.steps as DashboardStep[];

  const teamStats = useMemo(() => {
    return roles.map((role) => {
      const roleSteps = allSteps.filter(
        (s) => s.role === role.id && s.phase <= phase,
      );
      const stepIds = new Set(roleSteps.map((s) => s.id));
      const rolePeople = participants.filter((p) => p.role === role.id);
      const roleProgress = progress.filter(
        (p: StepProgress) => stepIds.has(p.step_id),
      );
      const done = roleProgress.filter(
        (p) => p.status === "done" || p.status === "skipped",
      ).length;
      const stuck = roleProgress.filter((p) => p.status === "stuck").length;
      const stuckHits = roleProgress.reduce(
        (a, p) => a + (p.stuck_count ?? (p.status === "stuck" ? 1 : 0)),
        0,
      );
      const total = roleSteps.length;
      const ratio = total > 0 ? done / total : 0;
      return {
        role,
        people: rolePeople.length,
        done,
        total,
        ratio,
        stuckHits,
        stuckActive: stuck,
      };
    });
  }, [roles, allSteps, participants, progress, phase]);

  const totalDone = teamStats.reduce((a, t) => a + t.done, 0);
  const totalSteps = teamStats.reduce((a, t) => a + t.total, 0);
  const totalStuckHits = teamStats.reduce((a, t) => a + t.stuckHits, 0);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-bold text-slate-900">
        班別 ダッシュボード
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        いまの 全体: {totalDone} / {totalSteps} ステップ できた・
        こまった合計 {totalStuckHits} 件。
      </p>
      <ul className="mt-3 divide-y divide-slate-100">
        {teamStats.map((t) => {
          const isSlow = t.ratio < 0.5 && t.total > 0;
          const isInTrouble = t.stuckHits >= 3 || t.stuckActive > 0;
          return (
            <li key={t.role.id} className="flex items-center gap-3 py-2">
              <span
                aria-hidden
                className="inline-block h-3 w-3 flex-shrink-0 rounded-full"
                style={{ backgroundColor: t.role.color }}
              />
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-900">{t.role.name}</p>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full transition-all ${
                      isInTrouble
                        ? "bg-rose-500"
                        : isSlow
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.round(t.ratio * 100)}%` }}
                  />
                </div>
              </div>
              <div className="flex flex-shrink-0 flex-col items-end text-xs">
                <span className="font-semibold text-slate-700">
                  {t.done}/{t.total}
                </span>
                <span className="text-[10px] text-slate-500">
                  なかま {t.people}人
                </span>
                {(t.stuckActive > 0 || t.stuckHits >= 3) && (
                  <span className="mt-0.5 rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                    ⚠ こまった {t.stuckHits}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[10px] leading-relaxed text-slate-400">
        🟢 順調 / 🟡 半分以下 / 🔴 こまった発生 or 連続3件以上。
        遅れている班に リーダーが 声かけに 行こう。
      </p>
    </section>
  );
}
