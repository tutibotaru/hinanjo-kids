"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSharedPosts } from "@/lib/hooks/useSharedPosts";
import { useParticipants } from "@/lib/hooks/useParticipants";
import BottomNav from "@/components/bottom-nav";
import TrainingBanner from "@/components/training-banner";
import InviteButton from "@/components/invite-button";
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
  if (d < 60_000) return "今";
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}分前`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}時間前`;
  return `${Math.floor(d / 86_400_000)}日前`;
}

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
        <p className="mx-auto max-w-md text-sm text-slate-500">読み込み中…</p>
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
              <p className="text-xs font-semibold tracking-widest text-emerald-700">
                共有タイムライン
              </p>
              <h1 className="mt-1 text-lg font-bold text-slate-900">
                {session.name}
              </h1>
              <p className="mt-0.5 text-xs text-slate-500">
                コード {code} / フェーズ {session.phase}
              </p>
            </div>
            <div className="flex-shrink-0">
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) {
      setError("本文を入力してください");
      return;
    }

    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { error: insertError } = await supabase.from("shared_posts").insert({
      session_id: sessionId,
      participant_id: participantId,
      content: trimmed,
      photo_url: null,
      type,
    });

    setSubmitting(false);
    if (insertError) {
      setError("投稿に失敗しました。もう一度お試しください。");
      return;
    }

    setContent("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-slate-200 bg-white p-4"
    >
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setType("trouble")}
          className={`flex-1 rounded-md border-2 px-3 py-2 text-sm font-semibold transition-colors ${
            type === "trouble"
              ? "border-amber-500 bg-amber-50 text-amber-800"
              : "border-slate-200 bg-white text-slate-500"
          }`}
        >
          ⚠ 困った
        </button>
        <button
          type="button"
          onClick={() => setType("finding")}
          className={`flex-1 rounded-md border-2 px-3 py-2 text-sm font-semibold transition-colors ${
            type === "finding"
              ? "border-emerald-500 bg-emerald-50 text-emerald-800"
              : "border-slate-200 bg-white text-slate-500"
          }`}
        >
          💡 発見
        </button>
      </div>

      <textarea
        id="post-content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={
          type === "trouble"
            ? "例: 受付の机が足りません"
            : "例: 体育館裏に給水所がありました"
        }
        rows={3}
        maxLength={500}
        aria-describedby="post-content-note"
        className="mt-3 w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
      />
      <p
        id="post-content-note"
        className="mt-2 text-[10px] leading-relaxed text-slate-500"
      >
        ・実名・住所・電話番号などの個人情報は書かない。
        ・人を傷つける書き込み・誹謗中傷は禁止。
        ・参加コードを知る人なら誰でも見えます。
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
        className="mt-3 w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50"
      >
        {submitting ? "投稿中…" : "投稿する"}
      </button>
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
          まだ投稿はありません。最初の一つを送ってみましょう。
        </p>
      </div>
    );
  }

  return (
    <ul
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      aria-label="共有タイムラインの投稿一覧。新着が追加されると読み上げます"
      className="space-y-3"
    >
      {posts.map((post) => {
        const author = post.participant_id
          ? (nameById.get(post.participant_id) ?? "不明")
          : "匿名";
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
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {post.type === "trouble" ? "困った" : "発見"}
              </span>
              <span className="font-semibold text-slate-900">{author}</span>
              <span className="text-slate-400">{timeAgo(post.created_at)}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">
              {post.content}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
