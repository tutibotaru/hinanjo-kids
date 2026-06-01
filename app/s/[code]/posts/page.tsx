"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSharedPosts } from "@/lib/hooks/useSharedPosts";
import { useParticipants } from "@/lib/hooks/useParticipants";
import BottomNav from "@/components/bottom-nav";
import TrainingBanner from "@/components/training-banner";
import InviteButton from "@/components/invite-button";
import FuriganaToggle from "@/components/furigana-toggle";
import PausedOverlay from "@/components/paused-overlay";
import { phaseLabel } from "@/lib/phases";
import { useSession } from "@/lib/hooks/useSession";
import type { SharedPost, PostType } from "@/lib/types/database";

type Session = {
  id: string;
  name: string;
  qr_code: string;
  phase: number;
  mode: string;
};
type StoredParticipant = { id: string; nickname: string };

function timeAgo(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  if (d < 60_000) return "いま";
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}ふんまえ`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}じかんまえ`;
  return `${Math.floor(d / 86_400_000)}にちまえ`;
}

// 子ども向けスタンプ。文字を書きづらい子でも 1タップで気持ちを共有できる。
// type は既存スキーマの "trouble" / "finding" に振り分け、追加マイグレ無しで動く。
const STAMPS: ReadonlyArray<{ emoji: string; label: string; type: PostType }> =
  [
    { emoji: "🥺", label: "こまった", type: "trouble" },
    { emoji: "🤔", label: "なやみちゅう", type: "trouble" },
    { emoji: "💪", label: "がんばる", type: "finding" },
    { emoji: "⭐", label: "できた!", type: "finding" },
    { emoji: "😊", label: "たのしい", type: "finding" },
    { emoji: "🎉", label: "やったね", type: "finding" },
  ];

export default function PostsPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const [ctx, setCtx] = useState<{
    session: Session;
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
      const { data: session } = await supabase
        .from("sessions")
        .select("id, name, qr_code, phase, mode")
        .eq("qr_code", code)
        .maybeSingle();
      if (!session) {
        router.replace("/");
        return;
      }
      setCtx({ session: session as Session, participantId: stored.id, code });
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

  return <PostsView {...ctx} />;
}

function PostsView({
  session,
  participantId,
  code,
}: {
  session: Session;
  participantId: string;
  code: string;
}) {
  const { posts } = useSharedPosts(session.id);
  const { participants } = useParticipants(session.id);
  const { session: liveSession } = useSession(session.id);
  const paused = liveSession?.mode === "paused";

  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    participants.forEach((p) => m.set(p.id, p.nickname));
    return m;
  }, [participants]);

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      <TrainingBanner mode={session.mode} />
      <div className="mx-auto max-w-md">
        <header className="border-b border-slate-200 bg-white px-5 py-3">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-widest text-orange-700">
                ひろば
              </p>
              <h1 className="mt-1 text-lg font-bold text-slate-900">
                {session.name}
              </h1>
              <p className="mt-0.5 text-xs text-slate-500">
                コード {code} / いま:{phaseLabel(session.phase)}
              </p>
            </div>
            <div className="flex flex-shrink-0 flex-col items-end gap-1">
              <FuriganaToggle />
              <InviteButton code={code} />
            </div>
          </div>
        </header>

        <div className="space-y-4 px-5 py-5">
          <ComposeForm sessionId={session.id} participantId={participantId} />
          <Timeline posts={posts} nameById={nameById} />
        </div>
      </div>

      <BottomNav code={code} sessionId={session.id} />
      <PausedOverlay visible={paused} sessionName={session.name} />
    </main>
  );
}

function ComposeForm({
  sessionId,
  participantId,
}: {
  sessionId: string;
  participantId: string;
}) {
  const [type, setType] = useState<PostType>("trouble");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // WHY useRef: setSubmitting(true) は次レンダーまで反映されないので
  // 連続タップ時に submitting=false のまま 2 件 send() が走ってしまう。
  // ref ベースの inflight フラグで同期的に重複を弾く。
  const inflightRef = useRef(false);

  async function send(payload: { content: string; type: PostType }) {
    if (inflightRef.current) return null;
    inflightRef.current = true;
    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("shared_posts").insert({
      session_id: sessionId,
      participant_id: participantId,
      content: payload.content,
      photo_url: null,
      type: payload.type,
    });
    setSubmitting(false);
    inflightRef.current = false;
    return insertError;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) {
      setError("なにか かいてね");
      return;
    }
    const err = await send({ content: trimmed, type });
    if (err) {
      setError("おくれませんでした。もういちど ためしてね");
      return;
    }
    setContent("");
  }

  async function handleStamp(emoji: string, label: string, t: PostType) {
    const err = await send({ content: `${emoji} ${label}`, type: t });
    if (err) setError("おくれませんでした。もういちど ためしてね");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-slate-200 bg-white p-4"
    >
      {/* スタンプ:文字を書きづらい子でも 1タップで気持ちを送れる */}
      <p className="text-xs font-semibold text-slate-700">
        スタンプで さくっと おくる
      </p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {STAMPS.map((s) => (
          <button
            key={s.emoji}
            type="button"
            onClick={() => handleStamp(s.emoji, s.label, s.type)}
            disabled={submitting}
            style={{ minHeight: 60 }}
            className="flex flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-slate-200 bg-white px-2 py-2 transition-colors hover:border-orange-400 hover:bg-orange-50 active:bg-orange-100 disabled:opacity-50"
            aria-label={`${s.label} を おくる`}
          >
            <span className="text-2xl leading-none" aria-hidden>
              {s.emoji}
            </span>
            <span className="text-[10px] font-semibold text-slate-700">
              {s.label}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <p className="text-xs font-semibold text-slate-700">
          じぶんで かいて おくる
        </p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => setType("trouble")}
            className={`flex-1 rounded-md border-2 px-3 py-2 text-sm font-semibold transition-colors ${
              type === "trouble"
                ? "border-amber-500 bg-amber-50 text-amber-800"
                : "border-slate-200 bg-white text-slate-500"
            }`}
          >
            ⚠ こまった
          </button>
          <button
            type="button"
            onClick={() => setType("finding")}
            className={`flex-1 rounded-md border-2 px-3 py-2 text-sm font-semibold transition-colors ${
              type === "finding"
                ? "border-orange-500 bg-orange-50 text-orange-800"
                : "border-slate-200 bg-white text-slate-500"
            }`}
          >
            💡 みつけた
          </button>
        </div>

        <textarea
          id="post-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={
            type === "trouble"
              ? "れい: うけつけの つくえが たりない"
              : "れい: たいいくかんの うしろに みずが あった"
          }
          rows={3}
          maxLength={500}
          aria-describedby="post-content-note"
          className="mt-3 w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
        />
        <p
          id="post-content-note"
          className="mt-2 text-[10px] leading-relaxed text-slate-500"
        >
          ・ほんみょう・でんわばんごう・じゅうしょは かかない。
          ・ともだちが かなしむことは かかない。
          ・コードを しっている みんなに みえるよ。
        </p>

        {error && (
          <p
            role="alert"
            className="mt-3 break-all rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{ minHeight: 48 }}
          className="mt-3 w-full rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-700 active:bg-orange-800 disabled:opacity-50"
        >
          {submitting ? "おくっているちゅう…" : "おくる"}
        </button>
      </div>
    </form>
  );
}

function Timeline({
  posts,
  nameById,
}: {
  posts: SharedPost[];
  nameById: Map<string, string>;
}) {
  if (posts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-sm text-slate-500">
          まだ なにも ないよ。 さいしょの ひとつを おくってみてね!
        </p>
      </div>
    );
  }

  return (
    <ul
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      aria-label="ひろばの とうこういちらん。あたらしい とうこうが はいると よみあげるよ"
      className="space-y-3"
    >
      {posts.map((post) => {
        const author = post.participant_id
          ? (nameById.get(post.participant_id) ?? "だれか")
          : "とくめい";
        // 絵文字スタンプかどうかで見た目を変える(スタンプは絵文字を大きく)。
        // 自由テキストで先頭に絵文字を使った投稿まで巨大化してしまわないよう、
        // 「STAMPS で定義した emoji + label 完全一致」のときだけスタンプ扱い。
        const isStamp = STAMPS.some(
          (s) => post.content === `${s.emoji} ${s.label}`,
        );
        return (
          <li
            key={post.id}
            className="rounded-lg border border-slate-200 bg-white p-3"
          >
            <div className="flex items-center gap-2 text-xs">
              <span
                className={`rounded px-1.5 py-0.5 font-bold ${
                  post.type === "trouble"
                    ? "bg-amber-100 text-amber-800"
                    : post.type === "reflection"
                      ? "bg-sky-100 text-sky-800"
                      : "bg-orange-100 text-orange-800"
                }`}
              >
                {post.type === "trouble"
                  ? "こまった"
                  : post.type === "reflection"
                    ? "ふりかえり"
                    : "みつけた"}
              </span>
              <span className="font-semibold text-slate-900">{author}</span>
              <span className="text-slate-400">{timeAgo(post.created_at)}</span>
            </div>
            <p
              className={`mt-2 whitespace-pre-wrap text-slate-800 ${
                isStamp ? "text-2xl" : "text-sm"
              }`}
            >
              {post.content}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
