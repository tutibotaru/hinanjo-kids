"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { StepProgress } from "@/lib/types/database";

// 全ステップの進捗を購読する。マイミッション画面と全体ボードの両方で使う。
// byStepId はステップIDから現在のステータスを引くための Map。
export function useStepProgress(sessionId: string | null) {
  const [progress, setProgress] = useState<StepProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setProgress([]);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    let cancelled = false;

    setLoading(true);
    setError(null);

    supabase
      .from("step_progress")
      .select("*")
      .eq("session_id", sessionId)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setError(error.message);
        else setProgress((data ?? []) as StepProgress[]);
        setLoading(false);
      });

    // WHY サーバ側 filter を使わない: postgres_changes に
    // filter:`session_id=eq.X` を付けると、DELETE の old は
    // (デフォルトの replica identity では)主キーしか持たないため
    // session_id フィルタで弾かれ、DELETE イベントが届かない
    // (= 取消・リセットが他者画面に反映されない)。
    // フィルタを外し、INSERT/UPDATE は session_id で、DELETE は
    // id でクライアント側に振り分ける(id は全体で一意なので安全)。
    const channel = supabase
      .channel(`step-progress-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "step_progress" },
        (payload) => {
          if (cancelled) return;
          setProgress((current) => {
            if (payload.eventType === "DELETE") {
              const removedId = (payload.old as { id?: string }).id;
              if (!removedId) return current;
              return current.filter((p) => p.id !== removedId);
            }
            const row = payload.new as StepProgress;
            if (row.session_id !== sessionId) return current;
            if (payload.eventType === "INSERT") {
              if (current.some((p) => p.id === row.id)) return current;
              return [...current, row];
            }
            if (payload.eventType === "UPDATE") {
              return current.some((p) => p.id === row.id)
                ? current.map((p) => (p.id === row.id ? row : p))
                : [...current, row];
            }
            return current;
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const byStepId = useMemo(() => {
    const map = new Map<string, StepProgress>();
    progress.forEach((p) => map.set(p.step_id, p));
    return map;
  }, [progress]);

  return { progress, byStepId, loading, error };
}
