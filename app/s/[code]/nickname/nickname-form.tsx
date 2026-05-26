"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type StoredParticipant = {
  id: string;
  nickname: string;
};

const storageKey = (code: string) => `hinanjo:participant:${code}`;

export default function NicknameForm({
  sessionId,
  sessionCode,
}: {
  sessionId: string;
  sessionCode: string;
}) {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(storageKey(sessionCode));
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as StoredParticipant;
      if (parsed.nickname) setNickname(parsed.nickname);
    } catch {
      // ignore malformed
    }
  }, [sessionCode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = nickname.trim();
    if (!trimmed) {
      setError("ニックネームを入力してください");
      return;
    }
    if (trimmed.length > 20) {
      setError("20文字以内で入力してください");
      return;
    }

    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const key = storageKey(sessionCode);
    const raw = localStorage.getItem(key);
    let existingId: string | null = null;
    if (raw) {
      try {
        existingId = (JSON.parse(raw) as StoredParticipant).id ?? null;
      } catch {
        existingId = null;
      }
    }

    let participantId: string;
    if (existingId) {
      const { error: updateError } = await supabase
        .from("participants")
        .update({ nickname: trimmed })
        .eq("id", existingId);
      if (updateError) {
        setSubmitting(false);
        setError("通信エラーが発生しました。もう一度お試しください。");
        return;
      }
      participantId = existingId;
    } else {
      const { data, error: insertError } = await supabase
        .from("participants")
        .insert({ session_id: sessionId, nickname: trimmed })
        .select("id")
        .single();
      if (insertError || !data) {
        setSubmitting(false);
        setError("通信エラーが発生しました。もう一度お試しください。");
        return;
      }
      participantId = data.id;
    }

    localStorage.setItem(
      key,
      JSON.stringify({ id: participantId, nickname: trimmed }),
    );

    // WHY: 既に役割を持つ人がなまえだけ直しに来た場合、役割選択を
    // やり直させると面倒。役割があれば mission へ直行、無ければ /role へ。
    const { data: me } = await supabase
      .from("participants")
      .select("role")
      .eq("id", participantId)
      .maybeSingle();
    router.push(
      me?.role
        ? `/s/${sessionCode}/mission`
        : `/s/${sessionCode}/role`,
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="nickname"
          className="block text-sm font-semibold text-slate-700"
        >
          ニックネーム
        </label>
        <input
          id="nickname"
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="例: たけし"
          autoFocus
          maxLength={20}
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-lg text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        />
        <p className="mt-1 text-xs text-slate-500">
          他の参加者に表示される名前です。本名でなくてOK。
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        style={{ minHeight: 52 }}
        className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 active:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {submitting ? "登録中…" : "次へ進む"}
      </button>
    </form>
  );
}
